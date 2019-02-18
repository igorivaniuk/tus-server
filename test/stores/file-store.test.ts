import { InvalidLengthException } from '../../src/errors/invalid-length.exception'
import { TusException } from '../../src/errors/tus.exception'
import { FileStore } from '../../src/stores/file-store'

describe('FileStore', () => {
  it('should throw exception', () => {
    try {
      new FileStore({})
      expect('throw').toBe(true)
    } catch (e) {
      expect(e).toBeInstanceOf(TusException)
      expect(e.message).toBe('Bed file store config')
    }
  })

  it('should create with path', () => {
    let inst = new FileStore({ path: '/tmp/user/' })
    expect(inst.directory).toBe('tmp/user/')
  })

  it('should empty extensions', () => {
    let inst = new FileStore({ path: '/tmp/user/' })
    inst._extensions = []
    expect(inst.extensions).toBe(null)
  })

  it('should create file', async () => {
    let inst = new FileStore({ path: '/tmp/user/' })
    await expect(inst.create({ headers: {} } as any)).rejects.toBeInstanceOf(InvalidLengthException)
  })
})
