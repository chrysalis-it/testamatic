import { logger } from "./logger/Logger"
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
  teardown(): Promise<void>
  setup(): Promise<void>
}

export type ClientAndServer<APICLIENT extends object = RestClient> = { client: APICLIENT; close: () => Promise<void> }
export type ClientAndServerProvider<ENVKEYS extends string, CLIENT extends object = RestClient> = (
  env: EnvVars<ENVKEYS>,
) => Promise<ClientAndServer<CLIENT>>

export type EnvConfig<ENVKEYS extends string> = {
  defaultEnv: EnvVars<ENVKEYS>
  envSetup: EnvSetup<ENVKEYS>
}

export const configureIntegrationTestCtxProvider = <
  ENVKEYS extends string = string,
  MOCKSERVERNAMES extends string = string,
  WHENDELTA extends object = object,
  APICLIENT extends object = RestClient,
>(
  clientAndServerProvider: ClientAndServerProvider<ENVKEYS, APICLIENT>,
  envConfig: EnvConfig<ENVKEYS> = nullEnvConfig,
  whenDeltaConfig?: WhenDeltaConfig<WHENDELTA>,
  mockHttpServers: MockHttpServer<MOCKSERVERNAMES, ENVKEYS>[] = [],
  beforeAll: Given[] = [],
  beforeEach: Given[] = [],
): IntegrationTestCtxProvider<ENVKEYS, MOCKSERVERNAMES, WHENDELTA, APICLIENT> => {
  return async () => {
    const env = envMaker(envConfig.defaultEnv, mockHttpServers)
    await envConfig.envSetup.teardown()
    await envConfig.envSetup.setup(env)

    // Only setup once, might want to re-create before each test
    const clientAndServerPromise: Promise<ClientAndServer<APICLIENT>> = clientAndServerProvider(env)

    return {
      env: env,
      all: beforeAndAfterAllMaker(mockHttpServers, beforeAll, clientAndServerPromise),
      each: beforeAndAfterEachMaker(mockHttpServers, beforeEach),
      httpMock: mockServersMaker(mockHttpServers),
      api: await apiMaker(clientAndServerPromise),
      when: whenMaker<ENVKEYS, WHENDELTA, APICLIENT>(env, mockHttpServers, clientAndServerPromise, whenDeltaConfig),
    }
  }
}

export type WhenDeltaConfig<WHENDELTA extends object> = {
  snapshot: () => Promise<WHENDELTA>
  diff: (first?: WHENDELTA) => Promise<WHENDELTA>
}

export type IntegrationTestCtxProvider<
  ENVKEYS extends string,
  MOCKSERVERNAMES extends string,
  WHENDELTA extends object,
  APICLIENT extends object,
> = () => Promise<IntegrationTestCtx<ENVKEYS, MOCKSERVERNAMES, WHENDELTA, APICLIENT>>

const envMaker = <ENVKEYS extends string, MOCKSERVERNAMES extends string>(
  defaultEnv: EnvVars<ENVKEYS>,
  mockHttpServers: MockHttpServer<MOCKSERVERNAMES, ENVKEYS>[],
): EnvVars<ENVKEYS> => ({
  ...defaultEnv,
  ...Object.assign({}, ...mockHttpServers.map((x) => x.getEnvEntries())),
})

const mockServersMaker = <MOCKSERVERNAMES extends string, ENVKEYS extends string>(
  mockHttpServers: MockHttpServer<MOCKSERVERNAMES, ENVKEYS>[],
): MockServerExpecter<MOCKSERVERNAMES, ENVKEYS> => ({
  expect: (name: MOCKSERVERNAMES, expectation: MockHttpServerExpectation) => {
    const mockServer = mockHttpServers.find((x) => x.name === name)
    if (!mockServer) throw new Error(`Can not find mock server using name ${name}`)
    return mockServer.expect(expectation)
  },
})

const beforeAndAfterAllMaker = <APICLIENT extends object>(
  mockHttpServers: MockHttpServer[],
  beforeAll: Given[],
  clientAndServerPromise?: Promise<ClientAndServer<APICLIENT>>,
): BeforeAndAfter => ({
  before: async () => {
    logger.debug("ctx.beforeAll started")
    await Promise.all([...mockHttpServers.map((x) => x.listen())])
    await Promise.all(beforeAll.map((x) => x.teardown().then(() => x.setup())))

    logger.debug("ctx.beforeAll complete")
  },
  after: async () => {
    logger.debug("ctx.afterAll started")
    !clientAndServerPromise || (await clientAndServerPromise.then((clientAndServer) => clientAndServer.close()))
    await Promise.all([mockHttpServers.map((x) => x.close())])
    logger.debug("ctx.afterAll complete")
  },
})

const beforeAndAfterEachMaker = (mockHttpServers: MockHttpServer[], beforeEach: Given[]): BeforeAndAfter => ({
  before: async () => {
    logger.debug("ctx.beforeEach started")
    await Promise.all(beforeEach.map((x) => x.teardown().then(() => x.setup())))
    logger.debug("ctx.beforeEach complete")
  },
  after: async () => {
    logger.debug("ctx.afterEach started")
    mockHttpServers.forEach((x) => x.verify())
    logger.debug("ctx.afterEach complete")
  },
})

const apiMaker = <APICLIENT extends object>(
  clientAndServerPromise: Promise<ClientAndServer<APICLIENT>>,
): Promise<API<APICLIENT>> => {
  return clientAndServerPromise.then((clientAndServer) => ({
    client: () => clientAndServer.client,
  }))
}

const whenMaker =
  <ENVKEYS extends string, WHENDELTA extends object, APICLIENT extends object>(
    env: EnvVars<ENVKEYS>,
    mockHttpServers: MockHttpServer[],
    clientAndServerPromise: Promise<ClientAndServer<APICLIENT>>,
    whenDeltaConfig?: WhenDeltaConfig<WHENDELTA>,
  ) =>
  async <RES>(isExecuted: IsExecuted<RES>): Promise<WHENRESPONSE<RES, WHENDELTA>> => {
    try {
      await clientAndServerPromise
      const before = whenDeltaConfig ? await whenDeltaConfig.snapshot() : ({} as WHENDELTA) // TODO PJ
      logger.info("When started", { env: env, beforeSnapshot: before })
      const response = await isExecuted()
      const rtn = {
        response: response,
        delta: whenDeltaConfig ? await whenDeltaConfig.diff(before) : ({} as WHENDELTA), // TODO PJ
      }
      logger.info("When execution complete", rtn)
      return rtn
    } catch (e) {
      logger.error(`Error in WHEN`, e)
      throw e
    } finally {
      mockHttpServers.forEach((x) => x.verify())
    }
  }

const nullEnvConfig: EnvConfig<string> = {
  defaultEnv: {},
  envSetup: {
    setup: () => Promise.resolve(undefined),
    teardown: () => Promise.resolve(undefined),
  },
}
