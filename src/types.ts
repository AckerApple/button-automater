
export enum Actions {
  CHANGE_NEXT_CONFIG = 'change-next-config'
}

export interface Action {
  action?: Actions
  keyboardType?: string
  keyTaps?: string[]
  itemPath?: string
  title: string
  app?: any
}

export class ActionConfig {
  press?: Action // fire action the moment button is pressed
  presses?: Action[]
  hold?: Action

  constructor(public buttons: string[]) {}
}
