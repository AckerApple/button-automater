"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
// import { InputControlMonitor } from "controller-helper/dist/InputControlMonitor.class"
const UsbConnection_class_1 = require("controller-helper/dist/UsbConnection.class");
const controllerConfig = require("./configs/eg-starts.controller.json");
// import * as buttons from './configs/actions/button-config.json'
const rxjs_1 = require("rxjs");
// Type "Hello World" then press enter.
var robot = require("robotjs");
const open = require('open');
class App {
    constructor() {
        this.subs = new rxjs_1.Subscription();
        // controlMonitor: InputControlMonitor = new InputControlMonitor()
        this.connection = new UsbConnection_class_1.UsbConnection(controllerConfig);
        this.lastHeld = [];
        this.lastPresses = [];
        this.pressTimeListen = 800;
        this.actionConfigs = {
            default: require('./configs/actions/button-config.json'),
            jordi: require('./configs/actions/jordi-config.json')
        };
        this.buttons = this.actionConfigs.default;
        this.hotButtons = [];
        this.subs.add(this.connection.monitor.$change.subscribe(pressed => this.onPress(pressed)));
        // this.monitorControlByConfig(controllerConfig)
        this.connection.connect();
        this.determineHotButtons();
    }
    determineHotButtons() {
        this.hotButtons.length = 0;
        Object.values(this.buttons).filter(value => value.buttons.length === 1 && value.press ? true : false).forEach(value => this.hotButtons.push(value));
    }
    onPress(pressed) {
        return __awaiter(this, void 0, void 0, function* () {
            if (pressed.length === 0) {
                return; // ignore releases
            }
            console.log('pressed', pressed);
            const hotAction = this.getHotActionByPressed(pressed);
            console.log('hotAction', hotAction);
            if (hotAction) {
                return this.runAction(hotAction);
            }
            // first press of a new command
            if (!this.lastPresses.length) {
                this.lastPresses.push(pressed);
                yield delay(this.pressTimeListen);
                this.play();
                this.lastHeld.length = 0;
                this.lastPresses.length = 0;
                return;
            }
            // additional presses
            this.lastPresses.push(pressed);
        });
    }
    getHotActionByPressed(pressed) {
        if (pressed.length != 1) {
            return;
        }
        const press = pressed[0];
        const button = this.hotButtons.find(button => button.buttons.includes(press));
        if (!button) {
            return;
        }
        return button.press;
    }
    play() {
        const isHoldAction = this.connection.monitor.lastPressed.length;
        console.log('isHoldAction', isHoldAction);
        // is button still held?
        if (isHoldAction) {
            this.lastHeld = this.connection.monitor.lastPressed; // this.controlMonitor.lastPressed
            this.lastPresses.length = 0;
            return this.holdAction();
        }
        this.action();
    }
    holdAction() {
        const actions = Object.values(this.buttons);
        for (const buttonActions of actions) {
            if (!buttonsMatch(buttonActions.buttons, this.lastHeld)) {
                continue; // action trigger buttons not matched
            }
            const holdAction = buttonActions.hold;
            // no hold action? run the first press action
            if (!holdAction && buttonActions.presses) {
                return this.runAction(buttonActions.presses[0]);
            }
            this.runAction(holdAction);
        }
    }
    action() {
        const pressesByButton = {
            blue: this.lastPresses.filter(pressed => pressed.includes('blue')).length,
            red: this.lastPresses.filter(pressed => pressed.includes('red')).length,
            yellow: this.lastPresses.filter(pressed => pressed.includes('yellow')).length,
            green: this.lastPresses.filter(pressed => pressed.includes('green')).length,
        };
        const configEntries = Object.entries(this.buttons);
        const configMatches = [];
        for (const [name, config] of configEntries) {
            const buttons = config.buttons; // buttons it takes to trigger this config
            const buttonsPressed = Object.entries(pressesByButton).reduce((all, [key, value]) => {
                if (value) {
                    all.push(key);
                }
                return all;
            }, []);
            const matches = buttonsMatch(buttons, buttonsPressed);
            // is the combination of buttons used matched
            if (matches) {
                configMatches.push(config);
            }
        }
        // presses action, choose the best match
        const matchedConfig = configMatches.reduce((best, one) => (best ? best.buttons.length : 0) > one.buttons.length ? best : one, null);
        if (matchedConfig && matchedConfig.presses) {
            const presses = matchedConfig.buttons.reduce((sum, name) => sum + pressesByButton[name], 0);
            let action = matchedConfig.presses[presses - 1];
            action = action || matchedConfig.presses[matchedConfig.presses.length - 1]; // no numbered action
            this.runAction(action);
        }
        // Type "Hello World".
        /*
        ;
    
        // Press enter.
        robot.keyTap("enter")
        */
    }
    runAction(action) {
        var _a;
        if ((_a = action.action) === null || _a === void 0 ? void 0 : _a.includes('change-next-config')) {
            // robot.typeString(action.keyboardType)
            const actionConfigArray = Object.values(this.actionConfigs);
            const currentIndex = actionConfigArray.indexOf(this.buttons);
            const newIndex = currentIndex === actionConfigArray.length - 1 ? 0 : currentIndex + 1;
            this.buttons = actionConfigArray[newIndex];
            this.determineHotButtons();
            console.log(`change to next configuration`);
        }
        if (action.keyboardType) {
            console.log(`keyboard type ${action.title}`);
            robot.typeString(action.keyboardType);
        }
        if (action.keyTaps) {
            console.log(`keyboard taps ${action.keyTaps}`);
            action.keyTaps.forEach(key => robot.keyTap(key));
        }
        if (action.itemPath || action.app) {
            console.log(`open ${action.title}`, action.app);
            return open(action.itemPath || '', action.app);
        }
    }
}
new App();
setInterval(() => console.log('keep alive'), 60000); // every-minute keep the process alive
function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
function buttonsMatch(buttons0, buttons1) {
    return buttons0.filter(button => buttons1.includes(button)).length === buttons0.length;
}
