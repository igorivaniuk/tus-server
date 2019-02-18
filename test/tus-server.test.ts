import { FileStore } from '../src/stores/file-store'
import { TusServer } from '../src/tus-server'

describe('TusServer', () => {
  it('should config data store', () => {
    let tus = new TusServer({
      dataStore: new FileStore({
        directory: '/tmp/tus'
      })
    })
  })
})
