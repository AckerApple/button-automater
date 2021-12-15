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
const UsbConnection_class_1 = require("usb-support/dist/UsbConnection.class");
const controllerConfig = require("./configs/eg-starts.controller.json");
const defaultActions = require("./configs/actions/button-config.json");
const jordiActions = require("./configs/actions/jordi-config.json");
const rxjs_1 = require("rxjs");
// import { DeviceProductLayout } from "usb-support/dist/typings";
// Type "Hello World" then press enter.
var robot = require("robotjs");
const open = require('open');
class App {
    constructor() {
        this.subs = new rxjs_1.Subscription();
        // controlMonitor: InputControlMonitor = new InputControlMonitor()
        this.connection = new UsbConnection_class_1.UsbConnection(controllerConfig);
        this.pressed = []; // currently pressed
        this.lastHeld = [];
        this.lastPresses = [];
        // lastReleases: string[] = []
        this.pressTimeListen = 800; // how long to wait before examining all buttons pressed
        this.actionConfigs = {
            default: defaultActions,
            jordi: jordiActions,
        };
        this.buttons = this.actionConfigs.default;
        this.hotButtons = [];
        this.subs.add(this.connection.monitor.$change.subscribe(pressed => this.onPress(pressed.map(x => x)) // clone pressed map
        ));
        this.connection.connect();
        this.determineHotButtons();
        this.connection.$failed.subscribe(() => console.log('🔴 usb device connect failed'));
        this.subs.add(this.connection.$connected.subscribe(() => console.log('🟩 usb device connected')));
    }
    determineHotButtons() {
        this.hotButtons.length = 0;
        Object.values(this.buttons).filter(value => value.buttons.length === 1 && value.press ? true : false).forEach(value => this.hotButtons.push(value));
    }
    onPress(pressed) {
        return __awaiter(this, void 0, void 0, function* () {
            this.determineReleases(pressed);
            if (pressed.length === 0) {
                return; // ignore releases
            }
            // actions that do NOT wait for other button presses or patterns
            const hotAction = this.getHotActionByPressed(pressed);
            if (hotAction) {
                return this.runAction(hotAction);
            }
            // first press of a new command
            if (!this.lastPresses.length) {
                return this.startFirstPressListen(pressed);
            }
            // additional presses
            this.lastPresses.push(pressed);
        });
    }
    determineReleases(pressed) {
        const previousPressed = this.pressed;
        const released = previousPressed.filter(press => !pressed.includes(press));
        this.pressed = pressed;
        const releasesByButton = {
            blue: released.includes('blue'),
            red: released.includes('red'),
            yellow: released.includes('yellow'),
            green: released.includes('green'),
            switch: released.includes('switch'),
        };
        const configMatches = this.getConfigMatches(releasesByButton);
        const matchedConfig = configMatches.reduce((best, one) => (best ? best.buttons.length : 0) > one.buttons.length ? best : one, null);
        if (matchedConfig && matchedConfig.releases) {
            const releases = matchedConfig.buttons.reduce((sum, name) => sum + releasesByButton[name], 0) / matchedConfig.buttons.length;
            let action = matchedConfig.releases[releases - 1];
            action = action || matchedConfig.releases[matchedConfig.releases.length - 1]; // no numbered action
            console.log('💥 run release action');
            this.runAction(action);
        }
    }
    startFirstPressListen(pressed) {
        return __awaiter(this, void 0, void 0, function* () {
            this.lastPresses.push(pressed);
            yield delay(this.pressTimeListen);
            this.play();
            this.lastHeld.length = 0;
            this.lastPresses.length = 0;
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
        // is button still held?
        if (isHoldAction) {
            console.info('HoldAction');
            this.lastHeld = this.connection.monitor.lastPressed; // this.controlMonitor.lastPressed
            this.lastPresses.length = 0;
            return this.holdAction();
        }
        this.action();
    }
    holdAction() {
        const actions = Object.values(this.buttons);
        const bestChoice = actions.reduce((best, config) => {
            var _a;
            // is best better than this one
            if (best) {
                if (best.config.buttons.length > config.buttons.length) {
                    return best; // current has more button matches
                }
                if (best.actionType === 'hold' && !config.hold) {
                    return best; // current doesn't even have a hold action
                }
            }
            // not even a match?
            if (!buttonsMatch(config.buttons, this.lastHeld)) {
                return best; // current doesn't even match what's held
            }
            if (config.hold) {
                return { config, action: config.hold, actionType: 'hold' };
            }
            if (!best && ((_a = config.presses) === null || _a === void 0 ? void 0 : _a.length)) {
                return { config, action: config.presses[0], actionType: 'presses' };
            }
        }, undefined);
        if (bestChoice) {
            this.runAction(bestChoice.action);
        }
    }
    action() {
        const pressesByButton = {
            blue: this.lastPresses.filter(pressed => pressed.includes('blue')).length,
            red: this.lastPresses.filter(pressed => pressed.includes('red')).length,
            yellow: this.lastPresses.filter(pressed => pressed.includes('yellow')).length,
            green: this.lastPresses.filter(pressed => pressed.includes('green')).length,
            switch: this.lastPresses.filter(pressed => pressed.includes('switch')).length,
        };
        const configMatches = this.getConfigMatches(pressesByButton);
        // presses action, choose the best match
        const matchedConfig = configMatches.reduce((best, one) => (best ? best.buttons.length : 0) > one.buttons.length ? best : one, null);
        if (matchedConfig && matchedConfig.presses) {
            const presses = matchedConfig.buttons.reduce((sum, name) => sum + pressesByButton[name], 0) / matchedConfig.buttons.length;
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
    getConfigMatches(buttonNames) {
        const configEntries = Object.entries(this.buttons);
        const configMatches = [];
        for (const [_name, config] of configEntries) {
            const buttons = config.buttons; // buttons it takes to trigger this config
            const buttonsPressed = Object.entries(buttonNames).reduce((all, [key, value]) => {
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
        return configMatches;
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
            console.info(`🎚 change to next configuration`, action.title);
        }
        if (action.keyboardType) {
            console.info(`⌨️ keyboard type ${action.title}`);
            robot.typeString(action.keyboardType);
        }
        if (action.keyTaps) {
            console.info(`⌨️ keyboard taps ${action.keyTaps}`);
            const keyTaps = action.keyTaps instanceof Array ? action.keyTaps : action.keyTaps.split('');
            keyTaps.forEach(key => robot.keyTap(key));
        }
        if (action.itemPath || action.app) {
            console.info("⬆️  open", action.app, this.pressed);
            return open(action.itemPath || '', action.app);
        }
    }
}
console.info('⏳ starting app');
try {
    new App();
    console.info('🟢 app started');
    setInterval(() => console.log('🟢'), 60000); // every-minute keep the process alive
}
catch (err) {
    console.error('🔴 Failed to start app', err);
}
function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
function buttonsMatch(buttons0, buttons1) {
    return buttons0.filter(button => buttons1.includes(button)).length === buttons0.length;
}
