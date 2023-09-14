import pino, { stdTimeFunctions } from "pino"
import { StructuredLogger } from "./StructuredLogger"
import { StructuredPinoLogger } from "./StructuredPinoLogger"

export type LogCtxInfoProvider = () => object
const nullLogCtxProvider: LogCtxInfoProvider = () => ({})

export type RedactionDictionaryProvider = () => Array<string>

const defaultRedactionDictionaryProvider: RedactionDictionaryProvider = () => [
  "authorization",
  "access_token",
  "client_secret",
  "password",
  "secret",
  "token",
]

export const makePinoLogger = (
  fetchReqInfo: LogCtxInfoProvider = nullLogCtxProvider,
  fetchRedactionDictionary: RedactionDictionaryProvider = defaultRedactionDictionaryProvider
): StructuredLogger =>
  new StructuredPinoLogger(
    pino({
      level: process.env["LOG_LEVEL"] || "debug",
      nestedKey: "data",
      timestamp: stdTimeFunctions.isoTime,
      formatters: {
        level: (label) => {
          return { level: label.toUpperCase() }
        },
      },
      mixin() {
        return fetchReqInfo()
      },
      // transport: {
      //   target: "pino-pretty",
      //   options: {
      //     ignore: "pid,hostname",
      //     singleLine: false,
      //     colorize: true,
      //     translateTime: "yyyy-mm-ddHH:MM:ss:ms",
      //   },
      // },
      redact: {
        paths: fetchRedactionDictionary(),
        censor: "******",
      },
    })
  )
