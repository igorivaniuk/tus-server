import * as http from 'http'
import { ALLOWED_HEADERS, ALLOWED_METHODS, MAX_AGE, TUS_VERSION } from '../constants'
import { BaseHandler, HandleResult } from './base.handler'

export class OptionsHandler extends BaseHandler {

  async handle(req: http.IncomingMessage): Promise<HandleResult> {
    let headers = new Map<string, string>()

    // Preflight request
    headers.set('Access-Control-Allow-Methods', ALLOWED_METHODS);
    headers.set('Access-Control-Allow-Headers', ALLOWED_HEADERS);

    headers.set('Access-Control-Max-Age', String(MAX_AGE));
    headers.set('Tus-Version', TUS_VERSION.join(','))

    if (this.store.extensions) {
      headers.set('Tus-Extension', this.store.extensions);
    }

    if(this.config.maxSize) {
      headers.set('Tus-Max-Size', String(this.config.maxSize))
    }

    return {
      statusCode: 204,
      headers
    }
  }

}
