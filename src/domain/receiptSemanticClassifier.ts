import { isExpenseBucket } from './models'
import type { Bucket, BucketGroup } from './models'
import type { LedgerEvent } from './types'
import { suggestReceiptBuckets } from './receiptScanner'
import type { ReceiptBucketSuggestion } from './receiptScanner'

export interface SemanticModelProgress {
  progress: number | null
  file: string
}

interface Candidate {
  bucketId: string
  bucketName: string
  groupName: string | null
  description: string
  exampleCount: number
}

interface ModelSuggestion {
  bucketId: string
  bucketName: string
  groupName: string | null
  similarity: number
  exampleCount: number
}

type WorkerResponse =
  | { type: 'progress'; requestId: number; progress: number; file: string }
  | { type: 'phase'; requestId: number; file: string }
  | { type: 'result'; requestId: number; suggestions: ModelSuggestion[] }
  | { type: 'error'; requestId: number; message: string }

interface PendingRequest {
  resolve: (suggestions: ModelSuggestion[]) => void
  reject: (error: Error) => void
  onProgress?: (progress: SemanticModelProgress) => void
  cleanup?: () => void
}

let classifierWorker: Worker | null = null
let nextRequestId = 0
const pendingRequests = new Map<number, PendingRequest>()

export async function suggestReceiptBucketsWithSemanticModel(
  merchant: string | null,
  receiptText: string,
  buckets: Bucket[],
  groups: BucketGroup[],
  events: LedgerEvent[],
  onProgress?: (progress: SemanticModelProgress) => void,
  signal?: AbortSignal,
): Promise<ReceiptBucketSuggestion[]> {
  const groupNames = new Map(groups.map((group) => [group.id, group.name]))
  const eligibleBuckets = buckets.filter((bucket) => !bucket.archived && isExpenseBucket(bucket))
  if (eligibleBuckets.length === 0) return []

  const examplesByBucket = new Map<string, LedgerEvent[]>()
  for (const event of events) {
    if (event.type !== 'expense' || !event.bucketId) continue
    const examples = examplesByBucket.get(event.bucketId) ?? []
    examples.push(event)
    examplesByBucket.set(event.bucketId, examples)
  }

  const candidates: Candidate[] = eligibleBuckets.map((bucket) => {
    const groupName = bucket.groupId ? groupNames.get(bucket.groupId) ?? null : null
    const examples = (examplesByBucket.get(bucket.id) ?? [])
      .sort((left, right) => right.date.localeCompare(left.date))
      .slice(0, 6)
      .map((event) => [event.payee, event.description, event.notes].filter(Boolean).join('. '))
      .filter(Boolean)
    const exampleSummary = examples.length
      ? `Past purchases assigned here: ${examples.join('; ')}.`
      : 'No past purchase examples are available for this bucket.'
    const description = `Budget category: ${bucket.name}. ${groupName ? `Budget group: ${groupName}.` : ''} ${exampleSummary}`
    return {
      bucketId: bucket.id,
      bucketName: bucket.name,
      groupName,
      description,
      exampleCount: examples.length,
    }
  })

  const modelSuggestions = await requestSemanticSuggestions(
    `${merchant ? `Store: ${merchant}. ` : ''}Receipt text: ${receiptText}`,
    candidates,
    onProgress,
    signal,
  )
  const personalizedSuggestions = new Map(suggestReceiptBuckets(
    merchant,
    receiptText,
    buckets,
    groups,
    events,
    'personalized',
  ).map((suggestion) => [suggestion.bucketId, suggestion]))

  return modelSuggestions.map((suggestion) => {
    const personalized = personalizedSuggestions.get(suggestion.bucketId)
    const reasons = ['Matched using the on-device semantic model']
    if (suggestion.exampleCount > 0) {
      reasons.push(`Compared with ${suggestion.exampleCount} recent expense ${suggestion.exampleCount === 1 ? 'example' : 'examples'}`)
    }
    if (personalized) reasons.push(...personalized.reasons)
    return {
      bucketId: suggestion.bucketId,
      bucketName: suggestion.bucketName,
      groupName: suggestion.groupName,
      score: Math.max(suggestion.similarity, (personalized?.score ?? 0) * 0.95),
      reasons: [...new Set(reasons)],
    }
  }).sort((left, right) => right.score - left.score || left.bucketName.localeCompare(right.bucketName))
    .slice(0, 3)
}

function requestSemanticSuggestions(
  receiptText: string,
  candidates: Candidate[],
  onProgress?: (progress: SemanticModelProgress) => void,
  signal?: AbortSignal,
): Promise<ModelSuggestion[]> {
  const worker = getClassifierWorker()
  const requestId = ++nextRequestId
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Classification was canceled.', 'AbortError'))
      return
    }
    const abort = () => {
      pendingRequests.delete(requestId)
      worker.postMessage({ type: 'cancel', requestId })
      reject(new DOMException('Classification was canceled.', 'AbortError'))
    }
    signal?.addEventListener('abort', abort, { once: true })
    const cleanup = () => signal?.removeEventListener('abort', abort)
    pendingRequests.set(requestId, { resolve, reject, onProgress, cleanup })
    worker.postMessage({ type: 'classify', requestId, receiptText, candidates })
  })
}

function getClassifierWorker(): Worker {
  if (classifierWorker) return classifierWorker

  const worker = new Worker(new URL('./receiptSemantic.worker.ts', import.meta.url), { type: 'module' })
  worker.addEventListener('message', (event: MessageEvent<WorkerResponse>) => {
    const pending = pendingRequests.get(event.data.requestId)
    if (!pending) return

    if (event.data.type === 'progress') {
      pending.onProgress?.({ progress: event.data.progress, file: event.data.file })
    } else if (event.data.type === 'phase') {
      pending.onProgress?.({ progress: null, file: event.data.file })
    } else if (event.data.type === 'result') {
      pendingRequests.delete(event.data.requestId)
      pending.cleanup?.()
      pending.resolve(event.data.suggestions)
    } else {
      pendingRequests.delete(event.data.requestId)
      pending.cleanup?.()
      pending.reject(new Error(event.data.message))
    }
  })
  worker.addEventListener('error', (event) => {
    const error = new Error(event.message || 'The local receipt classifier worker stopped unexpectedly.')
    for (const pending of pendingRequests.values()) {
      pending.cleanup?.()
      pending.reject(error)
    }
    pendingRequests.clear()
    worker.terminate()
    classifierWorker = null
  })
  classifierWorker = worker
  return worker
}
