import { TusException } from './tus.exception'

export class HookException extends TusException {
  constructor(hookName: string, error: Error & any) {
    super(
      {
        message: 'Run hook error',
        hook: hookName,
        originalError: error,
        originalErrorName: error.constructor ? error.constructor.name : null,
      },
      error.status || 500,
    )
  }
}
