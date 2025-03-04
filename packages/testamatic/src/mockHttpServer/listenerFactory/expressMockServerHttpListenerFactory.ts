import express, { Handler } from "express"
import { PrettyPrinter } from "mismatched"
import fs from "node:fs"
import http from "node:http"
import https from "node:https"
import { isFunction } from "util"
import { HttpConfig, HttpListener } from "../../http/http.types"
import { TestamaticLogger } from "../../logger/TestamaticLogger"
import { mockHttpServerExpectationMatchesRequest, RequestMatchInfo } from "../MockHttpExpectation"
import { MockConfig, MockHttpListenerFactory } from "../MockHttpServer"
import { httpListenerFactory } from "./httpListenerFactory"
export const expressMockServerHttpListenerFactory: MockHttpListenerFactory = async (
  mockConfig: MockConfig,
  httpConfig: HttpConfig,
  logger: TestamaticLogger,
): Promise<HttpListener> => {
  const serverStarter = () => {
    const expressApp = express()
    expressApp.use(expressHandlerMaker(mockConfig))

    httpConfig.hostName = httpConfig?.hostName ?? "localhost"

    // Run this command to generate local certs
    // openssl req -nodes -new -x509 -keyout server.key -out server.crt
    if (httpConfig.protocol === "https") {
      // expressApp.use(HTTPS({ trustProtoHeader: true }))
      if (!httpConfig.certificatePath) {
        console.warn(
          "MockServers Running on HTTPS require a valid certificate configured for the servers host name",
          "Make sure you have certificates for your host.\n" +
            "To generate run :\n" +
            "\t openssl req -nodes -new -x509 -keyout server.key -out server.crt ",
        )
      }
      const server = https
        .createServer(
          {
            key: httpConfig.certificatePath ? fs.readFileSync(`${httpConfig.certificatePath}.key`) : undefined,
            cert: httpConfig.certificatePath ? fs.readFileSync(`${httpConfig.certificatePath}.crt`) : undefined,
          },
          expressApp,
        )
        .listen(httpConfig.port, () => {
          console.log(`HTTPS Server running on https://${httpConfig.hostName}:${httpConfig.port}`)
        })
      return Promise.resolve(server)
    } else {
      const server = http
        .createServer(expressApp)
        .listen(httpConfig.port, () =>
          console.log(`HTTP Server running on http://${httpConfig.hostName}:${httpConfig.port}`),
        )
      return Promise.resolve(server)
    }
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
