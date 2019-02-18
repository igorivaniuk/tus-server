import { TusFile } from '../models/tus-file'

export interface ConfigStore {
  get(id: string): Promise<TusFile|undefined>
  set(id: string, file: TusFile): Promise<void>
  clear(): Promise<void>
}
