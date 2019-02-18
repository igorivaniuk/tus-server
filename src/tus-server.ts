import debug from 'debug'
import * as http from 'http'
import { EXPOSED_HEADERS, TUS_RESUMABLE } from './constants'
import { TusException } from './errors/tus.exception'
import { BaseHandler, HandleResult } from './handlers/base.handler'
import { HeadHandler } from './handlers/head.handler'
import { OptionsHandler } from './handlers/options.handler'
import { PatchHandler } from './handlers/patch.handler'
import { PostHandler } from './handlers/post.handler'
import { Hooks } from './hooks'
import { DataStore } from './stores/data-store'
import { RequestValidator } from './validators/request-validator'

const log = debug('tus-server:server')

export interface TusServerConfig {
  dataStore: DataStore
  maxSize?: number
}

export class TusServer<T extends http.IncomingMessage = http.IncomingMessage> {
  readonly handlers: { [method: string]: BaseHandler }

  constructor(private config: TusServerConfig) {
    this.handlers = {
      HEAD: new HeadHandler(config),
      OPTIONS: new OptionsHandler(config),
      PATCH: new PatchHandler(config),
      POST: new PostHandler(config),
    }

    if (typeof config.dataStore.init === 'function') {
      config.dataStore.init().catch(err => console.error('Init store error:', err))
    }
  }

  get hooks() {
    return this.config.dataStore.hooks as Hooks<T>
  }

  /**
   * Main server requestListener, invoked on every 'request' event.
   *
   * @param  {object} req http.IncomingMessage
   * @param  {object} res http.ServerResponse
   */
  handle<T extends http.IncomingMessage = http.IncomingMessage>(
    req: T,
    res: http.ServerResponse,
  ): Promise<void> | void {
    log(`handle: ${req.method} ${req.url}`)

    // Allow overriding the HTTP method. The reason for this is
    // that some libraries/environments to not support PATCH and
    // DELETE requests, e.g. Flash in a browser and parts of Java
    let overrideMethod = req.headers['x-http-method-override']
    if (typeof overrideMethod === 'string') {
      req.method = overrideMethod.toUpperCase()
    }

    // The Tus-Resumable header MUST be included in every request and
    // response except for OPTIONS requests. The value MUST be the version
    // of the protocol used by the Client or the Server.
    res.setHeader('Tus-Resumable', TUS_RESUMABLE)
    if (req.method !== 'OPTIONS' && req.headers['tus-resumable'] === undefined) {
      res.writeHead(412, 'Precondition Failed')
      return res.end('Tus-Resumable Required\n')
    }

    // Validate all required headers to adhere to the tus protocol
    const invalidHeaders = []
    for (const headerName in req.headers) {
      if (req.method === 'OPTIONS') {
        break
      }

      if (RequestValidator.isInvalidHeader(headerName, req.headers[headerName] as string)) {
        log(`Invalid ${headerName} header: ${req.headers[headerName]}`)
        invalidHeaders.push(headerName)
      }
    }

    if (invalidHeaders.length > 0) {
      // The request was not configured to the tus protocol
      res.writeHead(412, 'Precondition Failed')
      return res.end(`Invalid ${invalidHeaders.join(' ')}\n`)
    }

    // Enable CORS
    res.setHeader('Access-Control-Expose-Headers', EXPOSED_HEADERS)
    if (req.headers.origin) {
      res.setHeader('Access-Control-Allow-Origin', req.headers.origin)
    }

    // Invoke the handler for the method requested
    let handler = this.handlers[req.method!] as BaseHandler
    if (handler) {
      return handler
        .handle(req)
        .then(result => this.writeResult(res, result))
        .catch(err => this.writeError(res, err))
    }

    // 404 Anything else
    res.writeHead(404, {})
    res.write('Not found\n')
    return res.end()
  }

  writeError(res: http.ServerResponse, error: any) {
    log(`writeError`)
    if (error instanceof TusException) {
      let response = error.getResponse()
      if (typeof response === 'string') {
        res.writeHead(error.getStatus(), {
          'Content-Type': 'text/plain',
        })
        return res.end(response)
      }
      try {
        let body = JSON.stringify(response)
        res.writeHead(error.getStatus(), {
          'Content-Type': 'application/json',
        })
        res.end(body)
      } catch (e) {
        log('stringify error', e)
        res.writeHead(500, {
          'Content-Type': 'text/plain',
        })
        res.end('Server error')
      }
      return
    }

    log('[ERROR]', error)

    res.writeHead(500)
    res.end()
  }

  writeResult(res: http.ServerResponse, result: HandleResult) {
    log(`writeResult`)
    const headers: any = {}
    for (const key of Array.from(result.headers.keys())) {
      headers[key] = result.headers.get(key)
    }
    if (result.body) {
      headers['Content-Length'] = result.body.length
    }

    res.writeHead(result.statusCode, headers)
    if (result.body) {
      res.write(result.body)
    }
    return res.end()
  }

  listen() {
    const server = http.createServer((req, res) => this.handle(req, res))
    return server.listen.apply(server, arguments as any)
  }
}
