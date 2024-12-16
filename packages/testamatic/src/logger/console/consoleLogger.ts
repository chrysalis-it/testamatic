import { TestamaticLogger } from "../TestamaticLogger"

export const consoleLogger: TestamaticLogger = {
  info: console.info,
  debug: console.debug,
  warn: console.info,
  trace: console.trace,
  error: console.info,
  child: () => consoleLogger,
  fatal: console.error,
}
