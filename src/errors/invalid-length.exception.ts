import { TusException } from './tus.exception'

export class InvalidLengthException extends TusException {
  constructor() {
    super('Upload-Length or Upload-Defer-Length header required', 412)
  }
}
