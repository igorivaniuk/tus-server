import { TusException } from './tus.exception'

export class InvalidOffsetException extends TusException {
  constructor() {
    super('Upload-Offset conflict', 409)
  }

}
