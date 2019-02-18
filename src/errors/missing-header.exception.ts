import { TusException } from './tus.exception'

export class MissingHeaderException extends TusException {
  constructor(headerName: string) {
    super(`${headerName} header required`, 403)
  }
}
