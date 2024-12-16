import { Logger } from "pino"
import { StructuredLogger } from "../StructuredLogger"

export class StructuredPinoLogger implements StructuredLogger {
  private localPino: Logger

  constructor(localPino: Logger) {
    this.localPino = localPino
  }

  fatal(message: string, data: object) {
    data ? this.localPino.fatal(data, message) : this.localPino.fatal(message)
  }

  error(message: string, error: unknown) {
    error ? this.localPino.error(error, message) : this.localPino.error(message)
  }

  warn(message: string, data?: object) {
    data ? this.localPino.warn(data, message) : this.localPino.warn(message)
  }

  info(message: string, data?: object) {
    data ? this.localPino.info(data, message) : this.localPino.info(message)
  }

  debug(message: string, data?: object) {
    data ? this.localPino.debug(data, message) : this.localPino.debug(message)
  }

  trace(message: string, data?: object) {
    data ? this.localPino.trace(data, message) : this.localPino.trace(message)
  }

  child(data: object) {
    return new StructuredPinoLogger(this.localPino.child(data))
  }
}
