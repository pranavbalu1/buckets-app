const { app, BrowserWindow, protocol, session, shell } = require('electron')
const { readFile, stat } = require('node:fs/promises')
const { extname, relative, resolve, sep } = require('node:path')

const APP_SCHEME = 'app'
const APP_HOST = 'buckets'
const APP_ORIGIN = `${APP_SCHEME}://${APP_HOST}`
const DEV_SERVER_URL = 'http://127.0.0.1:5173'

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
    },
  })

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

  createWindow()
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
