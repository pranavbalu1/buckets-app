const { app, BrowserWindow, ipcMain, protocol, session, shell } = require('electron')
const { readFile, stat } = require('node:fs/promises')
const { extname, relative, resolve, sep } = require('node:path')
const electronUpdater = require('electron-updater')
const { autoUpdater } = electronUpdater

const APP_SCHEME = 'app'
const APP_HOST = 'buckets'
const APP_ORIGIN = `${APP_SCHEME}://${APP_HOST}`
const DEV_SERVER_URL = 'http://127.0.0.1:5173'
const UPDATE_EVENT_CHANNEL = 'desktop-updates:event'

let mainWindow = null
let updateAvailableVersion = null
let updateDownloaded = false
let updateCheckInProgress = false
let latestUpdateEvent = null

protocol.registerSchemesAsPrivileged([{
  scheme: APP_SCHEME,
  privileges: {
    standard: true,
    secure: true,
    supportFetchAPI: true,
    corsEnabled: true,
    stream: true,
  },
}])

const mimeTypes = new Map([
  ['.css', 'text/css; charset=utf-8'],
  ['.html', 'text/html; charset=utf-8'],
  ['.ico', 'image/x-icon'],
  ['.jpeg', 'image/jpeg'],
  ['.jpg', 'image/jpeg'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.mjs', 'text/javascript; charset=utf-8'],
  ['.png', 'image/png'],
  ['.svg', 'image/svg+xml'],
  ['.tar', 'application/x-tar'],
  ['.txt', 'text/plain; charset=utf-8'],
  ['.wasm', 'application/wasm'],
  ['.webp', 'image/webp'],
  ['.woff', 'font/woff'],
  ['.woff2', 'font/woff2'],
])

function createAppResponse(body, status, headers = {}) {
  return new Response(body, { status, headers })
}

async function serveAppAsset(request) {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return createAppResponse(null, 405, { Allow: 'GET, HEAD' })
  }

  const requestUrl = new URL(request.url)
  if (requestUrl.host !== APP_HOST) {
    return createAppResponse('Not found', 404)
  }

  let requestPath
  try {
    requestPath = decodeURIComponent(requestUrl.pathname)
  } catch {
    return createAppResponse('Bad request', 400)
  }

  const appRoot = resolve(app.getAppPath(), 'dist')
  const requestedFile = resolve(appRoot, `.${requestPath}`)
  const relativePath = relative(appRoot, requestedFile)
  if (relativePath === '..' || relativePath.startsWith(`..${sep}`) || relativePath.startsWith(sep)) {
    return createAppResponse('Not found', 404)
  }

  let filePath = requestedFile
  try {
    const fileInfo = await stat(filePath)
    if (!fileInfo.isFile()) filePath = resolve(appRoot, 'index.html')
  } catch {
    // Client side routes have no physical file, so serve the React entry point.
    if (extname(requestPath)) return createAppResponse('Not found', 404)
    filePath = resolve(appRoot, 'index.html')
  }

  try {
    const body = request.method === 'HEAD' ? null : await readFile(filePath)
    const headers = {
      'Content-Type': mimeTypes.get(extname(filePath).toLowerCase()) ?? 'application/octet-stream',
      'X-Content-Type-Options': 'nosniff',
    }
    if (requestPath.startsWith('/ocr-models/') || requestPath.startsWith('/ocr-runtime/')) {
      headers['Cache-Control'] = 'public, max-age=31536000, immutable'
    }
    return createAppResponse(body, 200, headers)
  } catch {
    return createAppResponse('Not found', 404)
  }
}

function isAllowedAppUrl(value) {
  try {
    const url = new URL(value)
    if (url.protocol === `${APP_SCHEME}:` && url.host === APP_HOST) return true
    return !app.isPackaged && url.origin === DEV_SERVER_URL
  } catch {
    return false
  }
}

function updatesAreSupported() {
  return app.isPackaged && process.platform === 'win32'
}

function sendUpdateEvent(event) {
  latestUpdateEvent = event
  for (const window of BrowserWindow.getAllWindows()) {
    if (!window.isDestroyed() && !window.webContents.isDestroyed()) {
      window.webContents.send(UPDATE_EVENT_CHANNEL, event)
    }
  }
}

function releaseNotesText(notes) {
  if (typeof notes === 'string') return notes
  if (!Array.isArray(notes)) return ''
  return notes.map((entry) => {
    if (typeof entry === 'string') return entry
    return typeof entry?.note === 'string' ? entry.note : ''
  }).filter(Boolean).join('\n\n')
}

function asErrorMessage(error) {
  return error instanceof Error ? error.message : 'The update service could not complete the request.'
}

function setupAutoUpdater() {
  if (!updatesAreSupported()) return

  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = false

  autoUpdater.on('checking-for-update', () => sendUpdateEvent({ type: 'checking' }))
  autoUpdater.on('update-available', (info) => {
    updateAvailableVersion = info.version
    updateDownloaded = false
    sendUpdateEvent({ type: 'available', version: info.version, releaseNotes: releaseNotesText(info.releaseNotes) })
  })
  autoUpdater.on('update-not-available', (info) => {
    updateAvailableVersion = null
    updateDownloaded = false
    sendUpdateEvent({ type: 'not-available', version: info.version ?? app.getVersion() })
  })
  autoUpdater.on('download-progress', (progress) => {
    sendUpdateEvent({
      type: 'download-progress',
      version: updateAvailableVersion ?? app.getVersion(),
      percent: progress.percent,
    })
  })
  autoUpdater.on('update-downloaded', (info) => {
    updateDownloaded = true
    sendUpdateEvent({ type: 'downloaded', version: info.version })
  })
  autoUpdater.on('error', (error) => {
    console.error('Desktop update error:', error)
    sendUpdateEvent({ type: 'error', message: asErrorMessage(error) })
  })

  ipcMain.handle('desktop-updates:check', async () => {
    if (updateCheckInProgress) return { ok: true }
    updateCheckInProgress = true
    try {
      await autoUpdater.checkForUpdates()
      return { ok: true }
    } catch (error) {
      const message = asErrorMessage(error)
      sendUpdateEvent({ type: 'error', message })
      return { ok: false, message }
    } finally {
      updateCheckInProgress = false
    }
  })

  ipcMain.handle('desktop-updates:download', async () => {
    if (!updateAvailableVersion) return { ok: false, message: 'Check for updates before downloading.' }
    try {
      sendUpdateEvent({ type: 'download-started', version: updateAvailableVersion })
      await autoUpdater.downloadUpdate()
      return { ok: true }
    } catch (error) {
      const message = asErrorMessage(error)
      sendUpdateEvent({ type: 'error', message })
      return { ok: false, message }
    }
  })

  ipcMain.handle('desktop-updates:install', () => {
    if (!updateDownloaded) return { ok: false, message: 'The update has not finished downloading.' }
    autoUpdater.quitAndInstall()
    return { ok: true }
  })
}

ipcMain.handle('desktop-updates:availability', () => ({
  supported: updatesAreSupported(),
  currentVersion: app.getVersion(),
  latestEvent: latestUpdateEvent,
}))

function createWindow() {
  const window = new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: 360,
    minHeight: 560,
    backgroundColor: '#09090b',
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      spellcheck: false,
      preload: resolve(__dirname, 'preload.cjs'),
    },
  })
  mainWindow = window
  window.on('closed', () => { if (mainWindow === window) mainWindow = null })

  window.once('ready-to-show', () => window.show())
  window.webContents.on('will-navigate', (event, targetUrl) => {
    if (!isAllowedAppUrl(targetUrl)) event.preventDefault()
  })
  window.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://')) void shell.openExternal(url)
    return { action: 'deny' }
  })

  const target = app.isPackaged ? `${APP_ORIGIN}/` : DEV_SERVER_URL
  void window.loadURL(target).catch((error) => {
    console.error('Could not open Buckets desktop window:', error)
    window.destroy()
  })
}

app.whenReady().then(async () => {
  if (app.isPackaged) {
    await protocol.handle(APP_SCHEME, serveAppAsset)
  }

  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    callback(permission === 'media' && isAllowedAppUrl(webContents.getURL()))
  })

  setupAutoUpdater()
  createWindow()
  if (updatesAreSupported()) {
    const initialUpdateCheck = setTimeout(() => {
      if (!updateCheckInProgress) {
        updateCheckInProgress = true
        void autoUpdater.checkForUpdates().catch((error) => {
          const message = asErrorMessage(error)
          console.error('Initial desktop update check failed:', error)
          sendUpdateEvent({ type: 'error', message })
        }).finally(() => { updateCheckInProgress = false })
      }
    }, 6000)
    initialUpdateCheck.unref?.()
  }
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
}).catch((error) => {
  console.error('Could not start Buckets desktop app:', error)
  app.quit()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
