import * as http from 'http'
import { TusServerConfig } from '../tus-server'

export interface HandleResult {
  headers: Map<string, string>,
  body?: string,
  statusCode: number;
}

export abstract class BaseHandler {
  constructor(protected config: TusServerConfig) {

  }

  get store() {
    return this.config.dataStore
  }

  abstract handle(req: http.IncomingMessage): Promise<HandleResult>;

  /**
   * Extract the file id from the request
   */
  getFileIdFromRequest(req: http.IncomingMessage) {
    return req.url!.split('/').pop()
  }
}
