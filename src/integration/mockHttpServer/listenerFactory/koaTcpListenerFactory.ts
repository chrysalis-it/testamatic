import { Server } from "http"
import Koa from "koa"
import bodyParser from "koa-bodyparser"
import sslify from "koa-sslify"
import { MockConfig, MockTcpListener, MockTcpListenerFactory, TCPConfig } from "../MockHttpServer"
import { mockHttpServerExpectationMatchesRequest, RequestMatchInfo } from "../MockHttpExpectation"
import { isFunction } from "util"
import { PrettyPrinter } from "mismatched"

export const koaTcpListenerFactory: MockTcpListenerFactory = (tcpConfig: TCPConfig, mockConfig: MockConfig) =>
  new Promise<MockTcpListener>((resolve, reject) => {
    const koa = new Koa()
    koa.use(sslify({ resolver: () => true }))
    koa.use(bodyParser())
    koa.use(reqHandlerMaker(mockConfig))
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
        },
      )
    } catch (err) {
      reject(err)
    }
  })

// TODO is this the right type Koa.Context
const reqHandlerMaker = (mockConfig: MockConfig) => async (koaCtx: Koa.Context) => {
  const reqInfo: RequestMatchInfo = {
    url: koaCtx.url,
    method: koaCtx.request.method.toLowerCase(),
    headers: koaCtx.headers,
    body: !koaCtx.request?.body || Object.keys(koaCtx.request.body).length === 0 ? undefined : koaCtx.request.body,
  }
  console.info(`${mockConfig.mockServerName} Mock Server has received a request`, PrettyPrinter.make().render(reqInfo))
  const applicableExpectation = mockConfig.getApplicableExpectation(reqInfo)
  if (!applicableExpectation) {
    mockConfig.registerFailure({
      reason: "No remaining expectations",
      request: reqInfo,
    })
    koaCtx.status = 404
    koaCtx.statusText = "No remaining expectations or applicable stubs found"
    return
  }

  const matchResult = mockHttpServerExpectationMatchesRequest(applicableExpectation, reqInfo)
  if (!matchResult.passed()) {
    console.info(
      `${mockConfig.mockServerName} Mock Server request did NOT match expectation. Returning 400`,
      PrettyPrinter.make().render(matchResult),
    )
    mockConfig.registerFailure({
      reason: "Expectation did not match",
      diff: matchResult.diff,
    })
    koaCtx.status = 400
    koaCtx.statusText = "Expectation did not match"
    return
  }
  console.info(`${mockConfig.mockServerName} Mock Server request matched expectation`, PrettyPrinter.make().render(applicableExpectation.requestMatcher))
  koaCtx.body = isFunction(applicableExpectation.response.body)
    ? (applicableExpectation.response.body as (req: unknown) => unknown)(reqInfo)
    : applicableExpectation.response.body

  koaCtx.status = applicableExpectation.response.status
  koaCtx.statusText = applicableExpectation.response.statusText
  koaCtx.headers["content-type"] = "application/json"
  const { body, status, statusText, headers } = koaCtx
  console.info(`Mock Server Sending Response`, { status, statusText, headers, body })
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
