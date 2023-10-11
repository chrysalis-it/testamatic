import {MockHttpExpectation} from "./mockHttpServer/MockHttpExpectation";
import {RestClient} from "typed-rest-client";

export type EnvVars<ENVKEYS extends string> = { [key in ENVKEYS]: string }

export type IsExecuted<RES> = () => Promise<RES>

export interface IntegrationTestCtx<ENVKEYS extends string, MOCKSERVERNAMES extends string, WHENDELTA> {
  env: EnvVars<ENVKEYS>
  before: {
    all: () => Promise<void>
    each: () => Promise<void>
  }
  after: {
    all: () => Promise<void>
    each: () => Promise<void>
  }
  httpMock: { expect: (name: MOCKSERVERNAMES, expectation: MockHttpExpectation) => void }
  when: <RES>(isExecuted: IsExecuted<RES>) => Promise<{ response: RES; delta: WHENDELTA }>
  api: { client?: RestClient }
}