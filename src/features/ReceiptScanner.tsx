import { useEffect, useMemo, useRef, useState } from 'react'
import { Camera, FileImage, ScanLine } from 'lucide-react'
import { Button, Modal, ProgressBar } from '../components'
import { formatCents } from '../domain/money'
import { parseReceiptText, suggestReceiptBuckets } from '../domain/receiptScanner'
import type { ParsedReceipt, ReceiptClassificationMode } from '../domain/receiptScanner'
import { suggestReceiptBucketsWithSemanticModel } from '../domain/receiptSemanticClassifier'
import type { Bucket, BucketGroup } from '../domain/models'
import type { LedgerEvent } from '../domain/types'

interface ScanResult extends ParsedReceipt {
  rawText: string
  ocrConfidence: number | null
  algorithm: OcrAlgorithm
  descriptionSuggestion?: string
}

type OcrAlgorithm = 'tesseract' | 'paddle-small' | 'paddle-tiny'

export default function ReceiptScanner({
  buckets,
  groups,
  events,
  onApply,
  onClose,
}: {
  buckets: Bucket[]
  groups: BucketGroup[]
  events: LedgerEvent[]
  onApply: (result: ScanResult, bucketId: string | null) => void
  onClose: () => void
}) {
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const previewUrlRef = useRef('')
  const [result, setResult] = useState<ScanResult | null>(null)
  const [selectedMerchant, setSelectedMerchant] = useState<string | null>(null)
  const [selectedTotalCents, setSelectedTotalCents] = useState<number | null>(null)
  const [selectedBucketId, setSelectedBucketId] = useState<string | null>(null)
  const [ocrAlgorithm, setOcrAlgorithm] = useState<OcrAlgorithm>(() => {
    const saved = readPreference('receipt-ocr-algorithm', ['tesseract', 'paddle', 'paddle-small', 'paddle-tiny'] as const, 'paddle-small')
    return saved === 'paddle' ? 'paddle-tiny' : saved
  })
  const [classificationMode, setClassificationMode] = useState<ReceiptClassificationMode>(() => readPreference('receipt-classification-mode', ['personalized', 'naive-bayes', 'receipt-keywords', 'semantic-model'], 'personalized'))
  const [semanticSuggestions, setSemanticSuggestions] = useState<ReturnType<typeof suggestReceiptBuckets>>([])
  const [semanticBusy, setSemanticBusy] = useState(false)
  const [semanticProgress, setSemanticProgress] = useState<number | null>(null)
  const [semanticPhase, setSemanticPhase] = useState('')
  const [semanticError, setSemanticError] = useState('')
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState(0)
  const [phase, setPhase] = useState('')
  const [error, setError] = useState('')
  const ruleSuggestions = useMemo(() => result && classificationMode !== 'semantic-model'
    ? suggestReceiptBuckets(selectedMerchant, result.rawText, buckets, groups, events, classificationMode)
    : [], [result, selectedMerchant, buckets, groups, events, classificationMode])
  const categorySuggestions = classificationMode === 'semantic-model' ? semanticSuggestions : ruleSuggestions

  useEffect(() => savePreference('receipt-ocr-algorithm', ocrAlgorithm), [ocrAlgorithm])
  useEffect(() => savePreference('receipt-classification-mode', classificationMode), [classificationMode])

  useEffect(() => {
    if (!result || classificationMode !== 'semantic-model') {
      return
    }

    const controller = new AbortController()
    void Promise.resolve().then(() => {
      if (controller.signal.aborted) return
      setSemanticSuggestions([])
      setSemanticBusy(true)
      setSemanticProgress(null)
      setSemanticPhase('Loading the local text model...')
      setSemanticError('')

      return suggestReceiptBucketsWithSemanticModel(
        selectedMerchant,
        result.rawText,
        buckets,
        groups,
        events,
        ({ progress: nextProgress, file: nextFile }) => {
          setSemanticPhase(nextFile)
          if (nextProgress !== null) setSemanticProgress(Math.round(nextProgress))
        },
        controller.signal,
      ).then((suggestions) => {
        setSemanticSuggestions(suggestions)
        setSemanticBusy(false)
        setSemanticPhase('')
      }).catch((cause: unknown) => {
        if (cause instanceof DOMException && cause.name === 'AbortError') return
        setSemanticError(cause instanceof Error ? cause.message : 'Could not load the on-device text model.')
        setSemanticBusy(false)
        setSemanticPhase('')
      })
    })

    return () => controller.abort()
  }, [classificationMode, result, selectedMerchant, buckets, groups, events])

  useEffect(() => () => {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current)
  }, [])

  function updatePreview(nextFile: File | null) {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current)
    const nextUrl = nextFile ? URL.createObjectURL(nextFile) : ''
    previewUrlRef.current = nextUrl
    setPreviewUrl(nextUrl)
  }

  function chooseFile(nextFile: File | undefined) {
    if (!nextFile) return
    setError('')
    setResult(null)
    setSelectedMerchant(null)
    setSelectedTotalCents(null)
    setSelectedBucketId(null)
    if (!nextFile.type.startsWith('image/')) {
      setFile(null)
      updatePreview(null)
      setError('Choose a photo file, such as JPG, PNG, or WebP.')
      return
    }
    if (nextFile.size > 15 * 1024 * 1024) {
      setFile(null)
      updatePreview(null)
      setError('This photo is larger than 15 MB. Choose a smaller image.')
      return
    }
    setFile(nextFile)
    updatePreview(nextFile)
  }

  async function scanReceipt() {
    if (!file || busy) return
    setBusy(true)
    setError('')
    setProgress(0)
    setPhase('Preparing receipt photo...')
    let worker: Awaited<ReturnType<typeof import('tesseract.js').createWorker>> | null = null
    try {
      const image = await prepareImage(file)
      let passes: OcrPass[]
      if (isPaddleAlgorithm(ocrAlgorithm)) {
        passes = await scanWithPaddle(image, file, ocrAlgorithm, setPhase)
      } else {
        const { createWorker, OEM } = await import('tesseract.js')
        worker = await createWorker('eng', OEM.LSTM_ONLY, {
          logger: ({ status, progress: nextProgress }) => {
            setPhase(status.toLowerCase().includes('recogniz') ? 'Reading receipt text...' : 'Preparing OCR data...')
            setProgress(Math.round(Math.max(0, Math.min(1, nextProgress)) * 100))
          },
        })
        const firstPass = await worker.recognize(image)
        passes = [{
          parsed: parseReceiptText(firstPass.data.text),
          text: firstPass.data.text,
          confidence: firstPass.data.confidence ?? 0,
          source: 'Original photo',
        }]
        const first = passes[0]
        if (first.confidence < 65 || first.parsed.totalCandidates.length === 0 || first.parsed.merchantCandidates.length === 0) {
          setPhase('Trying an enhanced grayscale image...')
          setProgress(0)
          const enhancedImage = await prepareImage(file, true)
          const retry = await worker.recognize(enhancedImage)
          passes.push({
            parsed: parseReceiptText(retry.data.text),
            text: retry.data.text,
            confidence: retry.data.confidence ?? 0,
            source: 'Enhanced grayscale photo',
          })
        }
      }
      const merged = mergeOcrPasses(passes)
      setSelectedMerchant(merged.parsed.merchant)
      setSelectedTotalCents(merged.parsed.totalCents)
      setSelectedBucketId(null)
      setResult({ ...merged.parsed, rawText: merged.rawText, ocrConfidence: merged.confidence, algorithm: ocrAlgorithm })
      setPhase('Scan complete. Review the extracted information below.')
      setProgress(100)
    } catch (cause) {
      setError(cause instanceof Error
        ? `${isPaddleAlgorithm(ocrAlgorithm) ? 'PaddleOCR could not run' : 'Could not read this receipt'}. Try again or choose the other algorithm. ${cause.message}`
        : `${isPaddleAlgorithm(ocrAlgorithm) ? 'PaddleOCR could not run' : 'Could not read this receipt'}. Try again or choose the other algorithm.`)
      setPhase('')
    } finally {
      try {
        if (worker) await worker.terminate()
      } finally {
        setBusy(false)
      }
    }
  }

  return (
    <Modal title="Scan a receipt" onClose={busy ? () => undefined : onClose}>
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">OCR runs in your browser. The photo stays on this device and is not saved; only the transaction fields you confirm will be submitted.</p>

        <div className="grid gap-3 rounded-xl border border-border/70 bg-surface p-3 sm:grid-cols-2">
          <label className="block min-w-0 space-y-1.5 text-sm">
            <span className="font-medium">Text extraction</span>
            <select className="input" value={ocrAlgorithm} disabled={busy} onChange={(event) => {
              setOcrAlgorithm(event.target.value as OcrAlgorithm)
              setResult(null)
              setError('')
            }}>
              <option value="paddle-small">PaddleOCR PP-OCRv6 Small - higher accuracy</option>
              <option value="paddle-tiny">PaddleOCR PP-OCRv6 Tiny - faster</option>
              <option value="tesseract">Tesseract - lightweight</option>
            </select>
            <span className="block text-xs text-muted-foreground">
              {ocrAlgorithm === 'paddle-small'
                ? 'Small is PaddleOCR\'s higher-accuracy model. First use loads about 31 MB of model files and a shared 37 MB OCR runtime; scanning then runs on-device.'
                : ocrAlgorithm === 'paddle-tiny'
                  ? 'Tiny uses about 6 MB of model files plus the shared 37 MB OCR runtime and runs faster on phones. Small may read difficult photos more accurately.'
                  : 'Tesseract is lightweight. It downloads its English OCR data on the first scan.'}
            </span>
          </label>
          <label className="block min-w-0 space-y-1.5 text-sm">
            <span className="font-medium">Bucket classification</span>
            <select className="input" value={classificationMode} disabled={busy} onChange={(event) => {
              setClassificationMode(event.target.value as ReceiptClassificationMode)
              setSelectedBucketId(null)
            }}>
              <option value="personalized">Personalized - merchant history + receipt text</option>
              <option value="naive-bayes">Local Naive Bayes - learns from expense history</option>
              <option value="receipt-keywords">Receipt text - bucket and merchant keywords</option>
              <option value="semantic-model">On-device semantic model - about 23 MB</option>
            </select>
            <span className="block text-xs text-muted-foreground">
              {classificationMode === 'semantic-model'
                ? 'Downloads a quantized model the first time, then compares receipt text with your bucket names and recent expenses. Receipt text stays on this device.'
                : 'Naive Bayes learns from saved expense payees and descriptions on this device. With little history it falls back to receipt keywords. Suggestions always need your confirmation.'}
            </span>
          </label>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <label className="btn min-h-11 cursor-pointer justify-center gap-2">
            <Camera className="size-4" />
            <span>Take a photo</span>
            <input className="sr-only" type="file" accept="image/*" capture="environment" aria-label="Take a receipt photo with the camera" disabled={busy} onChange={(event) => { chooseFile(event.target.files?.[0]); event.currentTarget.value = '' }} />
          </label>
          <label className="btn min-h-11 cursor-pointer justify-center gap-2">
            <FileImage className="size-4" />
            <span>Upload a photo</span>
            <input className="sr-only" type="file" accept="image/*" aria-label="Upload a receipt photo" disabled={busy} onChange={(event) => { chooseFile(event.target.files?.[0]); event.currentTarget.value = '' }} />
          </label>
        </div>

        {file && <div className="flex items-center gap-3 rounded-xl border border-border/70 bg-surface p-2.5">
          {previewUrl && <img src={previewUrl} alt="Selected receipt preview" className="size-16 shrink-0 rounded-lg object-cover" />}
          <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{file.name}</p><p className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(1)} MB · processed locally</p></div>
          <Button type="button" variant="primary" disabled={busy} onClick={scanReceipt}><ScanLine className="size-4" />{busy ? 'Scanning…' : 'Scan'}</Button>
        </div>}

        {busy && <div className="space-y-1.5" role="status" aria-live="polite">
          <div className="flex justify-between gap-3 text-xs text-muted-foreground"><span>{phase}</span>{ocrAlgorithm === 'tesseract' && <span>{progress}%</span>}</div>
          {ocrAlgorithm === 'tesseract'
            ? <ProgressBar pct={progress} />
            : <div className="h-1.5 overflow-hidden rounded-full bg-sunken" aria-hidden="true"><div className="h-full w-1/3 animate-pulse rounded-full bg-accent" /></div>}
          <p className="text-xs text-muted-foreground">{isPaddleAlgorithm(ocrAlgorithm)
            ? `First use loads the ${ocrAlgorithm === 'paddle-small' ? 'higher-accuracy, roughly 31 MB' : 'roughly 6 MB'} model files and a shared 37 MB OCR runtime. Keep the app open while they load.`
            : 'The first Tesseract scan downloads the English OCR model. This can take a little longer on a phone.'}</p>
        </div>}

        {error && <p role="alert" className="rounded-lg border border-bad/30 bg-bad/10 px-3 py-2 text-sm text-bad">{error}</p>}

        {result && <section className="space-y-3 rounded-xl border border-border/70 bg-surface p-3" aria-label="Receipt scan results">
          <div><h3 className="font-semibold">Review scan</h3><p className="text-xs text-muted-foreground">These are suggestions. You can edit each field in the transaction form.</p></div>
          <dl className="grid grid-cols-2 gap-2 text-sm">
            <ResultField label="Store" value={selectedMerchant ?? 'Not found'} />
            <ResultField label="Date" value={result.date ?? 'Not found'} />
            <ResultField label="Total expense" value={selectedTotalCents === null ? 'Not found' : formatCents(selectedTotalCents)} />
            <ResultField label="OCR algorithm" value={getOcrAlgorithmLabel(result.algorithm)} />
            <ResultField label="Bucket classifier" value={classificationMode === 'naive-bayes' ? 'Local Naive Bayes' : classificationMode === 'personalized' ? 'Personalized' : classificationMode === 'semantic-model' ? 'On-device semantic model' : 'Receipt keywords'} />
            <ResultField label="Recognition confidence" value={result.ocrConfidence === null ? 'Unavailable' : `${Math.round(result.ocrConfidence)}%`} />
          </dl>

          <ResultField label="Description suggestion" value={buildDescriptionSuggestion(selectedMerchant, selectedBucketId ?? categorySuggestions[0]?.bucketId ?? null, buckets)} />

          {result.merchantCandidates.length > 1 && <div className="space-y-2">
            <div><h4 className="text-sm font-medium">Store choices</h4><p className="text-xs text-muted-foreground">Choose the store name that matches the receipt.</p></div>
            <div className="flex flex-wrap gap-2">
              {result.merchantCandidates.map((candidate) => {
                const isSelected = selectedMerchant === candidate.name
                return <button key={candidate.name} type="button" aria-pressed={isSelected} onClick={() => { setSelectedMerchant(candidate.name); setSelectedBucketId(null) }} className={`rounded-lg border px-3 py-2 text-left text-sm transition ${isSelected ? 'border-accent bg-accent/10' : 'border-border/70 hover:bg-sunken/50'}`}>
                  <span className="block font-medium">{candidate.name}</span><span className="block text-xs text-muted-foreground">{candidate.reason}</span>
                </button>
              })}
            </div>
          </div>}

          {result.totalCandidates.length > 1 && <div className="space-y-2">
            <div><h4 className="text-sm font-medium">Total choices</h4><p className="text-xs text-muted-foreground">Choose the receipt total. Subtotals, tax, and change are excluded when detected.</p></div>
            <div className="grid gap-2 sm:grid-cols-2">
              {result.totalCandidates.map((candidate, index) => {
                const isSelected = selectedTotalCents === candidate.cents
                return <button key={`${candidate.cents}-${candidate.label}`} type="button" aria-pressed={isSelected} onClick={() => setSelectedTotalCents(candidate.cents)} className={`rounded-lg border px-3 py-2 text-left transition ${isSelected ? 'border-accent bg-accent/10' : 'border-border/70 hover:bg-sunken/50'}`}>
                  <span className="flex items-center justify-between gap-2"><strong className="tabular-nums">{formatCents(candidate.cents)}</strong><span className="text-xs text-muted-foreground">{index === 0 ? 'Top choice' : 'Alternative'}</span></span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">{candidate.reason}</span>
                </button>
              })}
            </div>
          </div>}

          <div className="space-y-2">
            <div><h4 className="text-sm font-medium">Possible categories</h4><p className="text-xs text-muted-foreground">Choose one to prefill the category. No category is applied automatically.</p></div>
            {semanticBusy ? <div className="space-y-1.5 rounded-lg bg-sunken/50 px-3 py-2" role="status" aria-live="polite">
              <div className="flex justify-between gap-2 text-xs text-muted-foreground"><span className="truncate">{semanticPhase}</span><span>{semanticProgress === null ? 'Preparing' : `${semanticProgress}%`}</span></div>
              <ProgressBar pct={semanticProgress ?? 5} />
              <p className="text-xs text-muted-foreground">First use downloads the 23 MB quantized text model. Later scans reuse the device cache.</p>
            </div> : semanticError ? <p role="alert" className="rounded-lg border border-bad/30 bg-bad/10 px-3 py-2 text-xs text-bad">Could not load the on-device model. Check your connection and try again. {semanticError}</p> : categorySuggestions.length ? <div className="space-y-1.5">
              {categorySuggestions.map((suggestion, index) => {
                const isSelected = selectedBucketId === suggestion.bucketId
                return <button key={suggestion.bucketId} type="button" aria-pressed={isSelected} onClick={() => setSelectedBucketId(isSelected ? null : suggestion.bucketId)} className={`w-full rounded-lg border px-3 py-2 text-left transition ${isSelected ? 'border-accent bg-accent/10' : 'border-border/70 hover:bg-sunken/50'}`}>
                  <span className="flex items-center justify-between gap-2 text-sm"><strong>{suggestion.groupName ? `${suggestion.groupName} / ${suggestion.bucketName}` : suggestion.bucketName}</strong><span className="shrink-0 text-xs text-muted-foreground">{index === 0 ? 'Top choice' : 'Alternative'}</span></span>
                  {suggestion.reasons.length > 0 && <span className="mt-1 block text-xs text-muted-foreground">{suggestion.reasons.join(' - ')}</span>}
                </button>
              })}
            </div> : <p className="rounded-lg bg-sunken/50 px-3 py-2 text-xs text-muted-foreground">No strong category match. Choose a category manually in the transaction form.</p>}
          </div>

          <details className="rounded-lg bg-sunken/50 px-3 py-2">
            <summary className="cursor-pointer text-xs font-medium">Show recognized text</summary>
            <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap break-words text-xs text-muted-foreground">{result.rawText || 'No text found.'}</pre>
          </details>
        </section>}

        <div className="flex flex-col-reverse justify-end gap-2 border-t border-border/70 pt-3 sm:flex-row">
          <Button type="button" disabled={busy} onClick={onClose}>Cancel</Button>
          <Button type="button" variant="primary" disabled={!result || busy} onClick={() => result && onApply({
            ...result,
            merchant: selectedMerchant,
            totalCents: selectedTotalCents,
            totalLabel: result.totalCandidates.find((candidate) => candidate.cents === selectedTotalCents)?.label ?? null,
            descriptionSuggestion: buildDescriptionSuggestion(selectedMerchant, selectedBucketId ?? categorySuggestions[0]?.bucketId ?? null, buckets),
          }, selectedBucketId)}>
            Use scan in transaction
          </Button>
        </div>
      </div>
    </Modal>
  )
}

function ResultField({ label, value }: { label: string; value: string }) {
  return <div className="min-w-0 rounded-lg bg-sunken/50 px-2.5 py-2"><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-0.5 truncate font-medium tabular-nums">{value}</dd></div>
}

async function prepareImage(file: File, enhance = false): Promise<Blob> {
  if (typeof createImageBitmap !== 'function') return file
  const bitmap = await createImageBitmap(file)
  try {
    const maxDimension = 2800
    const scale = Math.min(1.5, maxDimension / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(bitmap.width * scale))
    canvas.height = Math.max(1, Math.round(bitmap.height * scale))
    const context = canvas.getContext('2d')
    if (!context) return file
    context.filter = enhance ? 'grayscale(1) contrast(1.3)' : 'none'
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    return await new Promise((resolve) => canvas.toBlob((blob) => resolve(blob ?? file), 'image/jpeg', 0.92))
  } finally {
    bitmap.close()
  }
}

interface OcrPass {
  parsed: ParsedReceipt
  text: string
  confidence: number
  source: string
}

type PaddleAlgorithm = Extract<OcrAlgorithm, 'paddle-small' | 'paddle-tiny'>

function isPaddleAlgorithm(algorithm: OcrAlgorithm): algorithm is PaddleAlgorithm {
  return algorithm !== 'tesseract'
}

function getOcrAlgorithmLabel(algorithm: OcrAlgorithm): string {
  if (algorithm === 'paddle-small') return 'PaddleOCR PP-OCRv6 Small'
  if (algorithm === 'paddle-tiny') return 'PaddleOCR PP-OCRv6 Tiny'
  return 'Tesseract'
}

async function scanWithPaddle(image: Blob, file: File, algorithm: PaddleAlgorithm, onPhase: (phase: string) => void): Promise<OcrPass[]> {
  const { PaddleOCR } = await import('@paddleocr/paddleocr-js')
  const model = algorithm === 'paddle-small'
    ? { name: 'PP-OCRv6_small' }
    : { name: 'PP-OCRv6_tiny' }
  onPhase(`Loading ${model.name} and the on-device OCR runtime...`)
  const appAsset = (path: string) => new URL(`${import.meta.env.BASE_URL}${path}`, window.location.origin).href
  let engine: Awaited<ReturnType<typeof PaddleOCR.create>>
  try {
    engine = await PaddleOCR.create({
      textDetectionModelName: `${model.name}_det`,
      textDetectionModelAsset: { url: appAsset(`ocr-models/pp-ocrv6-${algorithm === 'paddle-small' ? 'small' : 'tiny'}-det.tar`) },
      textRecognitionModelName: `${model.name}_rec`,
      textRecognitionModelAsset: { url: appAsset(`ocr-models/pp-ocrv6-${algorithm === 'paddle-small' ? 'small' : 'tiny'}-rec.tar`) },
      worker: true,
      ortOptions: {
        backend: 'wasm',
        numThreads: 1,
        simd: true,
        // PaddleOCR's prebuilt worker bundles ONNX Runtime 1.24.3, so serve the
        // matching runtime files from the app origin rather than a CDN.
        wasmPaths: appAsset('ocr-runtime/1.24.3/'),
      },
    })
  } catch (cause) {
    const details = cause instanceof Error ? cause.message : String(cause)
    throw new Error(`Could not load the on-device OCR model or runtime. Check the app connection and confirm the /ocr-models and /ocr-runtime files are deployed. ${details}`, { cause })
  }

  try {
    onPhase(`Detecting and reading text with ${model.name}...`)
    const [firstResult] = await engine.predict(image)
    if (!firstResult) throw new Error('PaddleOCR returned no result for this photo.')
    const firstPass = makePaddlePass(firstResult, 'Original photo')
    const passes = [firstPass]
    if (firstPass.confidence < 65 || firstPass.parsed.totalCandidates.length === 0 || firstPass.parsed.merchantCandidates.length === 0) {
      onPhase('Trying an enhanced grayscale photo...')
      const enhancedImage = await prepareImage(file, true)
      const [retryResult] = await engine.predict(enhancedImage)
      if (retryResult) passes.push(makePaddlePass(retryResult, 'Enhanced grayscale photo'))
    }
    return passes
  } finally {
    await engine.dispose()
  }
}

function makePaddlePass(result: { items: { text: string; score: number }[] }, source: string): OcrPass {
  const text = result.items.map((item) => item.text.trim()).filter(Boolean).join('\n')
  const scores = result.items.map((item) => item.score).filter((score) => Number.isFinite(score))
  const confidence = scores.length ? scores.reduce((total, score) => total + score, 0) / scores.length * 100 : 0
  return { parsed: parseReceiptText(text), text, confidence, source }
}

function buildDescriptionSuggestion(merchant: string | null, bucketId: string | null, buckets: Bucket[]): string {
  const bucketName = buckets.find((bucket) => bucket.id === bucketId)?.name
  if (bucketName && merchant) return `${bucketName} at ${merchant}`
  if (bucketName) return `${bucketName} purchase`
  if (merchant) return `Purchase at ${merchant}`
  return 'Receipt purchase'
}

function readPreference<T extends string>(key: string, options: readonly T[], fallback: T): T {
  try {
    const stored = window.localStorage.getItem(key)
    return options.find((option) => option === stored) ?? fallback
  } catch {
    return fallback
  }
}

function savePreference(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value)
  } catch {
    // Scanning still works if browser storage is unavailable.
  }
}

function mergeOcrPasses(passes: OcrPass[]) {
  const ordered = [...passes].sort((left, right) => right.confidence - left.confidence)
  const merchantCandidates = uniqueBy(
    ordered.flatMap((pass) => pass.parsed.merchantCandidates),
    (candidate) => candidate.name.toLowerCase().replace(/[^a-z0-9]/g, ''),
  )
  const totalCandidates = uniqueBy(
    ordered.flatMap((pass) => pass.parsed.totalCandidates),
    (candidate) => String(candidate.cents),
  )
  const best = ordered[0]
  const parsed: ParsedReceipt = {
    ...best.parsed,
    merchant: merchantCandidates[0]?.name ?? null,
    merchantCandidates,
    date: ordered.find((pass) => pass.parsed.date)?.parsed.date ?? null,
    totalCents: totalCandidates[0]?.cents ?? null,
    totalLabel: totalCandidates[0]?.label ?? null,
    totalCandidates,
  }
  return {
    parsed,
    rawText: ordered.map((pass) => `${pass.source} OCR:\n${pass.text}`).join('\n'),
    confidence: best.confidence,
  }
}

function uniqueBy<T>(items: T[], keyFor: (item: T) => string): T[] {
  const seen = new Set<string>()
  return items.filter((item) => {
    const key = keyFor(item)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}
