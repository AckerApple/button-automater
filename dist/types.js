"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ActionConfig = exports.Actions = void 0;
var Actions;
(function (Actions) {
    Actions["CHANGE_NEXT_CONFIG"] = "change-next-config";
})(Actions = exports.Actions || (exports.Actions = {}));
class ActionConfig {
    constructor(buttons) {
        this.buttons = buttons;
    }
}
exports.ActionConfig = ActionConfig;
