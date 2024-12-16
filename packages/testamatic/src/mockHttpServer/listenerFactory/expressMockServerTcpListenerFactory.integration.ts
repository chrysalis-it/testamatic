import { assertThat, match } from "mismatched"
import { MockConfig, MockHttpServerFailure } from "../MockHttpServer"
import { MockHttpServerExpectation } from "../MockHttpExpectation"
import { expressMockServerHttpListenerFactory } from "./expressMockServerHttpListenerFactory"
import { createAxiosInstance } from "../../axios/axiosInstanceMaker"
import { consoleLogger } from "../../logger/console/consoleLogger"
import { HttpListener, HttpConfig } from "../../http/http.types"

describe("expressMockServerTcpListenerFactory.integration.ts", () => {
  let listener: HttpListener

  const axiosClient = createAxiosInstance("axios for configureIntegrationTestCtxFactory.integration", consoleLogger)

  afterEach(async () => {
    await listener.close()
  })

  it("when no expectations", async () => {
    const failures: MockHttpServerFailure[] = []

    const tcpConfig: HttpConfig = {
      protocol: "http",
      port: 9900,
    }
    const mockConfig: MockConfig = {
      mockServerName: "Test",
      registerFailure: (failure: MockHttpServerFailure) => failures.push(failure),
      getApplicableExpectation: () => undefined,
    }
    listener = await expressMockServerHttpListenerFactory(mockConfig, tcpConfig, consoleLogger)
    const response = await axiosClient.get<undefined>(`${listener.onUrl}/hello`)

    // assert response
    assertThat(response.status).is(404)
    assertThat(response.statusText).is("No remaining expectations or applicable stubs found") // TODO PJ

    // assert failures
    assertThat(failures).is([
      {
        reason: "No remaining expectations",
        request: {
          method: "get",
          headers: match.any(),
          url: "/hello",
          body: undefined,
        },
      },
    ])
  })
  it("when expectation that does NOT match", async () => {
    const failures: MockHttpServerFailure[] = []

    const tcpConfig: HttpConfig = {
      protocol: "http",
      port: 9901,
    }

    const nextExpectation: MockHttpServerExpectation = {
      requestMatcher: {
        method: "get",
        url: "some/path/that/doesnt/match",
        headers: match.any(),
      },
      response: {
        body: { hello: "I am a mock http server" },
        status: 200,
        statusText: "All good",
      },
    }

    const mockConfig: MockConfig = {
      mockServerName: "Test",
      registerFailure: (failure: MockHttpServerFailure) => failures.push(failure),
      getApplicableExpectation: () => nextExpectation,
    }
    listener = await expressMockServerHttpListenerFactory(mockConfig, tcpConfig, consoleLogger)

    const response = await axiosClient.get(`${listener.onUrl}/hello`)

    // assert response
    assertThat(response.status).is(400)
    assertThat(response.statusText).is("Expectation did not match") // TODO PJ

    // assert failures
    assertThat(failures).is([
      {
        reason: "Expectation did not match",
        diff: match.any(),
      },
    ])
  })
  it("when expectation that does match", async () => {
    const failures: MockHttpServerFailure[] = []

    const tcpConfig: HttpConfig = {
      protocol: "http",
      port: 9902,
    }

    const expectedPath = "some/path/that/does/match"
    const nextExpectation: MockHttpServerExpectation = {
      requestMatcher: {
        method: "get",
        url: "/" + expectedPath, // TODO PJ,
      },
      response: {
        body: { hello: "I am a mock http server" },
        status: 200,
        statusText: "All good",
      },
    }

    const mockConfig: MockConfig = {
      mockServerName: "Test",
      registerFailure: (failure: MockHttpServerFailure) => failures.push(failure),
      getApplicableExpectation: () => nextExpectation,
    }
    listener = await expressMockServerHttpListenerFactory(mockConfig, tcpConfig, consoleLogger)

    const response = await axiosClient.get(`${listener.onUrl}/${expectedPath}`)

    // assert response
    assertThat(response.status).is(nextExpectation.response.status)
    assertThat(response.statusText).is("All good")
    assertThat(response.data).is(nextExpectation.response.body)

    // assert failures
    assertThat(failures).is([])
  })
})
