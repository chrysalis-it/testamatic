import { mockHttpServerExpectationMatchesRequest, RequestMatchInfo } from "../MockHttpExpectation"
import { isFunction } from "util"
import { PrettyPrinter } from "mismatched"
import { MockConfig, MockHttpListenerFactory } from "../MockHttpServer"
import express, { Handler } from "express"
import { httpListenerFactory } from "./httpListenerFactory"
import http from "http"
import { HttpConfig } from "../../http/http.types"
import { HttpListener } from "../../http/http.types"
import { TestamaticLogger } from "../../logger/TestamaticLogger"

export const expressMockServerHttpListenerFactory: MockHttpListenerFactory = async (
  mockConfig: MockConfig,
  httpConfig: HttpConfig,
  logger: TestamaticLogger,
): Promise<HttpListener> => {
  const serverStarter = () => {
    const expressApp = express()
    expressApp.use(expressHandlerMaker(mockConfig))
    return Promise.resolve(http.createServer(expressApp).listen(httpConfig.port))
  }

  // TODO PJ
  // sslify({ resolver: () => true }), bodyParser(),

  return httpListenerFactory(httpConfig, serverStarter, `${mockConfig.mockServerName} mock server`, logger)
}

const expressHandlerMaker =
  (mockConfig: MockConfig): Handler =>
  async (request, response) => {
    const reqInfo: RequestMatchInfo = {
      url: request.url,
      method: request.method.toLowerCase(),
      headers: request.headers,
      body: !request?.body || Object.keys(request.body).length === 0 ? undefined : request.body,
    }
    console.info(
      `${mockConfig.mockServerName} Mock Server has received a request`,
      PrettyPrinter.make().render(reqInfo),
    )
    const applicableExpectation = mockConfig.getApplicableExpectation(reqInfo)

    if (!applicableExpectation) {
      mockConfig.registerFailure({
        reason: "No remaining expectations",
        request: reqInfo,
      })
      response.status(404)
      response.statusMessage = "No remaining expectations or applicable stubs found"
      return response.json()
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
      response.status(400)
      response.statusMessage = "Expectation did not match"
      return response.json()
    }
    console.info(
      `${mockConfig.mockServerName} Mock Server request matched expectation`,
      PrettyPrinter.make().render(applicableExpectation.requestMatcher),
    )

    response.status(applicableExpectation.response.status)
    response.statusMessage = applicableExpectation.response.statusText
    response.header["content-type"] = "application/json"

    const body = isFunction(applicableExpectation.response.body)
      ? (applicableExpectation.response.body as (req: unknown) => unknown)(reqInfo)
      : applicableExpectation.response.body

    const { status, statusMessage } = response
    console.info(`Mock Server Sending Response`, { status, statusMessage, body })

    return response.json(body)
  }
