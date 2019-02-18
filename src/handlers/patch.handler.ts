import * as http from 'http'
import { InvalidOffsetException } from '../errors/invalid-offset.exception'
import { MissingHeaderException } from '../errors/missing-header.exception'
import { BaseHandler, HandleResult } from './base.handler'
import debug from 'debug'
const log = debug('tus-server:path-handler')

export class PatchHandler extends BaseHandler {
  async handle(req: http.IncomingMessage): Promise<HandleResult> {
    let headers = new Map<string, string>()
    const fileId = this.getFileIdFromRequest(req)

    // The request MUST include a Upload-Offset header
    let _offset = req.headers['upload-offset'] as string | undefined
    if (_offset === undefined) {
      throw new MissingHeaderException('Upload-Offset')
    }

    // The request MUST include a Content-Type header
    const contentType = req.headers['content-type']
    if (contentType === undefined) {
      throw new MissingHeaderException('Content-Type')
    }

    let offset = parseInt(_offset, 10)

    let file = await this.store.getOffset(fileId!)

    if (file.size !== offset) {
      // If the offsets do not match, the Server MUST respond with the 409 Conflict status without modifying the upload resource.
      log(`[PatchHandler] send: Incorrect offset - ${offset} sent but file is ${file.size}`)
      throw new InvalidOffsetException()
    }

    let newOffset = await this.store.write(req, fileId!, offset)

    headers.set('Upload-Offset', String(newOffset))
    return {
      statusCode: 204,
      headers,
    }
  }
}
