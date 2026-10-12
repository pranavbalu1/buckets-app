import { env, pipeline } from '@huggingface/transformers'
import type { ProgressInfo } from '@huggingface/transformers'

interface ReceiptCandidate {
  bucketId: string
  bucketName: string
  groupName: string | null
  description: string
  exampleCount: number
}

interface ClassifyMessage {
  type: 'classify'
  requestId: number
  receiptText: string
  candidates: ReceiptCandidate[]
}

interface CancelMessage {
  type: 'cancel'
  requestId: number
}

const MODEL_ID = 'Xenova/all-MiniLM-L6-v2'
const MODEL_REVISION = '751bff3'
let extractorPromise: ReturnType<typeof pipeline<'feature-extraction'>> | null = null
const cancelledRequests = new Set<number>()
const activeRequests = new Set<number>()

const workerScope = self as unknown as {
  addEventListener: (type: 'message', listener: (event: MessageEvent<ClassifyMessage | CancelMessage>) => void) => void
  postMessage: (message: unknown) => void
}

workerScope.addEventListener('message', (event: MessageEvent<ClassifyMessage | CancelMessage>) => {
  if (event.data.type === 'cancel') {
    cancelledRequests.add(event.data.requestId)
    return
  }

  void classify(event.data)
})

async function classify(message: ClassifyMessage) {
  const { requestId, candidates } = message
  activeRequests.add(requestId)
  try {
    env.useBrowserCache = true
    env.useWasmCache = true

    extractorPromise ??= pipeline('feature-extraction', MODEL_ID, {
      revision: MODEL_REVISION,
      dtype: 'q8',
      progress_callback: (progress) => {
        for (const activeRequestId of activeRequests) postProgress(activeRequestId, progress)
      },
    })

    const extractor = await extractorPromise
    if (cancelledRequests.has(requestId)) return

    const vectors = await extractor(
      [message.receiptText.slice(0, 2_500), ...candidates.map((candidate) => candidate.description)],
      { pooling: 'mean', normalize: true },
    )
    if (cancelledRequests.has(requestId)) return

    const dimensions = vectors.dims.at(-1) ?? 0
    if (!dimensions || vectors.dims[0] !== candidates.length + 1) {
      throw new Error('The local model returned an unexpected embedding shape.')
    }

    const query = Array.from({ length: dimensions }, (_, index) => Number(vectors.data[index]))
    const suggestions = candidates.map((candidate, index) => {
      const offset = (index + 1) * dimensions
      let similarity = 0
      for (let dimension = 0; dimension < dimensions; dimension += 1) {
        similarity += query[dimension] * Number(vectors.data[offset + dimension])
      }
      return {
        bucketId: candidate.bucketId,
        bucketName: candidate.bucketName,
        groupName: candidate.groupName,
        similarity,
        exampleCount: candidate.exampleCount,
      }
    }).sort((left, right) => right.similarity - left.similarity)

    if (!cancelledRequests.has(requestId)) {
      workerScope.postMessage({ type: 'result', requestId, suggestions })
    }
  } catch (cause) {
    if (!cancelledRequests.has(requestId)) {
      workerScope.postMessage({
        type: 'error',
        requestId,
        message: cause instanceof Error ? cause.message : 'Could not load the local text model.',
      })
    }
    if (extractorPromise) {
      // A failed download should be retryable the next time the user selects this model.
      extractorPromise = null
    }
  } finally {
    cancelledRequests.delete(requestId)
    activeRequests.delete(requestId)
  }
}

function postProgress(requestId: number, progress: ProgressInfo) {
  if (progress.status === 'progress_total') {
    workerScope.postMessage({
      type: 'progress',
      requestId,
      progress: progress.progress,
      file: Object.keys(progress.files).at(-1) ?? 'model files',
    })
  } else if (progress.status === 'initiate' || progress.status === 'download') {
    workerScope.postMessage({ type: 'phase', requestId, file: progress.file })
  } else if (progress.status === 'ready') {
    workerScope.postMessage({ type: 'phase', requestId, file: 'Running the local classifier...' })
  }
}
