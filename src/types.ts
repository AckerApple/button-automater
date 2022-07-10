
export enum Actions {
  CHANGE_NEXT_CONFIG = 'change-next-config'
}

export interface Action {
  action?: Actions
  keyboardType?: string
  keyTaps?: string[] | string
  itemPath?: string
  title: string
  app?: any
}

export class ActionConfig {
  press?: Action // fire action the moment button is pressed
  presses?: Action[]
  releases?: Action[]
  hold?: Action

  constructor(public buttons: string[]) {}
}

export interface ButtonsEvent {
  buttons: string[][]
  actions: Action[]
}

export interface ButtonActionsConfig {
  events: ButtonsEvent[]
  // 7-10-2022: below deprecated
  [name: string]: ActionConfig | ButtonsEvent[]
}

export interface BestAction {
  action:Action
  config: ActionConfig
  actionType: 'press' | 'presses' | 'hold' | string
}