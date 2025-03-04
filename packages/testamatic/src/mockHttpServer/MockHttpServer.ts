import { EnvVars } from "../IntegrationTestCtx"
import {
  MockHttpServerExpectation,
  mockHttpServerExpectationMatchesRequest,
  RequestMatchInfo,
} from "./MockHttpExpectation"
import { HttpConfig, HttpListener, HttpMockConfig } from "../http/http.types"
import { httpConfigUrlMaker } from "../http/httpConfigUrlMaker"
import { TestamaticLogger } from "../logger/TestamaticLogger"

export type MockHttpListenerFactory = (
  mockConfig: MockConfig,
  httpConfig: HttpConfig,
  logger: TestamaticLogger,
) => Promise<HttpListener>

export interface MockHttpServerFailure {
  reason: string
  request?: RequestMatchInfo
  diff?: unknown
}

export class MockHttpServer<MOCKSERVERNAMES extends string = string, ENVKEYS extends string = string> {
  private static nextServerPort = 9000
  private httpConfig: HttpConfig
  private listener: HttpListener | undefined = undefined
  private expectations: MockHttpServerExpectation[] = []
  private stubs: MockHttpServerExpectation[] = []
  private failures: MockHttpServerFailure[] = []

  constructor(
    public name: MOCKSERVERNAMES,
    private urlEnvKey: ENVKEYS,
    private listenerFactory: MockHttpListenerFactory,
    config: HttpMockConfig,
    private logger: TestamaticLogger,
  ) {
    this.httpConfig = {
      ...config,
      port: MockHttpServer.nextServerPort++,
    }
  }

  async listen(): Promise<void> {
    if (this.listener) throw new Error("Cant call listen once tcpListener already started")
    this.listener = await this.listenerFactory(
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
      this.httpConfig,
      this.logger,
    )
    this.logger.info(`Mock server listening on ${this.listener.onUrl}`)
  }

  getEnvEntries(): Partial<EnvVars<ENVKEYS>> {
    // TODO This is kind of duplicated but needed for setting env
    const url = httpConfigUrlMaker(this.httpConfig)
    return { [this.urlEnvKey]: url } as Partial<EnvVars<ENVKEYS>>
  }

  close = (): Promise<void> => {
    if (!this.listener) throw new Error("Unable to close because listener has not been started")
    return this.listener
      .close()
      .then(() => this.logger.info(`HttpMockServer ${this.name} closed`))
      .catch((e) => this.logger.error(`Error closing HttpMockServer ${this.name}`, e))
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
