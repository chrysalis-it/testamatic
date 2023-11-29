import { EnvVars } from "../IntegrationTestCtx"
import { MatchInfo, MockHttpExpectation } from "./MockHttpExpectation"
import { logger } from "../../logger/Logger"

export type MockTcpListener = { onUrl: string; close: () => Promise<void> }
export type MockTcpListenerFactory = (tcpConfig: TCPConfig, mockConfig: MockConfig) => Promise<MockTcpListener>

interface Failure {
  ctx: any
  expectation?: MockHttpExpectation
  failure: any
}

export class MockHttpServer<MOCKSERVERNAMES extends string, ENVKEYS extends string> {
  private static nextServerPort = 9900
  private tcpCfg: TCPConfig
  private tcpListener: MockTcpListener
  private expectations: MockHttpExpectation[] = []
  private stubs: MockHttpExpectation[] = []
  private failures: Failure[] = []

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
    if (!this.tcpListener) throw new Error("Cant call listen once tcpListener already started")
    const mockConfig = {
      getApplicableExpectation: (ctx: MatchInfo) => {
        let nextExpectation = this.expectations.shift()
        if (!nextExpectation) {
          const lookForStubs = this.stubs.filter((stub) => stub.matches(ctx))
          if (lookForStubs.length > 1) throw Error("More than one stub matches")
          nextExpectation = lookForStubs[0]
        }
        return nextExpectation
      },
      registerFailure: (failure: Failure) => this.failures.push(failure),
      mockServerName: this.name,
    }
    this.tcpListener = await this.listenerFactory(this.tcpCfg, mockConfig)
  }

  getEnvEntries(): Partial<EnvVars<ENVKEYS>> {
    if (!this.tcpListener) throw new Error("Url Unknown: Please start listening first")
    return { [this.urlEnvKey]: this.tcpListener.onUrl } as Partial<EnvVars<ENVKEYS>>
  }

  close = (): Promise<void> => {
    if (!this.tcpListener) throw new Error("Unable to close because listener has not been started")
    return this.tcpListener
      .close()
      .then(() => logger.info(`Closed HttpMockServer ${this.name} `))
      .catch((e) => logger.error(`Error closing HttpMockServer ${this.name}`, e))
  }

  expect<REQ, RES>(expectation: MockHttpExpectation<REQ, RES>): this {
    this.expectations.push(expectation)
    return this
  }

  stub<REQ, RES>(expectation: MockHttpExpectation<REQ, RES>): this {
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
  protocol: string
  port: number
  host: string
}

export type MockConfig = {
  mockServerName: string
  getApplicableExpectation: (matcCtx: MatchInfo) => MockHttpExpectation
  registerFailure: (failure: Failure) => void
}
