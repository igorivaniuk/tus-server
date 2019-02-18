import { TusException } from './tus.exception'

export class FileWriteException extends TusException {
  constructor() {
    super('Something went wrong receiving the file', 500)
  }
}
