import { inspect } from "util"
import { LogCtxInfoProvider, makePinoLogger } from "./pino.logger"
import {someFixture} from "@chrysalis-it/some-fixture";

describe("pino.logger", () => {
  describe("does log", () => {
    const simpleLogger = makePinoLogger()

    it("a message", () => {
      simpleLogger.info("Hello I am a log message")
    })

    it("an object and message", () => {
      simpleLogger.info("Some important message", { test: "Object logging", version: 100 })
      console.log(inspect({ test: "Object logging", version: 100 }, { depth: null }))
    })
  })

  describe("does log context", () => {
    const ctxProvider: LogCtxInfoProvider = () => ({
      correlationId: someFixture.someUniqueString("correlationId"),
      somethingElse: someFixture.someUniqueString("somethingElse"),
      password: someFixture.someUniqueString("somethingElse"),
    })
    const loggerWithCtx = makePinoLogger(ctxProvider)

    it("and a message", () => {
      loggerWithCtx.info("Hello I have a correlationId")
    })

    it("and a message and an object", () => {
      loggerWithCtx.info("Hello I have a correlationId", {
        hello: "I am an object",
        mynameIs: "Pino",
        nestedObj: { hello: "I am nested" },
      })
    })

    it("redacts top level", () => {
      loggerWithCtx.info("Hello I have a correlationId", {
        hello: "I am an object",
        mynameIs: "Pino",
        nestedObj: { hello: "I am nested" },
        client_secret: "SHOULD BE REDACTED",
      })
    })

    it("redacts recursively level", () => {
      loggerWithCtx.info("Hello I have a correlationId", {
        hello: "I am an object",
        mynameIs: "Pino",
        nestedObj: { hello: "I am nested", password: "SHOULD BE REDACTED" },
      })
    })
  })
})
