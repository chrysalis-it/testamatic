import { EnvVars } from "../IntegrationTestCtx"
import { logger } from "../../logger/Logger"
import {
  MockHttpServerExpectation,
  mockHttpServerExpectationMatchesRequest,
  RequestMatchInfo,
} from "./MockHttpExpectation"
import {TCPConfig, tcpConfigUrlMaker, TcpListener} from "../../tcp/tcp.types"

export type MockTcpListenerFactory = (mockConfig: MockConfig, tcpConfig: TCPConfig) => Promise<TcpListener>

export interface MockHttpServerFailure {
  reason: string
  request?: RequestMatchInfo
  diff?: unknown
}

export class MockHttpServer<MOCKSERVERNAMES extends string = any, ENVKEYS extends string = any> {
  private static nextServerPort = 9900
  private tcpCfg: TCPConfig
  private tcpListener: TcpListener
  private expectations: MockHttpServerExpectation[] = []
  private stubs: MockHttpServerExpectation[] = []
  private failures: MockHttpServerFailure[] = []

  constructor(
    public name: MOCKSERVERNAMES,
    private urlEnvKey: ENVKEYS,
    private listenerFactory: MockTcpListenerFactory,
    tcpConfig: Omit<TCPConfig, "port">,
  ) {
    this.tcpCfg = {
      ...tcpConfig,
      port: MockHttpServer.nextServerPort++,
    }
  }

  async listen(): Promise<void> {
    if (this.tcpListener) throw new Error("Cant call listen once tcpListener already started")
    this.tcpListener = await this.listenerFactory(
      {
        getApplicableExpectation: (requestMatchInfo: RequestMatchInfo) => {
          let nextExpectation = this.expectations.shift()
          if (!nextExpectation) {
            const lookForStubs = this.stubs.filter((stub) =>
              mockHttpServerExpectationMatchesRequest(stub, requestMatchInfo),
            )
            if (lookForStubs.length > 1) throw Error("More than one stub matches")
            nextExpectation = lookForStubs[0]
          }
          return nextExpectation
        },
        registerFailure: (failure: MockHttpServerFailure) => this.failures.push(failure),
        mockServerName: this.name,
      },
      this.tcpCfg,
    )
    logger.info(`Mock server listening on ${this.tcpListener.onUrl}`)
  }

  getEnvEntries(): Partial<EnvVars<ENVKEYS>> {
    // TODO This is kind of duplicated but needed for setting env
    const url = tcpConfigUrlMaker(this.tcpCfg)
    return { [this.urlEnvKey]: url } as Partial<EnvVars<ENVKEYS>>
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


export type MockConfig = {
  mockServerName: string
  getApplicableExpectation: (matcCtx: RequestMatchInfo) => MockHttpServerExpectation | undefined
  registerFailure: (failure: MockHttpServerFailure) => void
}
