import { TusFile } from '../models/tus-file'
import { ConfigStore } from './config-store.interface'

export class MemoryConfigStore implements ConfigStore {
  store = new Map<string, TusFile>()

  async get(id: string) {
    return this.store.get(id)
  }

  async set(id: string, file: TusFile) {
    this.store.set(id, file)
  }

  async clear() {
    this.store.clear()
  }
}
