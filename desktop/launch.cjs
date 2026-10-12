const { spawn } = require('node:child_process')
const electronPath = require('electron')
const environment = { ...process.env }

// Editor shells can set this to run Electron as Node. Remove it when starting
// the actual desktop runtime from the development script.
delete environment.ELECTRON_RUN_AS_NODE

const child = spawn(electronPath, ['.'], {
  env: environment,
  stdio: 'inherit',
  windowsHide: false,
})

child.once('error', (error) => {
  console.error('Could not launch Electron:', error)
  process.exitCode = 1
})

child.once('exit', (code, signal) => {
  if (signal) {
    console.error(`Electron exited after ${signal}`)
    process.exitCode = 1
  } else {
    process.exitCode = code ?? 1
  }
})
