import { DeviceProductLayout } from "usb-support/dist/typings"
import { App } from "./App.class"
import * as jordiActions from "./configs/actions/jordi-config.json"
import { ButtonActionsConfig } from "./types"

const controllerPath = process.env.CONTROLLER_PATH || './configs/eg-starts.controller.json'
const actionsPath = process.env.ACTIONS_PATH || './configs/actions/button-config-acker.json'

if ( process.env.NO_ACTION ) {
  console.warn(`🟧 no action mode set to: ${process.env.NO_ACTION}`)
}

console.log('⚙️ Using configs', {
  controllerPath,
  actionsPath
})

const controllerConfig: DeviceProductLayout = require(controllerPath)
const defaultActions: ButtonActionsConfig = require(actionsPath)
// import { DeviceProductLayout } from "usb-support/dist/typings";


console.info('⏳ starting app')

try {
  new App(controllerConfig, {
    default: defaultActions as any,
    jordi: jordiActions as any,
  })
  console.info('🟢 app started')
  setInterval(() => console.info('👂 listening...'), 60000 * 2) // every two minutes, keep the process alive
} catch (err) {
	console.error('🔴 Failed to start app', err);
}

function delay(ms) {
  return new Promise((resolve) =>
    setTimeout(resolve, ms)
  )
}
