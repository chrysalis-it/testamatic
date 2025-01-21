import { MockHttpServer } from "./mockHttpServer/MockHttpServer"
import { EnvVars, IntegrationTestCtx, IsExecuted, WHENRESPONSE } from "./IntegrationTestCtx"
import { MockHttpServerExpectation } from "./mockHttpServer/MockHttpExpectation"
import { RestClient } from "typed-rest-client"
import { TestamaticLogger } from "./logger/TestamaticLogger"

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

export type WhenDeltaConfig<SNAPSHOT extends object, DELTA extends object> = {
  snapshot: () => Promise<SNAPSHOT>
  diff: (first?: SNAPSHOT) => Promise<DELTA>
}

export type IntegrationTestCtxProvider<
  ENVKEYS extends string,
  MOCKSERVERNAMES extends string,
  WHENDELTA extends object,
  APICLIENT extends object,
> = () => Promise<IntegrationTestCtx<ENVKEYS, MOCKSERVERNAMES, WHENDELTA, APICLIENT>>

export const configureIntegrationTestCtxProvider = <
  ENVKEYS extends string = string,
  MOCKSERVERNAMES extends string = string,
  SNAPSHOT extends object = object,
  DELTA extends object = object,
  APICLIENT extends object = RestClient,
>(
  clientAndServerProvider: ClientAndServerProvider<ENVKEYS, APICLIENT>,
  logger: TestamaticLogger,
  envConfig: EnvConfig<ENVKEYS> = nullEnvConfig,
  whenDeltaConfig?: WhenDeltaConfig<SNAPSHOT, DELTA>,
  mockHttpServers: MockHttpServer<MOCKSERVERNAMES, ENVKEYS>[] = [],
  beforeAll: Given[] = [],
  beforeEach: Given[] = [],
): IntegrationTestCtxProvider<ENVKEYS, MOCKSERVERNAMES, DELTA, APICLIENT> => {
  return async () => {
    const env = envMaker(envConfig.defaultEnv, mockHttpServers)

    // Only setup once, might want to re-create before each test
    await envConfig.envSetup.teardown()
    await envConfig.envSetup.setup(env)
    const clientAndServer: ClientAndServer<APICLIENT> = await clientAndServerProvider(env)

    return {
      env: env,
      all: {
        before: async () => {
          logger.debug("ctx.beforeAll started")
          await Promise.all([...mockHttpServers.map((x) => x.listen())])
          await Promise.all(beforeAll.map((x) => x.teardown().then(() => x.setup())))

          logger.debug("ctx.beforeAll complete")
        },
        after: async () => {
          logger.debug("ctx.afterAll started")
          await clientAndServer.close()

          await Promise.all([mockHttpServers.map((x) => x.close())])

          logger.debug("ctx.afterAll complete")
        },
      },
      each: {
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
      },
      httpMock: {
        expect: (name: MOCKSERVERNAMES, expectation: MockHttpServerExpectation) => {
          const mockServer = mockHttpServers.find((x) => x.name === name)
          if (!mockServer) throw new Error(`Can not find mock server using name ${name}`)
          return mockServer.expect(expectation)
        },
      },
      api: { client: () => clientAndServer.client },
      when: async <RES>(isExecuted: IsExecuted<RES>): Promise<WHENRESPONSE<RES, DELTA>> => {
        try {
          const before = whenDeltaConfig ? await whenDeltaConfig.snapshot() : ({} as SNAPSHOT) // TODO PJ
          logger.info("When started", { env: env, beforeSnapshot: before })
          const response = await isExecuted()
          const rtn = {
            response: response,
            delta: whenDeltaConfig ? await whenDeltaConfig.diff(before) : ({} as DELTA), // TODO PJ
          }
          logger.info("When execution complete", rtn)
          return rtn
        } catch (e) {
          logger.error(`Error in WHEN`, e)
          throw e
        } finally {
          mockHttpServers.forEach((x) => x.verify())
        }
      },
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

const nullEnvConfig: EnvConfig<string> = {
  defaultEnv: {},
  envSetup: {
    setup: () => Promise.resolve(undefined),
    teardown: () => Promise.resolve(undefined),
  },
}
