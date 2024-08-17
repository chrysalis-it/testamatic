import http from "http"
import { logger } from "../logger/Logger"
import { MockHttpServer } from "./mockHttpServer/MockHttpServer"
import {
  API,
  BeforeAndAfter,
  EnvVars,
  IntegrationTestCtx,
  IsExecuted,
  MockServerExpecter,
  WHENRESPONSE,
} from "./IntegrationTestCtx"
import { ClientAndServer, ClientAndServerProvider } from "./defaultClientAndServerProvider"
import { MockHttpServerExpectation } from "./mockHttpServer/MockHttpExpectation"

export type EnvSetup<ENVKEYS extends string> = {
  setup: (env: EnvVars<ENVKEYS>) => Promise<EnvSetup<ENVKEYS>>
  teardown: () => Promise<EnvSetup<ENVKEYS>>
}
export interface Given {
  teardown(): Promise<Given>;
  setup(): Promise<Given>;
}

export const configureIntegrationTestCtxProvider = <
  ENVKEYS extends string,
  MOCKSERVERNAMES extends string,
  WHENDELTA extends object,
>(
  defaultEnv: EnvVars<ENVKEYS>,
  envSetup: EnvSetup<ENVKEYS>,
  whenDeltaConfig: WhenDeltaConfig<WHENDELTA>,
  mockHttpServers: MockHttpServer<MOCKSERVERNAMES, ENVKEYS>[] = [],
  clientAndServerProvider?: ClientAndServerProvider<ENVKEYS>,
  beforeAll: Given[] = [],
  beforeEach: Given[] = [],
): IntegrationTestCtxProvider<ENVKEYS, MOCKSERVERNAMES, WHENDELTA> => {
  return async () => {
    const env = envMaker(defaultEnv, mockHttpServers)
    await envSetup.teardown()
    await envSetup.setup(env)

    // Only setup once, might want to re-create before each test
    const clientAndServerPromise = clientAndServerProvider ? clientAndServerProvider(env) : undefined

    return {
      env: env,
      all: beforeAndAfterAllMaker(mockHttpServers, beforeAll, clientAndServerPromise),
      each: beforeAndAfterEachMaker(mockHttpServers, beforeEach),
      httpMock: mockServerExpectionSetter(mockHttpServers),
      api: await apiMaker(clientAndServerPromise),
      when: whenMaker<WHENDELTA>(mockHttpServers, whenDeltaConfig),
    }
  }
}

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
  expect: (name: MOCKSERVERNAMES, expectation: MockHttpServerExpectation) => {
    const mockServer = mockHttpServersx.find((x) => x.name === name)
    if (!mockServer) throw new Error(`Cant find mock server ${name}`)
    return mockServer.expect(expectation)
  },
})

const beforeAndAfterAllMaker = (
  mockHttpServers: MockHttpServer[],
  beforeAll: Given[],
  clientAndServerPromise?: Promise<ClientAndServer>,
): BeforeAndAfter => ({
  before: async () => {
    logger.debug("ctx.beforeAll started")
    await Promise.all([...mockHttpServers.map((x) => x.listen())])
    await Promise.all(beforeAll.map((x) => x.teardown().then(x => x.setup())))

    logger.debug("ctx.beforeAll complete")
  },
  after: async () => {
    logger.debug("ctx.afterAll started")
    if (clientAndServerPromise) {
      await clientAndServerPromise.then((clientAndServer) => clientAndServer.close())
    }
    await Promise.all([mockHttpServers.map((x) => x.close())])
    logger.debug("ctx.afterAll complete")
  },
})

const beforeAndAfterEachMaker = (mockHttpServers: MockHttpServer[], beforeEach: Given[]): BeforeAndAfter => ({
  before: async () => {
    logger.debug("ctx.beforeAll started")
    await Promise.all(beforeEach.map((x) => x.teardown().then(x => x.setup())))
    logger.debug("ctx.beforeAll complete")
  },
  after: async () => {
    logger.debug("ctx.afterEach started")
    mockHttpServers.forEach((x) => x.verify())
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

const whenMaker =
  <WHENDELTA extends object>(mockHttpServers: MockHttpServer[], whenDeltaConfig: WhenDeltaConfig<WHENDELTA>) =>
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
      mockHttpServers.forEach((x) => x.verify())
    }
  }
