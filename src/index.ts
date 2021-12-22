import { UsbConnection } from "usb-support/dist/UsbConnection.class"
import * as controllerConfig from "./configs/eg-starts.controller.json"
import * as defaultActions from "./configs/actions/button-config.json"
import * as jordiActions from "./configs/actions/jordi-config.json"
import { Subscription } from "rxjs"
import { Action, ActionConfig } from "./types"
// import { DeviceProductLayout } from "usb-support/dist/typings";

// Type "Hello World" then press enter.
var robot = require("robotjs");
const open = require('open');
interface ButtonActionsConfig {
  [name: string]: ActionConfig
}

class App {
  subs: Subscription = new Subscription()
  // controlMonitor: InputControlMonitor = new InputControlMonitor()
  connection: UsbConnection = new UsbConnection(controllerConfig)

  pressed: string[] = [] // currently pressed
  lastHeld: string[] = []
  lastPresses: string[][] = []
  // lastReleases: string[] = []

  pressTimeListen = 800 // how long to wait before examining all buttons pressed

  actionConfigs = {
    default: defaultActions as any,
    jordi: jordiActions as any,
  }
  buttons: ButtonActionsConfig = this.actionConfigs.default as {[name: string]: ActionConfig}
  hotButtons: ActionConfig[] = []

  constructor() {
    this.subs.add(
      this.connection.monitor.$change.subscribe(
        pressed => this.onPressChange(pressed.map(x => x)) // clone pressed map
      )
    )

    this.connection.connect()
    this.determineHotButtons()

    this.connection.$failed.subscribe(() => console.error('🔴 usb device connect failed'))

    this.subs.add(
      this.connection.$connected.subscribe(() => console.info('🟩 usb device connected'))
    )
  }

  determineHotButtons() {
    this.hotButtons.length = 0

    Object.values(this.buttons).filter(value =>
      value.buttons.length === 1 && value.press ? true : false
    ).forEach(value =>
      this.hotButtons.push( value )
    )
  }

  async onPressChange(pressed: string[]) {
    this.determineReleases(pressed)

    if (pressed.length === 0) {
      return // ignore releases
    }

    // actions that do NOT wait for other button presses or patterns
    const hotAction = this.getHotActionByPressed(pressed)
    if (hotAction) {
      return this.runAction(hotAction)
    }

    // first press of a new command
    if (!this.lastPresses.length) {
      return this.startFirstPressListen(pressed)
    }

    if (this.lastPresses.length && this.lastPresses[this.lastPresses.length - 1].length > pressed.length) {
      return
    }

    // additional presses
    this.lastPresses.push(pressed)
  }

  determineReleases(pressed: string[]) {
    const previousPressed = this.pressed
    const released = previousPressed.filter(press => !pressed.includes(press))
    this.pressed = pressed

    const releasesByButton = {
      blue: released.includes('blue'),
      red: released.includes('red'),
      yellow: released.includes('yellow'),
      green: released.includes('green'),
      switch: released.includes('switch'),
    }
    const configMatches: ActionConfig[] = this.getConfigMatches(releasesByButton)
    const matchedConfig: ActionConfig = configMatches.reduce((best, one) => (best ? best.buttons.length : 0) > one.buttons.length ? best : one, null)
    if (matchedConfig && matchedConfig.releases) {
      const releases = matchedConfig.buttons.reduce((sum, name) => sum + releasesByButton[name], 0) / matchedConfig.buttons.length

      let action = matchedConfig.releases[ releases - 1 ]
      action = action || matchedConfig.releases[ matchedConfig.releases.length - 1 ] // no numbered action

      console.info('💥 run release action')

      this.runAction(action)
    }
  }

  async startFirstPressListen(pressed: string[]) {
    console.info('🦻 Button action listen start ---')
    this.lastPresses.push(pressed)
    
    await delay(this.pressTimeListen)

    console.info('👂 🔵 Playing button action ---', this.lastPresses)
    this.play()

    this.lastHeld.length = 0
    this.lastPresses.length = 0
    console.info('👂 🛑 Button action listen end ---')
  }

  getHotActionByPressed(pressed: string[]): Action | undefined {
    if (pressed.length != 1) {
      return
    }

    const press = pressed[0]
    const button = this.hotButtons.find(button => button.buttons.includes(press))

    if (!button) {
      return
    }

    return button.press
  }


  play() {
    const isHoldAction = this.lastPresses.length && this.connection.monitor.lastPressed.length === this.lastPresses[this.lastPresses.length - 1].length


    // is button still held?
    if (isHoldAction) {
      this.lastHeld = this.connection.monitor.lastPressed // this.controlMonitor.lastPressed
      this.lastPresses.length = 0
      const holdAction = this.holdAction()
      
      if (holdAction) {
        console.info('✋ hold action')
      }
      
      return holdAction
    }

    this.action()
  }

  holdAction() {
    const actions = Object.values(this.buttons)

    const bestChoice: BestAction | undefined = actions.reduce((best: BestAction, config) => {
      // is best better than this one
      if (best) {
        if (best.config.buttons.length > config.buttons.length) {
          return best // current has more button matches
        }

        if (best.actionType === 'hold' && !config.hold) {
          return best // current doesn't even have a hold action
        }
      }

      // not even a match?
      if (!buttonsMatch(config.buttons, this.lastHeld)) {
        return best // current doesn't even match what's held
      }

      if (config.hold) {
        return {config, action: config.hold, actionType: 'hold'}
      }

      if (!best && config.presses?.length) {
        return {config, action: config.presses[0], actionType: 'presses'}
      }
    }, undefined)

    if (bestChoice) {
      this.runAction(bestChoice.action)
      return bestChoice
    }
  }

  action() {
    const colorCounter = (color:string) => (all: string[][], pressed: string[]) => {
      if (pressed.includes(color)) {
        all.push(pressed)
      }
      return all
    }

    const pressesByButton = {
      blue: this.lastPresses.reduce(colorCounter('blue'), []).length,
      red: this.lastPresses.reduce(colorCounter('red'), []).length,
      yellow: this.lastPresses.reduce(colorCounter('yellow'), []).length,
      green: this.lastPresses.reduce(colorCounter('green'), []).length,
      switch: this.lastPresses.reduce(colorCounter('switch'), []).length,
    }

    const configMatches: ActionConfig[] = this.getConfigMatches(pressesByButton)
   
    // presses action, choose the best match
    const matchedConfig: ActionConfig = configMatches.reduce((best, one) => {
      const bestCount = best?.buttons.length || 0
      return bestCount > one.buttons.length ? best : one
    }, null)
    
    if (matchedConfig && matchedConfig.presses) {
      // TODO: Will need unit tests to cover types of presses
      const sourcePressCount = matchedConfig.buttons.reduce((sum, name) => sum + pressesByButton[name], 0)
      const presses = Math.floor(sourcePressCount / matchedConfig.buttons.length)

      let action = matchedConfig.presses[ presses - 1 ]
      action = action || matchedConfig.presses[ matchedConfig.presses.length - 1 ] // no numbered action

      this.runAction(action)
    }
  }

  getConfigMatches(buttonNames: {[index:string]: number | boolean}) {
    const configEntries = Object.entries(this.buttons)
    const configMatches: ActionConfig[] = []
    
    for (const [_name, config] of configEntries) {
      const buttons = config.buttons // buttons it takes to trigger this config
      
      const buttonsPressed = Object.entries(buttonNames).reduce((all, [key, value]) => {
        if (value) {
          all.push(key)
        }
        return all
      }, [])
      
      
      const matches = buttonsMatch(buttons, buttonsPressed)
      
      // is the combination of buttons used matched
      if (matches) {
        configMatches.push(config)
      }
    }
    
    return configMatches
  }

  runAction(action: Action) {
    if (action.action?.includes('change-next-config')) {
      // robot.typeString(action.keyboardType)
      const actionConfigArray = Object.values(this.actionConfigs)
      const currentIndex = actionConfigArray.indexOf(this.buttons)
      const newIndex = currentIndex === actionConfigArray.length-1 ? 0 : currentIndex + 1
      this.buttons = actionConfigArray[ newIndex ]
      this.determineHotButtons()
      console.info(`🎚 change to next configuration`, action.title)
    }

    if (action.keyboardType) {
      console.info(`⌨️ keyboard type ${action.title}`)
      robot.typeString(action.keyboardType)
    }

    if (action.keyTaps) {
      console.info(`⌨️ keyboard taps ${action.keyTaps}`)
      const keyTaps = action.keyTaps instanceof Array ? action.keyTaps : (action.keyTaps as string).split('')
      keyTaps.forEach(key => robot.keyTap(key))
    }

    if (action.itemPath || action.app) {
      console.info("⬆️  open", action.title, this.pressed)
      return open(action.itemPath || '', action.app)
    }
  }
}

console.info('⏳ starting app')

try {
  new App()
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

function buttonsMatch(buttons0: string[], buttons1: string[]): boolean {
  const matches = buttons0.filter(button => buttons1.includes(button)).length
  return matches === buttons0.length
}

interface BestAction {
  action:Action
  config: ActionConfig
  actionType: 'press' | 'presses' | 'hold' | string
}