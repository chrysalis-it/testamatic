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
import { MockHttpServerExpectation } from "./mockHttpServer/MockHttpExpectation"
import { RestClient } from "typed-rest-client"

export type EnvSetup<ENVKEYS extends string> = {
  setup: (env: EnvVars<ENVKEYS>) => Promise<void>
  teardown: () => Promise<void>
}

export interface Given {
  teardown(): Promise<Given>

  setup(): Promise<Given>
}

export type ClientAndServer<Client extends object = object> = { client: RestClient; close: () => Promise<void> }
export type ClientAndServerProvider<ENVKEYS extends string, CLIENT extends object = object> = (
  env: EnvVars<ENVKEYS>,
) => Promise<ClientAndServer<CLIENT>>

export type EnvConfig<ENVKEYS extends string> = {
  defaultEnv: EnvVars<ENVKEYS>
  envSetup: EnvSetup<ENVKEYS>
}

export const configureIntegrationTestCtxProvider = <
  ENVKEYS extends string = string,
  MOCKSERVERNAMES extends string = undefined,
  WHENDELTA extends object = {},
  CLIENT extends object = RestClient,
>(
  clientAndServerProvider: ClientAndServerProvider<ENVKEYS, CLIENT>,
  envConfig: EnvConfig<ENVKEYS> = nullEnvConfig,
  whenDeltaConfig: WhenDeltaConfig<WHENDELTA> = nullWhenDeltaConfig as WhenDeltaConfig<WHENDELTA>,
  mockHttpServers: MockHttpServer<MOCKSERVERNAMES, ENVKEYS>[] = [],
  beforeAll: Given[] = [],
  beforeEach: Given[] = [],
): IntegrationTestCtxProvider<ENVKEYS, MOCKSERVERNAMES, WHENDELTA> => {
  return async () => {
    const env = envMaker(envConfig.defaultEnv, mockHttpServers)
    await envConfig.envSetup.teardown()
    await envConfig.envSetup.setup(env)

    // Only setup once, might want to re-create before each test
    const clientAndServerPromise: Promise<ClientAndServer<CLIENT>> = clientAndServerProvider(env)

    return {
      env: env,
      all: beforeAndAfterAllMaker(mockHttpServers, beforeAll, clientAndServerPromise),
      each: beforeAndAfterEachMaker(mockHttpServers, beforeEach),
      httpMock: mockServerExpectionSetter(mockHttpServers),
      api: await apiMaker(clientAndServerPromise),
      when: whenMaker<ENVKEYS, WHENDELTA>(env, mockHttpServers, whenDeltaConfig, clientAndServerPromise),
    }
  }
}

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
    if (!mockServer) throw new Error(`Can not find mock server using name ${name}`)
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
    await Promise.all(beforeAll.map((x) => x.teardown().then((x) => x.setup())))

    logger.debug("ctx.beforeAll complete")
  },
  after: async () => {
    logger.debug("ctx.afterAll started")
    await clientAndServerPromise.then((clientAndServer) => clientAndServer.close())
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

const apiMaker = (clientAndServerPromise: Promise<ClientAndServer>): Promise<API> => {
  return clientAndServerPromise.then((clientAndServer) => ({
    client: () => clientAndServer.client,
  }))
}

const whenMaker =
  <ENVKEYS extends string, WHENDELTA extends object>(
    env: EnvVars<ENVKEYS>,
    mockHttpServers: MockHttpServer[],
    whenDeltaConfig: WhenDeltaConfig<WHENDELTA>,
    clientAndServerPromise: Promise<ClientAndServer>,
  ) =>
  async <RES>(isExecuted: IsExecuted<RES>): Promise<WHENRESPONSE<RES, WHENDELTA>> => {
    try {
      await clientAndServerPromise
      const before: WHENDELTA = await whenDeltaConfig.snapshot()
      logger.info("Executing When", { env: env, beforeSnapshot: before })
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


const nullEnvConfig: EnvConfig<any> = {
  defaultEnv: {},
  envSetup: {
    setup: (env) => Promise.resolve(undefined),
    teardown: () => Promise.resolve(undefined),
  },
}

const nullWhenDeltaConfig = {
  snapshot: () => Promise.resolve({}),
  diff: (first: {}) => Promise.resolve({}),
}