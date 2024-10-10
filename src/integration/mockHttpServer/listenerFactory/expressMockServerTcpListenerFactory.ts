import { mockHttpServerExpectationMatchesRequest, RequestMatchInfo } from "../MockHttpExpectation"
import { isFunction } from "util"
import { PrettyPrinter } from "mismatched"
import { MockConfig, MockTcpListenerFactory } from "../MockHttpServer"
import { TCPConfig } from "../../../tcp/tcp.types"
import express, { Handler } from "express"
import { expressTcpListenerFactory } from "../../../packages/express/tcpListenerFactory"

export const expressMockServerTcpListenerFactory: MockTcpListenerFactory = (
  mockConfig: MockConfig,
  tcpConfig: TCPConfig,
) => {
  const expressApp = express()
  expressApp.use(expressHandlerMaker(mockConfig))

  // TODO
  // sslify({ resolver: () => true }), bodyParser(),

  return expressTcpListenerFactory(tcpConfig, expressApp, `${mockConfig.mockServerName} mock server`)
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
      response.status(400)
      response.statusMessage = "Expectation did not match"
      return
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
      : applicableExpectation.response.body;

    const { status, statusMessage, header } = response
    console.info(`Mock Server Sending Response`, { status, statusMessage, body })

    response.json(
      body,
    )
  }
