import { parseDollars } from './money'
import { isExpenseBucket } from './models'
import type { Bucket, BucketGroup } from './models'
import { isValidDate } from './validate'
import type { LedgerEvent } from './types'

export interface ParsedReceipt {
  merchant: string | null
  merchantCandidates: ReceiptMerchantCandidate[]
  date: string | null
  totalCents: number | null
  totalLabel: string | null
  totalCandidates: ReceiptTotalCandidate[]
}

export interface ReceiptMerchantCandidate {
  name: string
  reason: string
}

export interface ReceiptTotalCandidate {
  cents: number
  label: string
  reason: string
}

export interface ReceiptBucketSuggestion {
  bucketId: string
  bucketName: string
  groupName: string | null
  score: number
  reasons: string[]
}

export type ReceiptClassificationMode = 'personalized' | 'naive-bayes' | 'receipt-keywords' | 'semantic-model'

const amountPattern = /(?:\$\s*)?((?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d{2})?)/g
const labelledTotal = /\b(grand\s+total|total\s+due|amount\s+due|balance\s+due|total|amount\s+paid|paid)\b/i
const excludedTotal = /\b(subtotal|sub\s+total|tax|tip|change|cash|tendered|discount|savings)\b/i
const datePattern = /\b(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})\b/
const isoDatePattern = /\b(\d{4})-(\d{1,2})-(\d{1,2})\b/
const monthDatePattern = /\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+(\d{1,2})(?:,?\s+(\d{2,4}))?\b/i
const monthNumbers: Record<string, string> = {
  jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
  jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
}

/** Extract best-effort receipt fields; every result is meant to be reviewed by the user. */
export function parseReceiptText(text: string): ParsedReceipt {
  const lines = text.split(/\r?\n/).map((line) => line.replace(/\s+/g, ' ').trim()).filter(Boolean)
  const merchantCandidates = findMerchantCandidates(lines)
  const date = findReceiptDate(lines)
  const totalCandidates = findReceiptTotals(lines)
  return {
    merchant: merchantCandidates[0]?.name ?? null,
    merchantCandidates,
    date,
    totalCents: totalCandidates[0]?.cents ?? null,
    totalLabel: totalCandidates[0]?.label ?? null,
    totalCandidates,
  }
}

export function suggestReceiptBuckets(
  merchant: string | null,
  text: string,
  buckets: Bucket[],
  groups: BucketGroup[],
  events: LedgerEvent[],
  mode: ReceiptClassificationMode = 'personalized',
): ReceiptBucketSuggestion[] {
  const normalizedMerchant = normalize(merchant ?? '')
  const normalizedText = normalize(`${merchant ?? ''} ${text}`)
  const groupNames = new Map(groups.map((group) => [group.id, group.name]))
  const merchantHistory = new Map<string, Map<string, number>>()

  if (mode !== 'receipt-keywords' && normalizedMerchant) {
    for (const event of events) {
      if (event.type !== 'expense' || !event.bucketId || normalize(event.payee ?? '') !== normalizedMerchant) continue
      const counts = merchantHistory.get(event.bucketId) ?? new Map<string, number>()
      counts.set(normalizedMerchant, (counts.get(normalizedMerchant) ?? 0) + 1)
      merchantHistory.set(event.bucketId, counts)
    }
  }

  const learnedScores = mode === 'naive-bayes'
    ? classifyFromExpenseHistory(normalizedText, buckets, events)
    : new Map<string, number>()

  return buckets.filter((bucket) => !bucket.archived && isExpenseBucket(bucket)).map((bucket) => {
    const groupName = bucket.groupId ? groupNames.get(bucket.groupId) ?? null : null
    const searchableBucket = normalize(`${bucket.name} ${groupName ?? ''}`)
    const reasons: string[] = []
    let score = 0

    const previousCount = merchantHistory.get(bucket.id)?.get(normalizedMerchant) ?? 0
    if (previousCount > 0) {
      score = Math.min(0.96, 0.76 + Math.min(previousCount - 1, 4) * 0.04)
      reasons.push(`You previously assigned ${merchant} here ${previousCount} ${previousCount === 1 ? 'time' : 'times'}`)
    }

    const learnedScore = learnedScores.get(bucket.id)
    if (learnedScore !== undefined) {
      score = Math.max(score, Math.min(0.92, 0.54 + learnedScore * 0.38))
      reasons.push('Local Naive Bayes model matched similar past expenses')
    }

    for (const rule of merchantRules) {
      const bucketMatches = rule.bucketTerms.some((term) => searchableBucket.includes(term))
      if (!bucketMatches) continue
      const merchantMatch = rule.merchantTerms.some((term) => normalizedMerchant.includes(term))
      const matchingKeywords = rule.keywords.filter((term) => normalizedText.includes(term))
      if (merchantMatch) {
        score = Math.max(score, 0.78)
        reasons.push(`Merchant matches ${rule.label.toLowerCase()}`)
      }
      if (matchingKeywords.length > 0) {
        score = Math.max(score, Math.min(0.68, 0.36 + matchingKeywords.length * 0.08))
        reasons.push(`Receipt mentions ${matchingKeywords.slice(0, 3).join(', ')}`)
      }
    }

    const exactBucketWords = words(bucket.name).filter((word) => word.length > 3 && normalizedText.includes(word))
    if (exactBucketWords.length > 0) {
      score = Math.max(score, Math.min(0.62, 0.42 + exactBucketWords.length * 0.07))
      reasons.push(`Receipt text matches ${exactBucketWords.slice(0, 3).join(', ')}`)
    }

    return { bucketId: bucket.id, bucketName: bucket.name, groupName, score, reasons }
  }).filter((suggestion) => suggestion.score > 0)
    .sort((left, right) => right.score - left.score || left.bucketName.localeCompare(right.bucketName))
    .slice(0, 3)
}

function classifyFromExpenseHistory(text: string, buckets: Bucket[], events: LedgerEvent[]): Map<string, number> {
  const eligibleBucketIds = new Set(buckets.filter((bucket) => !bucket.archived && isExpenseBucket(bucket)).map((bucket) => bucket.id))
  const documents = events.filter((event) => event.type === 'expense' && event.bucketId && eligibleBucketIds.has(event.bucketId))
  if (documents.length < 3) return new Map()

  const tokenizedDocuments = documents.map((event) => ({
    bucketId: event.bucketId as string,
    tokens: new Set(receiptWords(`${event.payee ?? ''} ${event.description ?? ''} ${event.notes ?? ''}`)),
  }))
  const vocabulary = new Set(tokenizedDocuments.flatMap((document) => [...document.tokens]))
  const inputTokens = [...new Set(receiptWords(text))].filter((token) => vocabulary.has(token))
  if (inputTokens.length === 0) return new Map()

  const classes = new Map<string, { documents: number; tokenCounts: Map<string, number>; totalTokens: number }>()
  for (const document of tokenizedDocuments) {
    const bucketClass = classes.get(document.bucketId) ?? { documents: 0, tokenCounts: new Map<string, number>(), totalTokens: 0 }
    bucketClass.documents += 1
    for (const token of document.tokens) {
      bucketClass.tokenCounts.set(token, (bucketClass.tokenCounts.get(token) ?? 0) + 1)
      bucketClass.totalTokens += 1
    }
    classes.set(document.bucketId, bucketClass)
  }

  const logScores = new Map<string, number>()
  for (const [bucketId, bucketClass] of classes) {
    if (!inputTokens.some((token) => bucketClass.tokenCounts.has(token))) continue
    let logScore = Math.log((bucketClass.documents + 1) / (documents.length + classes.size))
    for (const token of inputTokens) {
      const tokenCount = bucketClass.tokenCounts.get(token) ?? 0
      logScore += Math.log((tokenCount + 1) / (bucketClass.totalTokens + vocabulary.size))
    }
    logScores.set(bucketId, logScore)
  }

  const maxLogScore = Math.max(...logScores.values())
  const exponentials = new Map([...logScores].map(([bucketId, score]) => [bucketId, Math.exp(score - maxLogScore)]))
  const total = [...exponentials.values()].reduce((sum, score) => sum + score, 0)
  return new Map([...exponentials].map(([bucketId, score]) => [bucketId, score / total]))
}

function receiptWords(value: string): string[] {
  return normalize(value).split(/\s+/).filter((word) => word.length >= 3 && !/^\d+$/.test(word))
}

function findMerchantCandidates(lines: string[]): ReceiptMerchantCandidate[] {
  const candidates: { candidate: ReceiptMerchantCandidate; score: number }[] = []
  const seen = new Set<string>()
  for (const [index, line] of lines.slice(0, 12).entries()) {
    const normalized = line.toLowerCase()
    if (line.length < 2 || line.length > 80) continue
    if (/^(receipt|sales receipt|tax invoice|invoice|customer copy|merchant copy|thank you|thanks for shopping|store\s*(no|number|#)|order\s*(no|number|#)?|transaction\s*(no|number|#)?|date\b|tel\b|phone\b|cashier\b|register\b|www\.|https?:\/\/)/i.test(normalized)) continue
    if (/\b\d{1,2}[./-]\d{1,2}[./-]\d{2,4}\b/.test(line)) continue
    if (/^\d+\s+.{2,35}\b(st|street|ave|avenue|rd|road|blvd|drive|dr|lane|ln|highway|hwy)\b/i.test(line)) continue
    const hasPrice = [...line.matchAll(amountPattern)].some((match) => /\$|\.\d{2}\b/.test(match[0]))
    amountPattern.lastIndex = 0
    if (hasPrice) continue
    if ((line.match(/\d/g) ?? []).length >= 6) continue
    const name = line.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}&'. -]+$/gu, '').trim()
    const normalizedName = normalize(name)
    const letterCount = (name.match(/\p{L}/gu) ?? []).length
    if (letterCount < 2 || !normalizedName || seen.has(normalizedName)) continue
    seen.add(normalizedName)
    candidates.push({
      candidate: { name, reason: index < 2 ? 'Near the top of the receipt' : 'Also found near the top' },
      score: 20 - index * 2 + Math.min(letterCount, 24) / 100,
    })
  }
  return candidates.sort((left, right) => right.score - left.score)
    .slice(0, 3)
    .map(({ candidate }) => candidate)
}

function findReceiptDate(lines: string[]): string | null {
  const labeledLine = lines.find((line) => /\b(date|purchase date|transaction date)\b/i.test(line))
  const candidates = [labeledLine, ...lines].filter((line): line is string => Boolean(line))
  for (const line of candidates) {
    const parsed = parseDate(line)
    if (parsed) return parsed
  }
  return null
}

function parseDate(line: string): string | null {
  const iso = isoDatePattern.exec(line)
  if (iso) {
    const value = `${iso[1]}-${iso[2].padStart(2, '0')}-${iso[3].padStart(2, '0')}`
    return isValidDate(value) ? value : null
  }

  const numeric = datePattern.exec(line)
  if (numeric) {
    const yearNumber = Number(numeric[3])
    const year = String(yearNumber < 100 ? (yearNumber < 50 ? 2000 + yearNumber : 1900 + yearNumber) : yearNumber).padStart(4, '0')
    const value = `${year}-${numeric[1].padStart(2, '0')}-${numeric[2].padStart(2, '0')}`
    return isValidDate(value) ? value : null
  }

  const named = monthDatePattern.exec(line)
  if (named) {
    const monthKey = named[1].slice(0, 3).toLowerCase()
    const yearNumber = named[3] ? Number(named[3]) : new Date().getFullYear()
    const year = String(yearNumber < 100 ? (yearNumber < 50 ? 2000 + yearNumber : 1900 + yearNumber) : yearNumber).padStart(4, '0')
    const value = `${year}-${monthNumbers[monthKey]}-${named[2].padStart(2, '0')}`
    return isValidDate(value) ? value : null
  }
  return null
}

function findReceiptTotals(lines: string[]): ReceiptTotalCandidate[] {
  const labeled: { candidate: ReceiptTotalCandidate; priority: number; lineIndex: number }[] = []
  const unlabeled: { candidate: ReceiptTotalCandidate; score: number }[] = []
  const labelPriority = (label: string) => {
    const normalized = label.toLowerCase()
    if (normalized.includes('grand')) return 5
    if (normalized.includes('amount due') || normalized.includes('balance due')) return 4
    if (normalized.includes('total due')) return 4
    if (normalized === 'total') return 3
    return 2
  }

  lines.forEach((line, lineIndex) => {
    const matches = [...line.matchAll(amountPattern)]
    amountPattern.lastIndex = 0
    const labelMatch = labelledTotal.exec(line)
    const dateMatches = [...line.matchAll(/\b\d{4}-\d{1,2}-\d{1,2}\b|\b\d{1,2}[./-]\d{1,2}[./-]\d{2,4}\b/g)]
    const outsideDates = matches.filter((match) => {
      const start = match.index ?? -1
      const end = start + match[0].length
      return !dateMatches.some((date) => {
        const dateStart = date.index ?? -1
        return start < dateStart + date[0].length && end > dateStart
      })
    })
    const formattedAmounts = outsideDates.filter((match) => /\$|\.\d{2}\b/.test(match[0]))
    const candidates = formattedAmounts.length ? formattedAmounts : outsideDates
    const afterLabel = labelMatch
      ? candidates.filter((match) => (match.index ?? -1) >= (labelMatch.index ?? 0) + labelMatch[0].length)
      : []
    const amounts = (afterLabel.length ? afterLabel : candidates)
      .map((match) => parseDollars(match[1] ?? ''))
      .filter((amount): amount is number => amount !== null)
    if (amounts.length === 0 || excludedTotal.test(line)) return
    if (labelMatch && !excludedTotal.test(line)) {
      const label = labelMatch[1].replace(/\s+/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
      const priority = labelPriority(labelMatch[1])
      labeled.push({
        candidate: { cents: amounts[amounts.length - 1], label, reason: `${label} label` },
        priority,
        lineIndex,
      })
    } else if (lineIndex >= Math.floor(lines.length * 0.55)) {
      for (const cents of amounts) {
        if (cents <= 0) continue
        unlabeled.push({
          candidate: { cents, label: 'Likely receipt total', reason: 'Large amount near the end of the receipt' },
          score: lineIndex / Math.max(1, lines.length) + Math.log10(cents + 1) / 100,
        })
      }
    }
  })

  labeled.sort((left, right) => right.priority - left.priority || right.lineIndex - left.lineIndex)
  unlabeled.sort((left, right) => right.score - left.score)
  const seen = new Set<number>()
  const result: ReceiptTotalCandidate[] = []
  for (const { candidate } of labeled) {
    if (seen.has(candidate.cents)) continue
    seen.add(candidate.cents)
    result.push(candidate)
  }
  const fallbackLimit = result.length === 0 ? 4 : result.length === 1 ? 1 : 0
  for (const { candidate } of unlabeled.slice(0, fallbackLimit)) {
    if (seen.has(candidate.cents)) continue
    seen.add(candidate.cents)
    result.push(candidate)
  }
  return result.slice(0, 4)
}

function normalize(value: string): string {
  return value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

function words(value: string): string[] {
  return normalize(value).split(/\s+/).filter(Boolean)
}

const merchantRules = [
  { label: 'groceries', bucketTerms: ['grocer', 'food', 'market'], keywords: ['produce', 'milk', 'bread', 'grocery', 'groceries', 'dairy'], merchantTerms: ['whole foods', 'kroger', 'safeway', 'trader joes', 'aldi', 'publix'] },
  { label: 'dining', bucketTerms: ['dining', 'restaurant', 'coffee', 'eating', 'food'], keywords: ['restaurant', 'cafe', 'coffee', 'diner', 'pizza', 'gratuity'], merchantTerms: ['starbucks', 'dunkin', 'mcdonald', 'chipotle', 'doordash', 'uber eats'] },
  { label: 'transportation', bucketTerms: ['transport', 'gas', 'fuel', 'auto', 'car', 'travel'], keywords: ['gasoline', 'fuel', 'parking', 'toll', 'car wash'], merchantTerms: ['shell', 'exxon', 'chevron', 'mobil', 'bp', 'speedway'] },
  { label: 'healthcare', bucketTerms: ['health', 'medical', 'pharmacy', 'care'], keywords: ['pharmacy', 'prescription', 'copay', 'medical'], merchantTerms: ['cvs', 'walgreens', 'rite aid'] },
  { label: 'subscriptions', bucketTerms: ['subscription', 'streaming', 'entertainment'], keywords: ['subscription', 'membership'], merchantTerms: ['netflix', 'spotify', 'hulu', 'disney plus', 'hbo max', 'youtube premium'] },
  { label: 'home', bucketTerms: ['home', 'household', 'hardware', 'repair'], keywords: ['hardware', 'lumber', 'plumbing', 'paint', 'appliance'], merchantTerms: ['home depot', 'lowes', 'ace hardware'] },
  { label: 'utilities', bucketTerms: ['utilit', 'electric', 'water', 'internet', 'phone'], keywords: ['electricity', 'electric', 'water service', 'internet service'], merchantTerms: ['verizon', 't mobile', 'comcast', 'xfinity'] },
] as const
