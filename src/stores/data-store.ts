import debug from 'debug'
import * as http from 'http'
import * as uuid from 'uuid'
import { InvalidLengthException } from '../errors/invalid-length.exception'
import { Hooks, HookType } from '../hooks'
import { TusFile } from '../models/tus-file'

const log = debug('tus-server:stores')

export interface BytesWritten {
  size: number
  upload_length: number
  upload_defer_length?: number
  upload_metadata?: string
}

export interface DataStoreOptions {
  namingFunction?: (req: http.IncomingMessage) => string
}

export abstract class DataStore<T extends http.IncomingMessage = http.IncomingMessage> {
  _extensions: string[] = []

  options: Required<DataStoreOptions>

  expiration = 0

  readonly hooks = new Hooks<T>()

  constructor(options: DataStoreOptions) {
    this.options = {
      ...options,
      namingFunction: () => uuid.v4(),
    }
  }

  get extensions() {
    if (this._extensions.length === 0) {
      return null
    }
    return this._extensions.join()
  }

  async beforeCreate(req: T) {
    await this.hooks.run(HookType.BeforeCreate, req)
  }

  async afterCreate(file: TusFile, req: T) {
    await this.hooks.run(HookType.AfterCreate, file, req)
  }

  async afterComplete(file: TusFile, req: T) {
    await this.hooks.run(HookType.AfterComplete, file, req)
  }

  async createFile(req: T) {
    log('[DataStore] create')
    const uploadLength = req.headers['upload-length']
    // const uploadDeferLength = req.headers['upload-defer-length']
    const uploadMetadata = req.headers['upload-metadata'] as string

    if (uploadLength === undefined) {
      throw new InvalidLengthException()
    }

    const fileId = this.options.namingFunction(req)
    return new TusFile(fileId, +uploadLength!, 0, uploadMetadata)
  }

  abstract async init?(): Promise<void>;

  /**
   * Called in POST requests. This method just creates a
   * file, implementing the creation extension.
   *
   * http://tus.io/protocols/resumable-upload.html#creation
   *
   * @param  {object} req http.incomingMessage
   * @return {Promise}
   */
  abstract async create(req: T): Promise<TusFile>
  /**
   * Called in PATCH requests. This method should write data
   * to the DataStore file, and possibly implement the
   * concatenation extension.
   *
   * http://tus.io/protocols/resumable-upload.html#concatenation
   *
   */
  abstract async write(req: T, fileId: string, offset: number): Promise<number>

  /**
   * Called in HEAD requests. This method should return the bytes
   * writen to the DataStore, for the client to know where to resume
   * the upload.
   *
   */
  abstract async getOffset(fileId: string): Promise<BytesWritten>
}
