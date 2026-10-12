/** Receipt OCR is available in the Electron desktop app, not in the web app. */
export function supportsOnDeviceReceiptScanning(): boolean {
  if (typeof window === 'undefined') return false

  // Packaged Electron uses app://; desktop:dev uses Electron's user agent on Vite.
  return window.location.protocol === 'app:' || /Electron\//i.test(window.navigator.userAgent)
}
