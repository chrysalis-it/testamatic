import http from "http"
import { RestClient } from "typed-rest-client"
import { logger } from "../logger/Logger"
import { MockHttpExpectation } from "./mockHttpServer/MockHttpExpectation"
import { MockHttpServer } from "./mockHttpServer/MockHttpServer"

export type IsExecuted<RES> = () => Promise<RES>

export interface IntegrationTestContext<ENVKEYS extends string, MOCKSERVERNAMES extends string, WHENDELTA> {
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

export type ApiMaker = () => Promise<http.Server>

export type ApiConfig = {
  port: number
  makeApi: ApiMaker
}
export type WhenDeltaConfig<WHENDELTA> = {
  snapshot: () => Promise<WHENDELTA>
  diff: (first: WHENDELTA, second: WHENDELTA) => Promise<WHENDELTA>
}

export type EnvVars<ENVKEYS extends string> = { [key in ENVKEYS]: string }

export const makeIntegrationTestContextFactory = <ENVKEYS extends string, MOCKSERVERNAMES extends string, WHENDELTA>(
  defaultEnv: EnvVars<ENVKEYS>,
  mockHttpServers: MockHttpServer<MOCKSERVERNAMES, any>[],
  whenDeltaConfig: WhenDeltaConfig<WHENDELTA>,
  apiConfig?: ApiConfig
): (() => IntegrationTestContext<ENVKEYS, MOCKSERVERNAMES, WHENDELTA>) => {
  const httpMockEnvEntries = Object.assign({}, ...mockHttpServers.map((x) => x.getEnvEntries()))

  const env: EnvVars<ENVKEYS> = {
    ...defaultEnv,
    ...httpMockEnvEntries,
  }

  let apiServerPromise: Promise<http.Server> | undefined

  const apiClient = apiConfig
    ? new RestClient("Integration test Api", `http://localhost:${apiConfig.port}`, undefined, {
        socketTimeout: 10000,
        maxRetries: 3,
        allowRetries: true,
      })
    : undefined

  const closeServer = (server: http.Server | undefined): Promise<void> => {
    if (!server) return Promise.resolve()
    return new Promise<void>((resolve, reject) => {
      try {
        server.close((error) => {
          if (error) {
            logger.warn("closeServer: Error")
            return reject(error)
          }

          logger.debug("closeServer: Success")
          resolve()
        })
      } catch (e) {
        reject(e)
      }
    })
  }

  const expect = (name: MOCKSERVERNAMES, expectation: MockHttpExpectation) =>
    mockHttpServers.find((x) => x.expect(expectation))

  const when = async <RES>(isExecuted: IsExecuted<RES>) => {
    let response: RES
    try {
      const before = await whenDeltaConfig.snapshot()
      response = await isExecuted()
      const after = await whenDeltaConfig.snapshot()
      const delta = await whenDeltaConfig.diff(before, after)
      return {
        response: response,
        delta: delta,
      }
    } catch (e) {
      logger.error(`Error in WHEN`, e)
      throw e
    }
  }

  const before = {
    all: async () => {
      logger.debug("ctx.beforeAll started")
      apiServerPromise = apiConfig ? startLocalApiHttp(apiConfig) : undefined
      await Promise.all([apiServerPromise, ...mockHttpServers.map((x) => x.listen())])
      logger.debug("ctx.beforeAll complete")
    },
    each: async () => {
      logger.debug("ctx.beforeEach started")
      logger.debug("ctx.beforeEach complete")
    },
  }

  const after = {
    all: async () => {
      logger.debug("ctx.afterAll started")
      apiClient?.client?.dispose()
      await Promise.all([
        apiServerPromise ? apiServerPromise.then((server) => closeServer(server)) : Promise.resolve(),
        ...mockHttpServers.map((x) => x.close()),
      ])
      logger.debug("ctx.afterAll complete")
    },
    each: async () => {
      logger.debug("ctx.afterEach started")
      mockHttpServers.forEach((x) => x.verify())
      logger.debug("ctx.afterEach complete")
    },
  }

  return () => ({
    env,
    before: before,
    after: after,
    httpMock: { expect },
    api: { client: apiClient },
    when,
  })
}

export async function startLocalApiHttp(config: ApiConfig): Promise<http.Server> {
  const server = await config.makeApi()

  return new Promise<http.Server>((resolve, reject) => {
    try {
      server.listen({ port: config.port, exclusive: false }, () => {
        console.log(`Server running at http://localhost:${config.port}`)
        resolve(server)
      })
    } catch (e) {
      console.error(`Failed to start server`)
      reject(e)
    }
  })
}
