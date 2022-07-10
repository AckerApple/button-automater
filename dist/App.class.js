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
exports.findEventByPresses = exports.App = void 0;
const UsbConnection_class_1 = require("usb-support/dist/UsbConnection.class");
const rxjs_1 = require("rxjs");
var robot = require("robotjs");
const open = require('open');
class App {
    constructor(device, actionConfigs) {
        this.device = device;
        this.actionConfigs = actionConfigs;
        this.subs = new rxjs_1.Subscription();
        this.pressed = []; // currently pressed
        this.lastPresses = []; // everything pressed during an event listen
        // lastReleases: string[] = []
        this.pressTimeListen = 800; // how long to wait before examining all buttons pressed
        this.hotButtons = [];
        this.connection = new UsbConnection_class_1.UsbConnection(device);
        this.buttons = actionConfigs.default;
        this.events = this.actionConfigs.default.events;
        delete this.buttons.events;
        this.subs.add(this.connection.monitor.$change.subscribe(pressed => this.onPressChange(pressed.map(x => x)) // clone pressed map
        ));
        this.connection.connect();
        this.determineHotButtons();
        this.connection.$failed.subscribe(() => console.error('🔴 usb device connect failed'));
        this.subs.add(this.connection.$connected.subscribe(() => console.info('🟩 usb device connected')));
    }
    determineHotButtons() {
        this.hotButtons.length = 0;
        Object.values(this.buttons).filter(value => value.buttons.length === 1 && value.press ? true : false).forEach(value => this.hotButtons.push(value));
    }
    onPressChange(pressed) {
        return __awaiter(this, void 0, void 0, function* () {
            this.determineReleases(pressed); // sets this.pressed which is most upto date button state
            if (pressed.length === 0) {
                return; // ignore releases
            }
            // actions that do NOT wait for other button presses or patterns
            const hotAction = this.getHotActionByPressed(pressed);
            if (hotAction) {
                return this.runAction(hotAction);
            }
            const lastPresses = this.lastPresses;
            // first press of a new command
            if (!lastPresses.length) {
                return this.startFirstPressListen(pressed);
            }
            if (lastPresses.length && lastPresses[lastPresses.length - 1].length > pressed.length) {
                return;
            }
            // additional presses
            console.info(`⏳ Adding button listening time ${300}...`);
            this.continuePressListen(pressed, 300);
        });
    }
    determineReleases(pressed) {
        const previousPressed = this.pressed;
        const released = previousPressed.filter(press => !pressed.includes(press));
        this.pressed = pressed;
        const releasesByButton = released.reduce((all, one) => {
            all[one] = true;
            return all;
        }, {});
        const configMatches = this.getConfigMatches(releasesByButton);
        const matchedConfig = configMatches.reduce((best, one) => (best ? best.buttons.length : 0) > one.buttons.length ? best : one, null);
        if (matchedConfig && matchedConfig.releases) {
            const releases = matchedConfig.buttons.reduce((sum, name) => sum + releasesByButton[name], 0) / matchedConfig.buttons.length;
            let action = matchedConfig.releases[releases - 1];
            action = action || matchedConfig.releases[matchedConfig.releases.length - 1]; // no numbered action
            console.info('💥 run release action');
            this.runAction(action);
        }
    }
    startFirstPressListen(pressed) {
        return __awaiter(this, void 0, void 0, function* () {
            console.info('--- 🦻 Button action listen start ---', pressed);
            this.continuePressListen(pressed);
        });
    }
    continuePressListen(pressed, listenTime = this.pressTimeListen) {
        clearTimeout(this.listenTimeout);
        this.lastPresses.push(pressed);
        this.listenTimeout = setTimeout(() => {
            console.info('👂 🔵 Playing button action...', this.lastPresses);
            this.play();
            this.lastPresses.length = 0;
            console.info('-- 👂 🛑 Button action listen end ---');
        }, listenTime);
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
        const monitorPressLen = this.connection.monitor.lastPressed.length;
        const lastPresses = this.lastPresses;
        const isHoldAction = lastPresses.length && monitorPressLen === lastPresses[lastPresses.length - 1].length;
        // prefer events array
        if (this.events) {
            const event = findEventByPresses(this.events, this.lastPresses, isHoldAction);
            if (event) {
                console.log('🔎 ✅ action found by event');
                event.actions.forEach((action) => this.runAction(action));
                return;
            }
        }
        // is button still held?
        if (isHoldAction) {
            const lastHeld = this.connection.monitor.lastPressed;
            const holdAction = this.holdAction(lastHeld);
            if (holdAction) {
                console.info('✋ hold action');
            }
            this.lastPresses.length = 0;
            return holdAction;
        }
        this.action();
    }
    holdAction(lastHeld) {
        const actions = Object.values(this.buttons);
        // prefer events array
        if (this.events) {
            const event = findEventByPresses(this.events, this.lastPresses, true);
            if (event) {
                console.log('🔎 ✅ action found by event');
                event.actions.forEach((action) => this.runAction(action));
                return;
            }
        }
        // fallback on original config style
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
            if (!buttonsMatch(config.buttons, lastHeld)) {
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
            return bestChoice;
        }
    }
    action() {
        const colorCounter = (color) => (all, pressed) => {
            if (pressed.includes(color)) {
                all.push(pressed);
            }
            return all;
        };
        const pressesByButton = this.lastPresses.reduce((all, one) => {
            one.forEach((uno) => {
                all[uno] = this.lastPresses.reduce(colorCounter(uno), []).length;
            });
            return all;
        }, {});
        const configMatches = this.getConfigMatches(pressesByButton);
        // presses action, choose the best match
        const matchedConfig = configMatches.reduce((best, one) => {
            const bestCount = (best === null || best === void 0 ? void 0 : best.buttons.length) || 0;
            return bestCount > one.buttons.length ? best : one;
        }, null);
        if (matchedConfig && matchedConfig.presses) {
            // TODO: Will need unit tests to cover types of presses
            const sourcePressCount = matchedConfig.buttons.reduce((sum, name) => sum + pressesByButton[name], 0);
            const presses = Math.floor(sourcePressCount / matchedConfig.buttons.length);
            let action = matchedConfig.presses[presses - 1];
            action = action || matchedConfig.presses[matchedConfig.presses.length - 1]; // no numbered action
            this.runAction(action);
        }
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
        if (process.env.NO_ACTION) {
            console.warn(`🟧 no action mode`);
            return;
        }
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
            console.info("⬆️  open", action.title, this.pressed);
            return open(action.itemPath || '', action.app);
        }
    }
}
exports.App = App;
function buttonsMatch(buttons0, buttons1) {
    return buttons0.every(button => buttons1.includes(button));
}
function findEventByPresses(events, lastHeldCombo, lookForHold) {
    return events.find(event => {
        if (event.buttons.length !== lastHeldCombo.length) {
            return false; // number of presses don't even match up
        }
        const buttonCombos = [...event.buttons]; // clone so we can maniuplate
        for (const value of lastHeldCombo) {
            // compare next held value
            const comboMatches = buttonCombos.every((buttons, index) => {
                const easyMatch = buttonsMatch(buttons, value);
                if (easyMatch) {
                    return true;
                }
                const isLastCombo = buttonCombos.length === index + 1;
                if (!isLastCombo || !lookForHold) {
                    return false;
                }
                // lookForHold
                return buttons.every(button => {
                    if (value.includes(button)) {
                        return true;
                    }
                    const buttonSplit = button.split(':');
                    if (buttonSplit.length === 1) {
                        return false; // its not a hold request check
                    }
                    const isHold = buttonSplit.pop().toLowerCase() === 'hold';
                    const name = buttonSplit[0];
                    if (isHold && value.includes(name)) {
                        return true;
                    }
                    return false;
                });
            });
            if (!comboMatches) {
                return false;
            }
            return true;
        }
        return true;
    });
}
exports.findEventByPresses = findEventByPresses;
