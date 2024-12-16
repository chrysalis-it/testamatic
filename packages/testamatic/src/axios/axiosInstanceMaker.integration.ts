import { isAxiosError } from "axios"
import { assertThat, match } from "mismatched"
import { createAxiosInstance } from "./axiosInstanceMaker"
import { koaMockServerTcpListenerFactory, MockHttpServer, MockHttpServerExpectation } from "../mockHttpServer"
import { logger } from "../logger/Logger"

describe("axiosInstanceMaker.integration", () => {
  let mockServer: MockHttpServer
  let mockServerBaseUrl
  const makeMockServerExpectationWithResponse = (url: string, status: number) => ({
    requestMatcher: {
      body: match.any(),
      headers: match.any(),
      url: url,
      method: match.any(),
    },
    response: {
      status: status,
      statusText: "!!!!!!",
      body: {},
    },
  })

  beforeEach(async () => {
    ;(mockServer = new MockHttpServer<"someServer", "SomeEnvKey">(
      "someServer",
      "SomeEnvKey",
      koaMockServerTcpListenerFactory,
      {
        host: "localhost",
        protocol: "http",
      },
    )),
      await mockServer.listen()
    mockServerBaseUrl = `${mockServer.getEnvEntries()["SomeEnvKey"]}`
  })

  afterEach(async () => {
    mockServer.verify()
    await mockServer.close()
  })

  describe("configured with one retry", () => {
    const axios = createAxiosInstance("axiosTest", logger, {
      retries: 1,
      retryDelay: () => 1,
    })
    it("when no server to talk to", async () => {
      // given

      const notFoundUrl = `http://somewhere`
      // when
      try {
        await axios.request({
          method: "get",
          url: notFoundUrl,
        })
        throw new Error("Shouldnt get here")
      } catch (e) {
        assertThat(isAxiosError(e)).is(true)
      }
    })
    it("when 200 first time", async () => {
      // given

      const helloUrl = `${mockServerBaseUrl}/hello`
      const expectation: MockHttpServerExpectation = makeMockServerExpectationWithResponse("/hello", 200)
      mockServer.expect(expectation)
      // when
      try {
        const response = await axios.request({
          method: "get",
          url: helloUrl,
        })
        assertThat(response.status).is(200)
      } catch (e) {
        throw new Error("Shouldnt get here")
      }
    })
    it("when 500 then 200 second time", async () => {
      // given

      const helloUrl = `${mockServerBaseUrl}/hello`
      mockServer.expect(makeMockServerExpectationWithResponse("/hello", 500))
      mockServer.expect(makeMockServerExpectationWithResponse("/hello", 200))

      // when
      try {
        const response = await axios.request({
          method: "get",
          url: helloUrl,
        })
        assertThat(response.status).is(200)
      } catch (e) {
        if (!isAxiosError(e)) throw e
        throw new Error("Shouldnt get here " + e.message)
      }
    })
    it("when 500 then 500 second time", async () => {
      // given

      const helloUrl = `${mockServerBaseUrl}/hello`
      mockServer.expect(makeMockServerExpectationWithResponse("/hello", 500))
      mockServer.expect(makeMockServerExpectationWithResponse("/hello", 500))

      // when
      try {
        await axios.request({
          method: "get",
          url: helloUrl,
        })
        throw new Error("Shouldnt get here ")
      } catch (e) {
        if (!isAxiosError(e)) throw e
        assertThat(e.response!.status).is(500)
      }
    })
    it("when 400 first time", async () => {
      // given

      const helloUrl = `${mockServerBaseUrl}/hello`
      mockServer.expect(makeMockServerExpectationWithResponse("/hello", 400))

      // when
      try {
        const response = await axios.request({
          method: "get",
          url: helloUrl,
        })
        assertThat(response.status).is(400)
      } catch (e) {
        if (!isAxiosError(e)) throw e
        throw new Error("Shouldnt get here " + e.message)
      }
    })
  })
})
