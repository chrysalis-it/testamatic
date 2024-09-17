import { assertThat, match } from "mismatched"
import { mockServerkoaTcpListenerFactory } from "./mockServerkoaTcpListenerFactory"
import { MockConfig, MockHttpServerFailure} from "../MockHttpServer"
import { RestClient } from "typed-rest-client"
import { MockHttpServerExpectation } from "../MockHttpExpectation"
import axios from "axios"
import {TCPConfig, TcpListener} from "../../../tcp/tcp.types";

class SomeClass {
  go() {}
}

describe("koaTcpListenerFactory.integration", () => {
  let listener: TcpListener

  const axiosClient = axios.create({
    validateStatus: (status) => true,
    timeout: 1000,
  })

  afterEach(async () => {
    await listener.close()
  })

  it("when no expectations", async () => {


    const failures: MockHttpServerFailure[] = []

    const tcpConfig: TCPConfig = {
      protocol: "http",
      host: "localHost",
      port: 9900,
    }
    const mockConfig: MockConfig = {
      mockServerName: "Test",
      registerFailure: (failure: MockHttpServerFailure) => failures.push(failure),
      getApplicableExpectation: (matcCtx) => undefined,
    }
    listener = await mockServerkoaTcpListenerFactory(mockConfig ,tcpConfig )

    const response = await axiosClient.get<undefined>(`${listener.onUrl}/hello`)

    // assert response
    assertThat(response.status).is(404)
    assertThat(response.statusText).is("Not Found") // TODO PJ

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
  it("when expectation that doesnt match", async () => {
    const failures: MockHttpServerFailure[] = []

    const tcpConfig: TCPConfig = {
      protocol: "http",
      host: "localHost",
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
    listener = await mockServerkoaTcpListenerFactory(mockConfig,tcpConfig )


    const response = await axiosClient.get(`${listener.onUrl}/hello`)

    // assert response
    assertThat(response.status).is(400)
    assertThat(response.statusText).is("Bad Request")  // TODO PJ

    // assert failures
    assertThat(failures).is([
      {
        reason: "Expectation did not match",
        diff: match.any()
      }
    ])
  })
  it("when expectation that does match", async () => {
    const failures: MockHttpServerFailure[] = []

    const tcpConfig: TCPConfig = {
      protocol: "http",
      host: "localHost",
      port: 9902,
    }

    const expectedPath = "some/path/that/does/match";
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
    listener = await mockServerkoaTcpListenerFactory(mockConfig, tcpConfig )

    const response = await axiosClient.get(`${listener.onUrl}/${expectedPath}`)

    // assert response
    assertThat(response.status).is(nextExpectation.response.status)
    assertThat(response.statusText).is("OK") // TODO PJ
    assertThat(response.data).is(nextExpectation.response.body)

    // assert failures
    assertThat(failures).is([])
  })
})

