import {MockHttpServerExpectation} from "./mockHttpServer/MockHttpExpectation";
import {RestClient} from "typed-rest-client";
import {MockHttpServer} from "./mockHttpServer/MockHttpServer";

export type EnvVars<ENVKEYS extends string> = { [key in ENVKEYS]: string }

export type IsExecuted<RES> = () => Promise<RES>
export type BeforeAndAfter = { before: () => Promise<void>; after: () => Promise<void> }
export type API = { client: () => RestClient }
export type MockServerExpecter<MOCKSERVERNAMES extends string, ENVKEYS extends string> = {
  expect: (
    name: MOCKSERVERNAMES,
    expectation: MockHttpServerExpectation
  ) => MockHttpServer<MOCKSERVERNAMES, ENVKEYS>
}
export type WHENRESPONSE<RES, WHENDELTA extends object> = { response: RES; delta: WHENDELTA }
export type WHEN<WHENDELTA extends object> = <RES>(isExecuted: IsExecuted<RES>) => Promise<WHENRESPONSE<RES, WHENDELTA>>

export type IntegrationTestCtx<ENVKEYS extends string, MOCKSERVERNAMES extends string, WHENDELTA extends object> = {
  each: BeforeAndAfter
  all: BeforeAndAfter
  httpMock: MockServerExpecter<MOCKSERVERNAMES, ENVKEYS>
  when: WHEN<WHENDELTA>
  api: API
  env: EnvVars<ENVKEYS>
}