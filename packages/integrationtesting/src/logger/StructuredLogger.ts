export interface StructuredLogger {
  fatal(message: string, data: object): void

  error(message: string, error: unknown): void

  warn(message: string, data?: object): void

  info(message: string, data?: object): void

  debug(message: string, data?: object): void

  trace(message: string, data?: object): void

  child(data: object): StructuredLogger
}
