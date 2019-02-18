import { TusException } from './tus.exception'

export class NotFoundException extends TusException {

  constructor() {
    super('The file for this url was not found', 404)
  }

}
