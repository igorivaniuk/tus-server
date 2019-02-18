import * as debug from 'debug'
import * as fs from 'fs'
import * as http from 'http'
import { ConfigStore } from '../config-stores/config-store.interface'
import { MemoryConfigStore } from '../config-stores/memory-config-store'
import { FileNoLongerExistsException } from '../errors/file-no-longer-exists.exception'
import { FileWriteException } from '../errors/file-write.exception'
import { NotFoundException } from '../errors/not-found.exception'
import { TusException } from '../errors/tus.exception'
import { TusFile } from '../models/tus-file'
import { BytesWritten, DataStore, DataStoreOptions } from './data-store'

const log = debug('tus-server:file-store')
const MASK = '0777'
const IGNORED_MKDIR_ERROR = 'EEXIST'
const FILE_DOESNT_EXIST = 'ENOENT'

export interface FileStoreOptions extends DataStoreOptions {
  directory?: string
  path?: string
  configStore?: ConfigStore
  // time in seconds
  expiration?: number
}

export class FileStore<T extends http.IncomingMessage = http.IncomingMessage> extends DataStore<T> {
  _extensions = ['creation']
  directory: string
  configStore: ConfigStore

  // default 0 - is disabled
  expiration = 0

  constructor(options: FileStoreOptions) {
    super(options)
    if (!options.path && !options.directory) {
      throw new TusException('Bed file store config')
    }

    this.directory = options.directory || options.path!.replace(/^\//, '')
    this.configStore = options.configStore || new MemoryConfigStore()

    if (options.expiration) {
      this.expiration = options.expiration
      this._extensions.push('expiration')
    }
  }

  async init(): Promise<void> {
    await this._checkOrCreateDirectory()
  }

  /**
   *  Ensure the directory exists.
   */
  _checkOrCreateDirectory() {
    return new Promise((resolve, reject) => {
      fs.mkdir(this.directory, MASK, error => {
        if (error && error.code !== IGNORED_MKDIR_ERROR) {
          return reject(error)
        }
        resolve()
      })
    })
  }

  filePath(fileId: string) {
    return `${this.directory}/${fileId}`
  }

  /**
   * Create an empty file.
   *
   */
  async create(req: T) {
    log('create')
    await this.beforeCreate(req)

    const file = await this.createFile(req)
    await this.touch(file)
    await this.configStore.set(file.id, file)

    await this.afterCreate(file, req)
    return file
  }

  async touch(file: TusFile) {
    let fd = await fs.promises.open(this.filePath(file.id), 'w')
    await fd.close()
  }

  /**
   * Write to the file, starting at the provided offset
   *
   * @param  {object} req http.IncomingMessage
   * @param  {string} fileId   Name of file
   * @param  {number} offset   starting offset
   * @return {Promise}
   */
  async write(req: T, fileId: string, offset: number) {
    const path = this.filePath(fileId)
    const config = await this.configStore.get(fileId)
    const options = {
      flags: 'r+',
      start: offset,
    }
    let newOffset = 0

    const stream = fs.createWriteStream(path, options)
    req.on('data', buffer => {
      newOffset += buffer.length
    })

    return new Promise<number>((resolve, reject) => {
      stream.on('error', e => {
        log('[FileStore] write: Error', e)
        reject(new FileWriteException())
      })

      req.pipe(stream).on('finish', () => {
        log(`[FileStore] write: ${newOffset} bytes written to ${path}`)
        offset += newOffset
        log(`[FileStore] write: File is now ${offset} bytes`)

        if (config && config.uploadLength === offset) {
          return this.afterComplete(config, req)
            .then(() => resolve(offset))
            .catch(reject)
        }
        resolve(offset)
      })
    })
  }

  /**
   * Return file stats, if they exits
   *
   * @param  {string} fileId name of the file
   * @return {object}           fs stats
   */
  async getOffset(fileId: string): Promise<BytesWritten> {
    const filePath = this.filePath(fileId)
    const config = await this.configStore.get(fileId)
    if (!config) {
      throw new NotFoundException()
    }

    return new Promise<BytesWritten>((resolve, reject) => {
      fs.stat(filePath, (error, stats) => {
        if (error && error.code === FILE_DOESNT_EXIST && config) {
          log(`[FileStore] getOffset: No file found at ${filePath} but db record exists`, config)
          return reject(new FileNoLongerExistsException())
        }

        if (error) {
          return reject(error)
        }

        if (stats.isDirectory()) {
          log(`[FileStore] getOffset: ${filePath} is a directory`)
          return reject(new NotFoundException())
        }

        return resolve({
          size: stats.size,
          upload_length: config.uploadLength,
          upload_defer_length: config.uploadDeferLength,
          upload_metadata: config.uploadMetadata,
        })
      })
    })
  }
}
