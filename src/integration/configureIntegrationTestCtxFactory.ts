import http from "http"
import { logger } from "../logger/Logger"
import { MockHttpExpectation } from "./mockHttpServer/MockHttpExpectation"
import { MockHttpServer } from "./mockHttpServer/MockHttpServer"
import {
  API,
  EachAndAll,
  EnvVars,
  IntegrationTestCtx,
  IsExecuted,
  MockServerExpecter,
  WHENRESPONSE,
} from "./IntegrationTestCtx"
import { Given } from "./given/Given"
import { ClientAndServer, ClientAndServerProvider } from "./defaultClientAndServerProvider"

export type ApiMaker = <ENVKEYS extends string>(env: EnvVars<ENVKEYS>) => Promise<http.Server>

export type WhenDeltaConfig<WHENDELTA extends object> = {
  snapshot: () => Promise<WHENDELTA>
  diff: (first: WHENDELTA) => Promise<WHENDELTA>
}

export type IntegrationTestCtxProvider<
  ENVKEYS extends string,
  MOCKSERVERNAMES extends string,
  WHENDELTA extends object,
> = () => Promise<IntegrationTestCtx<ENVKEYS, MOCKSERVERNAMES, WHENDELTA>>

export const configureIntegrationTestCtxProvider = <
  ENVKEYS extends string,
  MOCKSERVERNAMES extends string,
  WHENDELTA extends object,
>(
  defaultEnv: EnvVars<ENVKEYS>,
  whenDeltaConfig: WhenDeltaConfig<WHENDELTA>,
  mockHttpServers: MockHttpServer<MOCKSERVERNAMES, ENVKEYS>[] = [],
  clientAndServerProvider?: ClientAndServerProvider<ENVKEYS>,
  beforeAll: Given[] = [],
  beforeEach: Given[] = [],
): IntegrationTestCtxProvider<ENVKEYS, MOCKSERVERNAMES, WHENDELTA> => {
  return async () => {
    const env = envMaker(defaultEnv, mockHttpServers)
    const clientAndServerPromise = clientAndServerProvider ? clientAndServerProvider(env) : undefined

    const before = beforeMaker(mockHttpServers, beforeAll, beforeEach)

    const after = afterMaker(mockHttpServers, beforeAll, beforeEach, clientAndServerPromise)

    const httpMock = mockServerExpectionSetter(mockHttpServers)

    const api = await apiMaker(clientAndServerPromise)

    const when = whenMaker<WHENDELTA>(whenDeltaConfig)

    return {
      env: env,
      before: before,
      after: after,
      httpMock: httpMock,
      api: api,
      when: when,
    }
  }
}

const envMaker = <ENVKEYS extends string, MOCKSERVERNAMES extends string>(
  defaultEnv: EnvVars<ENVKEYS>,
  mockHttpServers: MockHttpServer<MOCKSERVERNAMES, ENVKEYS>[],
): EnvVars<ENVKEYS> => ({
  ...defaultEnv,
  ...Object.assign({}, ...mockHttpServers.map((x) => x.getEnvEntries())),
})

const mockServerExpectionSetter = <MOCKSERVERNAMES extends string, ENVKEYS extends string>(
  mockHttpServersx: MockHttpServer<MOCKSERVERNAMES, ENVKEYS>[],
): MockServerExpecter<MOCKSERVERNAMES, ENVKEYS> => ({
  expect: (name: MOCKSERVERNAMES, expectation: MockHttpExpectation) => {
    const mockServer = mockHttpServersx.find((x) => x.name === name)
    if (!mockServer) throw new Error(`Cant find mock server ${name}`)
    return mockServer.expect(expectation)
  },
})

const beforeMaker = (mockHttpServers: MockHttpServer[], beforeAll: Given[], beforeEach: Given[]): EachAndAll => ({
  all: async () => {
    logger.debug("ctx.beforeAll started")
    await Promise.all([...mockHttpServers.map((x) => x.listen())])
    await Promise.all(beforeAll.map((x) => x.setup()))
    logger.debug("ctx.beforeAll complete")
  },
  each: async () => {
    logger.debug("ctx.beforeAll started")
    await Promise.all(beforeEach.map((x) => x.setup()))
    logger.debug("ctx.beforeAll complete")
  },
})

const afterMaker = (
  mockHttpServers: MockHttpServer[],
  beforeAll: Given[],
  beforeEach: Given[],
  clientAndServerPromise?: Promise<ClientAndServer>,
): EachAndAll => ({
  all: async () => {
    logger.debug("ctx.afterAll started")
    if (clientAndServerPromise) {
      await clientAndServerPromise.then((clientAndServer) => clientAndServer.close())
    }
    await Promise.all([mockHttpServers.map((x) => x.close())])
    await Promise.all(beforeAll.map((x) => x.tearDown()))
    logger.debug("ctx.afterAll complete")
  },
  each: async () => {
    logger.debug("ctx.afterEach started")
    mockHttpServers.forEach((x) => x.verify())
    await Promise.all(beforeEach.map((x) => x.tearDown()))
    logger.debug("ctx.afterEach complete")
  },
})

const apiMaker = (clientAndServerPromise?: Promise<ClientAndServer>): Promise<API> => {
  if (!clientAndServerPromise)
    return Promise.resolve({
      client: () => {
        throw new Error("Please configure ClientAndServerProvider to use API.client")
      },
    })
  return clientAndServerPromise.then((clientAndServer) => ({
    client: () => clientAndServer.client,
  }))
}

// TODO should I return error
const whenMaker =
  <WHENDELTA extends object>(whenDeltaConfig: WhenDeltaConfig<WHENDELTA>) =>
  async <RES>(isExecuted: IsExecuted<RES>): Promise<WHENRESPONSE<RES, WHENDELTA>> => {
    try {
      const before: WHENDELTA = await whenDeltaConfig.snapshot()
      const response = await isExecuted()
      return {
        response: response,
        delta: await whenDeltaConfig.diff(before),
      }
    } catch (e) {
      logger.error(`Error in WHEN`, e)
      throw e
    } finally {
    }
  }
