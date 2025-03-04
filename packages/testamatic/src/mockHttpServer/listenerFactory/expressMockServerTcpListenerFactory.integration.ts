import { AxiosInstance } from "axios"
import { assertThat, match } from "mismatched"
import { createAxiosInstance } from "../../axios/axiosInstanceMaker"
import { HttpConfig, HttpListener } from "../../http/http.types"
import { consoleLogger } from "../../logger/console/consoleLogger"
import { MockHttpServerExpectation } from "../MockHttpExpectation"
import { MockConfig, MockHttpServerFailure } from "../MockHttpServer"
import { expressMockServerHttpListenerFactory } from "./expressMockServerHttpListenerFactory"

describe("expressMockServerTcpListenerFactory.integration.ts", () => {
  let listener: HttpListener

  afterEach(async () => {
    await listener.close()
  })

  describe("http", () => {
    let axiosClient: AxiosInstance
    beforeAll(() => {
      axiosClient = createAxiosInstance("axios for configureIntegrationTestCtxFactory.integration", consoleLogger)
    })
    it("when no expectations", async () => {
      const failures: MockHttpServerFailure[] = []

      const tcpConfig: HttpConfig = {
        protocol: "http",
        hostName: "localhost",
        certificatePath: "/app/server",
        port: 9900,
      }
      const mockConfig: MockConfig = {
        mockServerName: "Test",
        registerFailure: (failure: MockHttpServerFailure) => failures.push(failure),
        getApplicableExpectation: () => undefined,
      }
      listener = await expressMockServerHttpListenerFactory(mockConfig, tcpConfig, consoleLogger)

      console.log("listenerURL", { onUrl: listener.onUrl })
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

  describe("https", () => {
    let tcpConfig: HttpConfig
    let axiosClient: AxiosInstance

    beforeAll(() => {
      axiosClient = createAxiosInstance(
        "axios for configureIntegrationTestCtxFactory.integration",
        consoleLogger,
        "https",
      )
    })

    beforeEach(() => {
      tcpConfig = {
        port: 9901,
        protocol: "https",
        hostName: "localhost",
        certificatePath: "/app/server",
      }
    })
    it("when no expectations", async () => {
      const failures: MockHttpServerFailure[] = []

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
})
