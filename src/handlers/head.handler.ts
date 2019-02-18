import * as http from 'http'
import { BaseHandler, HandleResult } from './base.handler'

export class HeadHandler extends BaseHandler {
  /**
   * Send the bytes received for a given file.
   *
   */
  async handle(req: http.IncomingMessage): Promise<HandleResult> {
    const fileId = this.getFileIdFromRequest(req);

    let file = await this.store.getOffset(fileId!);

    let headers = new Map<string, string>()

    // The Server MUST prevent the client and/or proxies from
    // caching the response by adding the Cache-Control: no-store
    // header to the response.
    headers.set('Cache-Control', 'no-store');

    // The Server MUST always include the Upload-Offset header in
    // the response for a HEAD request, even if the offset is 0
    headers.set('Upload-Offset', String(file.size));

    if (file.upload_length !== undefined) {
      // If the size of the upload is known, the Server MUST include
      // the Upload-Length header in the response.
      headers.set('Upload-Length', String(file.upload_length));
    }

    if (file.upload_metadata !== undefined) {
      headers.set('Upload-Metadata', file.upload_metadata);
    }
    return {
      statusCode: 200,
      headers
    }
  }
}
