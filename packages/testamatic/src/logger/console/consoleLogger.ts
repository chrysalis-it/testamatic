import { StructuredLogger } from "../StructuredLogger"

export const consoleLogger: StructuredLogger = {
  info: console.info,
  debug: console.debug,
  warn: console.info,
  trace: console.trace,
  error: console.info,
  child: () => consoleLogger,
  fatal: console.error,
}
