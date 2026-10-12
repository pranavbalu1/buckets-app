import { useSyncExternalStore } from 'react'

export type DesktopUpdateEvent =
  | { type: 'checking' }
  | { type: 'available'; version: string; releaseNotes?: string }
  | { type: 'not-available'; version: string }
  | { type: 'download-started'; version: string }
  | { type: 'download-progress'; version: string; percent: number }
  | { type: 'downloaded'; version: string }
  | { type: 'error'; message: string }

interface DesktopUpdateAvailability {
  supported: boolean
  currentVersion: string
  latestEvent: DesktopUpdateEvent | null
}

interface DesktopUpdateBridge {
  getAvailability: () => Promise<DesktopUpdateAvailability>
  checkForUpdates: () => Promise<{ ok: boolean; message?: string }>
  downloadUpdate: () => Promise<{ ok: boolean; message?: string }>
  installUpdate: () => Promise<{ ok: boolean; message?: string }>
  onEvent: (callback: (event: DesktopUpdateEvent) => void) => () => void
}

declare global {
  interface Window {
    desktopUpdates?: DesktopUpdateBridge
  }
}

export interface DesktopUpdateState {
  supported: boolean
  currentVersion: string
  status: 'idle' | 'checking' | 'available' | 'not-available' | 'downloading' | 'downloaded' | 'error'
  version: string | null
  releaseNotes: string | null
  percent: number
  message: string | null
}

const initialState: DesktopUpdateState = {
  supported: false,
  currentVersion: '',
  status: 'idle',
  version: null,
  releaseNotes: null,
  percent: 0,
  message: null,
}

let state = initialState
let bridgeSubscription: (() => void) | null = null
let availabilityRequested = false
const subscribers = new Set<() => void>()

function publish(next: DesktopUpdateState) {
  state = next
  subscribers.forEach((subscriber) => subscriber())
}

function handleUpdateEvent(event: DesktopUpdateEvent) {
  switch (event.type) {
    case 'checking':
      publish({ ...state, status: 'checking', version: null, releaseNotes: null, percent: 0, message: null })
      break
    case 'available':
      publish({ ...state, status: 'available', version: event.version, releaseNotes: event.releaseNotes ?? null, percent: 0, message: null })
      break
    case 'not-available':
      publish({ ...state, status: 'not-available', currentVersion: event.version, version: null, releaseNotes: null, percent: 0, message: null })
      break
    case 'download-started':
      publish({ ...state, status: 'downloading', version: event.version, percent: 0, message: null })
      break
    case 'download-progress':
      publish({ ...state, status: 'downloading', version: event.version, percent: Math.max(0, Math.min(100, event.percent)), message: null })
      break
    case 'downloaded':
      publish({ ...state, status: 'downloaded', version: event.version, percent: 100, message: null })
      break
    case 'error':
      publish({ ...state, status: 'error', percent: 0, message: event.message })
      break
  }
}

function connectBridge() {
  const bridge = typeof window === 'undefined' ? undefined : window.desktopUpdates
  if (!bridge) return

  if (!bridgeSubscription) bridgeSubscription = bridge.onEvent(handleUpdateEvent)
  if (availabilityRequested) return
  availabilityRequested = true
  void bridge.getAvailability().then((availability) => {
    publish({ ...state, supported: availability.supported, currentVersion: availability.currentVersion })
    if (availability.latestEvent) handleUpdateEvent(availability.latestEvent)
  }).catch(() => {
    publish({ ...state, supported: false, message: 'Could not check desktop update support.' })
  })
}

function subscribe(callback: () => void) {
  subscribers.add(callback)
  connectBridge()
  return () => subscribers.delete(callback)
}

function getSnapshot() {
  return state
}

export function useDesktopUpdates() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}

export function hasDesktopUpdateBridge() {
  return typeof window !== 'undefined' && Boolean(window.desktopUpdates)
}

export async function checkForDesktopUpdates() {
  connectBridge()
  const bridge = typeof window === 'undefined' ? undefined : window.desktopUpdates
  if (!bridge) return { ok: false, message: 'Update checks are available in the desktop app.' }
  return bridge.checkForUpdates()
}

export async function downloadDesktopUpdate() {
  const bridge = typeof window === 'undefined' ? undefined : window.desktopUpdates
  if (!bridge) return { ok: false, message: 'Update downloads are available in the desktop app.' }
  return bridge.downloadUpdate()
}

export async function installDesktopUpdate() {
  const bridge = typeof window === 'undefined' ? undefined : window.desktopUpdates
  if (!bridge) return { ok: false, message: 'Update installation is available in the desktop app.' }
  return bridge.installUpdate()
}
