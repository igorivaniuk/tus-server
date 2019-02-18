import { TusFile } from '../../src/models/tus-file'

describe('TusFile', () => {
  it('should throw error on empty file id', () => {
    try {
      new (TusFile as any)(undefined as any)
      expect('to be error').toBe('err')
    } catch (e) {
      expect(e.message).toBe('[TusFile] constructor must be given a fileId')
    }
  })

  it('should throw error on upload length', () => {
    try {
      new (TusFile as any)('dd')
      expect('to be error').toBe('err')
    } catch (e) {
      expect(e.message).toBe('[TusFile] constructor must be given either a uploadLength or uploadDeferLength')
    }
  })
})
