export const REQUEST_METHODS = ['POST', 'HEAD', 'PATCH', 'OPTIONS']

export const HEADERS = [
  'Authorization',
  'Content-Type',
  'Location',
  'Tus-Extension',
  'Tus-Max-Size',
  'Tus-Resumable',
  'Tus-Version',
  'Upload-Defer-Length',
  'Upload-Length',
  'Upload-Metadata',
  'Upload-Offset',
  'X-HTTP-Method-Override',
  'X-Requested-With',
]

export const HEADERS_LOWERCASE = HEADERS.map(header => header.toLowerCase())

export const ALLOWED_HEADERS = HEADERS.join(', ')
export const ALLOWED_METHODS = REQUEST_METHODS.join(', ')
export const EXPOSED_HEADERS = HEADERS.join(', ')
export const MAX_AGE = 86400
export const TUS_RESUMABLE = '1.0.0'
export const TUS_VERSION = ['1.0.0']
