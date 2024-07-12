import { EnvVars } from "../IntegrationTestCtx"
import { logger } from "../../logger/Logger"
import {
  mockHttpServerExpectationMatchesRequest,
  HttpRequestMatcher,
  MockHttpServerExpectation,
  RequestMatchInfo
} from "./MockHttpExpectation"
import {matchMaker} from "mismatched";

export type MockTcpListener = { onUrl: string; close: () => Promise<void> }
export type MockTcpListenerFactory = (tcpConfig: TCPConfig, mockConfig: MockConfig) => Promise<MockTcpListener>

export interface MockHttpServerFailure {
  reason: string
  request?: RequestMatchInfo
  diff?: unknown
}

export class MockHttpServer<MOCKSERVERNAMES extends string = any, ENVKEYS extends string = any> {
  private static nextServerPort = 9900
  private tcpCfg: TCPConfig
  private tcpListener: MockTcpListener
  private expectations: MockHttpServerExpectation[] = []
  private stubs: MockHttpServerExpectation[] = []
  private failures: MockHttpServerFailure[] = []

  constructor(
    public name: MOCKSERVERNAMES,
    private urlEnvKey: ENVKEYS,
    host: string = "localhost",
    private protocol: "http" | "https" = "http",
    private listenerFactory: MockTcpListenerFactory
  ) {
    this.tcpCfg = {
      port: MockHttpServer.nextServerPort++,
      host: host,
      protocol: protocol,
    }
  }

  async listen(): Promise<void> {
    if (this.tcpListener) throw new Error("Cant call listen once tcpListener already started")
    this.tcpListener = await this.listenerFactory(this.tcpCfg, {
      getApplicableExpectation: (requestMatchInfo: RequestMatchInfo) => {
        let nextExpectation = this.expectations.shift()
        if (!nextExpectation) {
          const lookForStubs = this.stubs.filter((stub) => mockHttpServerExpectationMatchesRequest(stub, requestMatchInfo))
          if (lookForStubs.length > 1) throw Error("More than one stub matches")
          nextExpectation = lookForStubs[0]
        }
        return nextExpectation
      },
      registerFailure: (failure: MockHttpServerFailure) => this.failures.push(failure),
      mockServerName: this.name,
    })
    logger.info(`Mock server listening on ${this.tcpListener.onUrl}`)
  }

  getEnvEntries(): Partial<EnvVars<ENVKEYS>> {
    if (!this.tcpListener) throw new Error("Url Unknown: Please start listening first")
    return { [this.urlEnvKey]: this.tcpListener.onUrl } as Partial<EnvVars<ENVKEYS>>
  }

  close = (): Promise<void> => {
    if (!this.tcpListener) throw new Error("Unable to close because listener has not been started")
    return this.tcpListener
      .close()
      .then(() => logger.info(`HttpMockServer ${this.name} closed`))
      .catch((e) => logger.error(`Error closing HttpMockServer ${this.name}`, e))
  }

  expect(expectation: MockHttpServerExpectation): this {
    this.expectations.push(expectation)
    return this
  }

  stub(expectation: MockHttpServerExpectation): this {
    this.stubs.push(expectation)
    return this
  }

  verify() {
    const failures = this.expectations.length + this.failures.length
    try {
      if (failures > 0) {
        const failureObj = {
          message: `Verify for MockServer ${this.name} failed`,
          unmet: this.expectations,
          failed: this.failures,
        }
        const failureDetails = JSON.stringify(failureObj, null, 2)
        console.info("Verify Failed", failureDetails)
        throw new Error(failureDetails)
      }
      console.info(`Verify for MockServer ${this.name} succeeded`)
    } finally {
      this.expectations = []
      this.failures = []
    }
  }
}

export type TCPConfig = {
  protocol: "http" | "https"
  port: number
  host: string
}

export type MockConfig = {
  mockServerName: string
  getApplicableExpectation: (matcCtx: RequestMatchInfo) => MockHttpServerExpectation | undefined
  registerFailure: (failure: MockHttpServerFailure) => void
}
