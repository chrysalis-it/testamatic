import Koa from "koa"
import bodyParser from "koa-bodyparser"
import sslify from "koa-sslify"
import { mockHttpServerExpectationMatchesRequest, RequestMatchInfo } from "../MockHttpExpectation"
import { isFunction } from "util"
import { PrettyPrinter } from "mismatched"
import { MockConfig, MockHttpListenerFactory } from "../MockHttpServer"
import { httpListenerFactory, ServerStarter } from "./httpListenerFactory"
import { TestamaticLogger } from "../../logger/TestamaticLogger"
import { HttpConfig } from "../../http/http.types"

export const koaMockServerTcpListenerFactory: MockHttpListenerFactory = (
  mockConfig: MockConfig,
  httpConfig: HttpConfig,
  logger: TestamaticLogger,
) =>
  httpListenerFactory(httpConfig, koaServerStarterMaker(mockConfig), `${mockConfig.mockServerName} mock server`, logger)

const koaServerStarterMaker = (mockConfig: MockConfig): ServerStarter => {
  const koa = new Koa()
  const middlewares = [sslify({ resolver: () => true }), bodyParser(), reqHandlerMaker(mockConfig)]
  middlewares.forEach((middleWare) => koa.use(middleWare))
  return koa
}

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
  console.info(
    `${mockConfig.mockServerName} Mock Server request matched expectation`,
    PrettyPrinter.make().render(applicableExpectation.requestMatcher),
  )
  koaCtx.body = isFunction(applicableExpectation.response.body)
    ? (applicableExpectation.response.body as (req: unknown) => unknown)(reqInfo)
    : applicableExpectation.response.body

  koaCtx.status = applicableExpectation.response.status
  koaCtx.statusText = applicableExpectation.response.statusText
  koaCtx.headers["content-type"] = "application/json"
  const { body, status, statusText, headers } = koaCtx
  console.info(`Mock Server Sending Response`, { status, statusText, headers, body })
}
