import * as http from 'http'
import { parse } from 'url'
import { InvalidLengthException } from '../errors/invalid-length.exception'
import { TusException } from '../errors/tus.exception'
import { BaseHandler, HandleResult } from './base.handler'

export class PostHandler extends BaseHandler {
  async handle(req: http.IncomingMessage & { originalUrl?: string }): Promise<HandleResult> {
    let headers = new Map<string, string>()
    const uploadLength = req.headers['upload-length']

    if (uploadLength === undefined || isNaN(+uploadLength)) {
      throw new InvalidLengthException()
    }

    if (this.config.maxSize && +uploadLength > this.config.maxSize) {
      throw new TusException('Request Entity Too Large', 413)
    }

    let file = await this.store.create(req)

    let { pathname } = parse(req.originalUrl || req.url!)
    if (!pathname) {
      throw new TusException('Bad url')
    }

    const url = `${pathname}${pathname.endsWith('/') ? '' : '/'}${file.id}`

    headers.set('Location', url)

    if (this.config.dataStore.expiration) {
      let expiresAt = file.getExpiredAt(this.config.dataStore.expiration)
      headers.set('Upload-Expires', expiresAt.toUTCString())
    }

    return {
      statusCode: 201,
      headers,
    }
  }
}
