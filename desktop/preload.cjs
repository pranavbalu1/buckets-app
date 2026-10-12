const { contextBridge, ipcRenderer } = require('electron')

const eventChannel = 'desktop-updates:event'

contextBridge.exposeInMainWorld('desktopUpdates', {
  getAvailability: () => ipcRenderer.invoke('desktop-updates:availability'),
  checkForUpdates: () => ipcRenderer.invoke('desktop-updates:check'),
  downloadUpdate: () => ipcRenderer.invoke('desktop-updates:download'),
  installUpdate: () => ipcRenderer.invoke('desktop-updates:install'),
  onEvent: (callback) => {
    if (typeof callback !== 'function') return () => {}
    const listener = (_event, payload) => callback(payload)
    ipcRenderer.on(eventChannel, listener)
    return () => ipcRenderer.removeListener(eventChannel, listener)
  },
})
