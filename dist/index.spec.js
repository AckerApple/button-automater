"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const App_class_1 = require("./App.class");
// const controllerPath = process.env.CONTROLLER_PATH || './configs/eg-starts.controller.json'
const actionsPath = process.env.ACTIONS_PATH || './configs/actions/button-config-acker.json';
// const controllerConfig: DeviceProductLayout = require(controllerPath)
const defaultActions = require(actionsPath);
describe('index.spec', () => {
    /*it('constructs', () => {
      const app = new App(controllerConfig, {
        default: defaultActions as any,
        jordi: jordiActions as any,
      })
  
      expect(app).toBeDefined()
    })*/
    it('#findEventByHeld - find', () => {
        const event = App_class_1.findEventByPresses(defaultActions.events, [
            ['green', 'switch'],
            ['green', 'switch'],
            ['green:hold', 'switch'],
        ], true);
        expect(event).toBeDefined();
        expect(event.actions[0].title).toBe('⚡️ transactions dev');
        expect(event.buttons).toBeDefined();
        expect(event.buttons.length).toBe(3);
        expect(event.buttons[0].length).toBe(2);
        expect(event.buttons[1].length).toBe(2);
        expect(event.buttons[0][0]).toBe('green');
        expect(event.buttons[0][1]).toBe('switch');
        expect(event.buttons[1][0]).toBe('green');
        expect(event.buttons[1][1]).toBe('switch');
        expect(event.buttons[2][0]).toBe('green:hold');
        expect(event.buttons[2][1]).toBe('switch');
    });
    it('#findEventByHeld - find correct match amongst several', () => {
        const event = App_class_1.findEventByPresses(defaultActions.events, [
            ['green', 'switch'],
            ['green', 'switch'],
        ], false);
        expect(event).toBeDefined();
        expect(event.actions.length).toBe(1);
        expect(event.actions[0].title).toBe('web ⚡️ transactions 3mp');
        expect(event.buttons).toBeDefined();
        expect(event.buttons.length).toBe(2);
        expect(event.buttons[0].length).toBe(2);
        expect(event.buttons[1].length).toBe(2);
        expect(event.buttons[0][0]).toBe('green');
        expect(event.buttons[0][1]).toBe('switch');
        expect(event.buttons[1][0]).toBe('green');
        expect(event.buttons[1][1]).toBe('switch');
    });
    it('#findEventByHeld - find correct match amongst several', () => {
        const event = App_class_1.findEventByPresses(defaultActions.events, [
            ['green', 'switch'],
            ['green', 'switch'],
            ['green', 'switch'],
        ], false);
        expect(event).toBeDefined();
        expect(event.actions.length).toBe(1);
        expect(event.actions[0].title).toBe('web 💳 payment methods 3mp');
    });
});
