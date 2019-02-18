import { TusFile } from './models/tus-file'
import * as debug from 'debug'
const log = debug('tus-server:hooks')

export enum HookType {
  BeforeCreate = 'beforeCreate',
  AfterCreate = 'afterCreate',
  AfterComplete = 'afterComplete',
}

export class Hooks<T> {
  private _hooks = {
    [HookType.BeforeCreate]: [] as any[],
    [HookType.AfterCreate]: [] as any[],
    [HookType.AfterComplete]: [] as any[],
  }

  beforeCreate(fn: (req: T) => Promise<any>) {
    this._hooks[HookType.BeforeCreate].push(fn)
  }

  afterCreate(fn: (file: TusFile, req: T) => Promise<any>) {
    this._hooks[HookType.AfterCreate].push(fn)
  }

  afterComplete(fn: (file: TusFile, req: T) => Promise<any>) {
    this._hooks[HookType.AfterComplete].push(fn)
  }

  async run(type: HookType, ...args: any[]) {
    log('run', type)
    for(let fn of this._hooks[type]) {
      await fn(...args)
    }
  }
}
