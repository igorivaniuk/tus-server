import { TusException } from './tus.exception'

export class FileNoLongerExistsException extends TusException {
  constructor() {
    super('The file for this url no longer exists', 410)
  }
}
