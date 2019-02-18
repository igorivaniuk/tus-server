// process.env.DEBUG = 'tus*'
import { exec } from 'child_process'
import * as fs from 'fs'
import * as http from 'http'
import { Server } from 'http'
import * as path from 'path'
import * as request from 'supertest'
import { TUS_RESUMABLE } from '../src/constants'
import { TusException } from '../src/errors/tus.exception'
import { TusFile } from '../src/models/tus-file'
import { FileStore } from '../src/stores/file-store'
import { TusServer } from '../src/tus-server'

const TEST_FILE_SIZE = 960244
const MAX_SIZE = TEST_FILE_SIZE + 100
const TEST_FILE_PATH = path.resolve(__dirname, 'test.mp4')
const TEST_METADATA = 'some data, for you'

describe('Upload', () => {
  let agent: request.SuperTest<request.Test>
  let tus: TusServer
  let app: Server
  let fileStore: FileStore
  beforeEach(async () => {
    fileStore = new FileStore({
      directory: '/tmp/tus',
      expiration: 24 * 3600,
    })
    tus = new TusServer({
      dataStore: fileStore,
      maxSize: MAX_SIZE,
    })
    app = tus.listen()
    agent = request.agent(app)
  })

  afterEach(done => {
    exec(`rm -r /tmp/tus`, err => {
      if (err) {
        return done(err)
      }

      return done()
    })
    app.close()
  })

  describe('OPTIONS', () => {
    it('should return server config', async () => {
      let res: any = await agent.options(`/`).set('Tus-Resumable', TUS_RESUMABLE)
      expect(res.headers).toMatchSnapshot({
        date: expect.any(String),
      })
    })
  })

  describe('HEAD', () => {
    let file: TusFile
    beforeEach(async () => {
      file = await fileStore.create({
        headers: {
          'upload-length': 100,
          'upload-metadata': 'test test',
        },
      } as any)
    })

    it('should return 404 for', async () => {
      let res = await agent.head('/blablabla').set('Tus-Resumable', TUS_RESUMABLE)
      expect(res.status).toBe(404)
    })

    it('tus version', async () => {
      let res = await agent.head('/blablabla').set('Tus-Resumable', TUS_RESUMABLE).set('Tus-Version', '0.2.2')
      expect(res.status).toBe(412)
    })

    it('the Upload-Defer-Length value MUST be 1', async () => {
      let res = await agent.head('/blablabla').set('Tus-Resumable', TUS_RESUMABLE).set('Upload-Defer-Length', '1234')
      expect(res.status).toBe(412)
    })

    it('should return a starting offset, metadata for the new file', async () => {
      let res = await agent.head(`/uploads/${file.id}`).set('Tus-Resumable', TUS_RESUMABLE)
      expect(res.status).toBe(200)
      expect(res.get('tus-resumable')).toBe(TUS_RESUMABLE)
      expect(res.get('upload-offset')).toBe('0')
      expect(res.get('upload-length')).toBe('100')
      expect(res.get('upload-metadata')).toBe('test test')
    })

    it('should return 410 Gone for the file that has been deleted', async () => {
      fs.unlinkSync(fileStore.filePath(file.id))
      let res = await agent.head(`/uploads/${file.id}`).set('Tus-Resumable', TUS_RESUMABLE)
      expect(res.status).toBe(410)
      expect(res.header['tus-resumable']).toBe(TUS_RESUMABLE)
    })

    it('should return 404 for the file that has been deleted and no config', async () => {
      fs.unlinkSync(fileStore.filePath(file.id))
      await fileStore.configStore.clear()
      let res = await agent.head(`/uploads/${file.id}`).set('Tus-Resumable', TUS_RESUMABLE)
      expect(res.status).toBe(404)
      expect(res.header['tus-resumable']).toBe(TUS_RESUMABLE)
    })
  })

  describe('POST', () => {
    it('should response with 201', async () => {
      let res = await agent
        .post('/uploads/')
        .set('Tus-Resumable', TUS_RESUMABLE)
        .set('Upload-Length', String(TEST_FILE_SIZE))
        .set('Upload-Metadata', TEST_METADATA)

      expect(res.status).toBe(201)
      expect(res.header['location']).toMatch(
        /^\/uploads\/[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89aAbB][a-f0-9]{3}-[a-f0-9]{12}$/,
      )
      expect(res.header['tus-resumable']).toBe(TUS_RESUMABLE)
    })

    it('should response with 413 if max file size', async () => {
      let res = await agent
        .post('/uploads/')
        .set('Tus-Resumable', TUS_RESUMABLE)
        .set('Upload-Length', String(MAX_SIZE + 100))
        .set('Upload-Metadata', TEST_METADATA)
      expect(res.status).toBe(413)
      expect(res.text).toBe('Request Entity Too Large')
    })

    it('should response with 412 empty upload-length', async () => {
      let res = await agent.post('/uploads/').set('Tus-Resumable', TUS_RESUMABLE)
      expect(res.status).toBe(412)
      expect(res.text).toBe('Upload-Length or Upload-Defer-Length header required')
    })

    it('should response with hook error', async () => {
      tus.hooks.beforeCreate(async (req: any) => {
        throw new TusException('Bad request', 400)
      })
      let res = await agent
        .post('/uploads/')
        .set('Tus-Resumable', TUS_RESUMABLE)
        .set('Upload-Length', String(TEST_FILE_SIZE))
        .set('Upload-Metadata', TEST_METADATA)
      expect(res.status).toBe(400)
      expect(res.text).toBe('Bad request')
    })

    it('should response with hook error 1', async () => {
      tus.hooks.afterCreate(async (req: any) => {
        throw new TusException('Bad request', 401)
      })
      let res = await agent
        .post('/uploads/')
        .set('Tus-Resumable', TUS_RESUMABLE)
        .set('Upload-Length', String(TEST_FILE_SIZE))
        .set('Upload-Metadata', TEST_METADATA)
      expect(res.status).toBe(401)
      expect(res.text).toBe('Bad request')
    })
  })

  describe('PATCH', () => {
    it('should 404 paths without a file id', done => {
      agent
        .patch(`/uploads/`)
        .set('Tus-Resumable', TUS_RESUMABLE)
        .set('Upload-Offset', '0')
        .set('Content-Type', 'application/offset+octet-stream')
        .expect(404)
        .expect('Tus-Resumable', TUS_RESUMABLE)
        .end(done)
    })

    it('should 403 missing header Upload-Offset', done => {
      agent
        .patch(`/uploads/dont_exist`)
        .set('Tus-Resumable', TUS_RESUMABLE)
        .set('Content-Type', 'application/offset+octet-stream')
        .expect(403)
        .expect('Tus-Resumable', TUS_RESUMABLE)
        .end(done)
    })

    it('should 403 missing header Content-Type', done => {
      agent
        .patch(`/uploads/dont_exist`)
        .set('Tus-Resumable', TUS_RESUMABLE)
        .set('Upload-Offset', '0')
        .expect(403)
        .expect('Tus-Resumable', TUS_RESUMABLE)
        .end(done)
    })

    it('should 404 paths that do not exist', done => {
      agent
        .patch(`/uploads/dont_exist`)
        .set('Tus-Resumable', TUS_RESUMABLE)
        .set('Upload-Offset', '0')
        .set('Content-Type', 'application/offset+octet-stream')
        .expect(404)
        .expect('Tus-Resumable', TUS_RESUMABLE)
        .end(done)
    })

    it('should upload the file', async () => {
      let spy = jest.fn()
      tus.hooks.afterComplete(spy)
      let res = await agent
        .post('/uploads')
        .set('Tus-Resumable', TUS_RESUMABLE)
        .set('Upload-Length', String(TEST_FILE_SIZE))
        .set('Upload-Metadata', TEST_METADATA)

      expect(res.status).toBe(201)
      let fileId = res.header['location'].split('/').pop()

      const read_stream = fs.readFileSync(TEST_FILE_PATH)
      const write_stream = agent
        .patch(`/uploads/${fileId}`)
        .set('Tus-Resumable', TUS_RESUMABLE)
        .set('Upload-Offset', '0')
        .set('Content-Type', 'application/offset+octet-stream')

      let res2 = await new Promise<any>((resolve, reject) => {
        write_stream.on('response', res => {
          resolve(res)
        })
        write_stream.on('error', reject)

        write_stream.write(read_stream)
        write_stream.end(() => {})
      })

      expect(res2.status).toBe(204)
      expect(res2.headers['tus-resumable']).toBe(TUS_RESUMABLE)
      expect(res2.headers['upload-offset']).toBe(String(TEST_FILE_SIZE))
      expect(spy).toBeCalled()
      expect(spy).toBeCalledTimes(1)
    })
  })
})
