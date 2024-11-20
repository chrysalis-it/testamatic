import { assertThat, match } from "mismatched"
import { koaMockServerTcpListenerFactory } from "./koaMockServerTcpListenerFactory"
import { MockConfig, MockHttpServerFailure} from "../MockHttpServer"
import { RestClient } from "typed-rest-client"
import { MockHttpServerExpectation } from "../MockHttpExpectation"
import axios from "axios"
import {TCPConfig, TcpListener} from "../../tcp/tcp.types";
import {expressMockServerTcpListenerFactory} from "./expressMockServerTcpListenerFactory";
import {logger} from "../../logger/Logger";
import {createAxiosInstance} from "../../axios/axiosInstanceMaker";

class SomeClass {
  go() {}
}

describe("expressMockServerTcpListenerFactory.integration.ts", () => {
  let listener: TcpListener

  const axiosClient = createAxiosInstance("axios for configureIntegrationTestCtxFactory.integration", logger)


  afterEach(async () => {
    await listener.close()
  })

  it("when no expectations", async () => {

    const failures: MockHttpServerFailure[] = []

    const tcpConfig: TCPConfig = {
      protocol: "http",
      host: "localhost",
      port: 9900,
    }
    const mockConfig: MockConfig = {
      mockServerName: "Test",
      registerFailure: (failure: MockHttpServerFailure) => failures.push(failure),
      getApplicableExpectation: (matcCtx) => undefined,
    }
    console.log(`Got here expressMockServerTcpListenerFactory.integration.ts:41 }`);
    listener = await expressMockServerTcpListenerFactory(mockConfig ,tcpConfig )
    console.log(`Got here expressMockServerTcpListenerFactory.integration.ts:43 }`);


    const response = await axiosClient.get<undefined>(`${listener.onUrl}/hello`)
    console.log(`Got here expressMockServerTcpListenerFactory.integration.ts:45 }`);

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

    const tcpConfig: TCPConfig = {
      protocol: "http",
      host: "localhost",
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
    listener = await expressMockServerTcpListenerFactory(mockConfig,tcpConfig )


    const response = await axiosClient.get(`${listener.onUrl}/hello`)

    // assert response
    assertThat(response.status).is(400)
    assertThat(response.statusText).is("Expectation did not match")  // TODO PJ

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
      host: "localhost",
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
    listener = await expressMockServerTcpListenerFactory(mockConfig, tcpConfig )

    const response = await axiosClient.get(`${listener.onUrl}/${expectedPath}`)

    // assert response
    assertThat(response.status).is(nextExpectation.response.status)
    assertThat(response.statusText).is("All good")
    assertThat(response.data).is(nextExpectation.response.body)

    // assert failures
    assertThat(failures).is([])
  })
})

