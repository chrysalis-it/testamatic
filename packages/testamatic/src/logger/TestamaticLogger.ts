export interface TestamaticLogger {
  fatal(message: string, data?: object): void

  error(message: string, error: unknown): void

  warn(message: string, data?: object): void

  info(message: string, data?: object): void

  debug(message: string, data?: object): void

  trace(message: string, data?: object): void

  child(name: string, data?: object): TestamaticLogger
}
