import { Server } from "http"
import Koa from "koa"
import bodyParser from "koa-bodyparser"
import sslify from "koa-sslify"
import { MatchInfo } from "../MockHttpExpectation"
import { MockConfig, MockTcpListener, MockTcpListenerFactory, TCPConfig } from "../MockHttpServer"

export const koaTcpListenerFactory: MockTcpListenerFactory = (tcpConfig: TCPConfig, mockConfig: MockConfig) =>
  new Promise<MockTcpListener>((resolve, reject) => {
    const koa = new Koa()
    koa.use(sslify({ resolver: () => true }))
    koa.use(bodyParser())
    koa.use(requestHandlerMaker(mockConfig))
    const onUrl = `${tcpConfig.protocol}://${tcpConfig.host}:${tcpConfig.port}`
    try {
      const server = koa.listen(
        {
          port: tcpConfig.port,
          host: tcpConfig.host,
        },
        () => {
          console.log(`🚀 ${mockConfig.mockServerName} mock http server listening on ${onUrl}`)
          resolve({ onUrl, close: closeTcpListenerMaker(mockConfig.mockServerName, onUrl, server) })
        }
      )
    } catch (err) {
      reject(err)
    }
  })

const requestHandlerMaker = (mockConfig: MockConfig) => async (ctx: Koa.Context) => {
  const matchCtx: MatchInfo = {
    method: ctx.request.method.toLowerCase(),
    body: ctx.request.body as object,
    url: ctx.url,
    headers: ctx.headers,
  }
  console.info(`${mockConfig.mockServerName} Mock Server has received a request`, matchCtx)
  const nextExpectation = mockConfig.getApplicableExpectation(matchCtx)
  if (!nextExpectation) {
    mockConfig.registerFailure({
      ctx: matchCtx,
      failure: "No remaining expectations",
    })
    return
  }
  const matchResult = nextExpectation.matches(matchCtx)

  if (matchResult.passed()) {
    ctx.body = nextExpectation.response.body
    ctx.status = nextExpectation.response.status
    ctx.statusText = nextExpectation.response.statusText
  } else {
    ctx.status = 400
    ctx.statusText = "Expectation did not match"
    mockConfig.registerFailure({ expectation: nextExpectation, ctx, failure: matchResult })
  }
}

const closeTcpListenerMaker = (mockServerName: string, url: string, server: Server) => () =>
  new Promise<void>((resolve, reject) => {
    if (server) {
      server.close((err) => {
        if (err) {
          reject(err)
        }
        console.log(`🚀 ${mockServerName} mock http server  on ${url} stopped`)
        resolve()
      })
    }
  })
