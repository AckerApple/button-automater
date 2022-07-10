"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const App_class_1 = require("./App.class");
const jordiActions = require("./configs/actions/jordi-config.json");
const controllerPath = process.env.CONTROLLER_PATH || './configs/eg-starts.controller.json';
const actionsPath = process.env.ACTIONS_PATH || './configs/actions/button-config-acker.json';
if (process.env.NO_ACTION) {
    console.warn('🟧 no action mode');
}
console.log('⚙️ Using configs', {
    controllerPath,
    actionsPath
});
const controllerConfig = require(controllerPath);
const defaultActions = require(actionsPath);
// import { DeviceProductLayout } from "usb-support/dist/typings";
console.info('⏳ starting app');
try {
    new App_class_1.App(controllerConfig, {
        default: defaultActions,
        jordi: jordiActions,
    });
    console.info('🟢 app started');
    setInterval(() => console.info('👂 listening...'), 60000 * 2); // every two minutes, keep the process alive
}
catch (err) {
    console.error('🔴 Failed to start app', err);
}
function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
