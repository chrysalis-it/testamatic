import http from "http"
import { EnvVars } from "./IntegrationTestCtx"
import { ApiMaker } from "./configureIntegrationTestCtxFactory"
import { logger } from "../logger/Logger"
import { RestClient } from "typed-rest-client"

export type ClientAndServer = { client: RestClient; close: () => Promise<unknown> }
export type ClientAndServerProvider<ENVKEYS extends string> = (env: EnvVars<ENVKEYS>) => Promise<ClientAndServer>
export type ClientAndServerConfig = {
  host: string
  port: number
  makeApi: ApiMaker
}
const defaultClientAndServerProvider =
  <ENVKEYS extends string>(config: ClientAndServerConfig): ClientAndServerProvider<ENVKEYS> =>
  async (env: EnvVars<ENVKEYS>): Promise<ClientAndServer> => {
    const server = await config.makeApi(env)

    return new Promise<ClientAndServer>((resolve, reject) => {
      try {
        server.listen({ port: config.port, exclusive: false }, () => {
          const serverUrl = `${config.host}:${config.port}`
          console.log(`Server running at `)
          const client = createClient(serverUrl)

          const close = closeMaker(client, server)

          resolve({ client, close })
        })
      } catch (e) {
        console.error(`Failed to start server`)
        reject(e)
      }
    })
  }

const closeMaker = (client: RestClient, server: http.Server) => (): Promise<unknown> => {
  const closeClientPromise = Promise.resolve()
    .then(() => client.client.dispose())
    .then(() => logger.info("Client closed"))
    .catch((e) => logger.error("Error closing Client", e))

  const closeServerPromise = new Promise<void>((resolve, reject) => {
    try {
      server.close((error) => {
        if (error) {
          logger.warn("Error closing Server")
          return reject(error)
        }

        logger.info("Server Closed")
        resolve()
      })
    } catch (e) {
      reject(e)
    }
  })
  return Promise.all([closeClientPromise, closeServerPromise])
}

function createClient(serverUrl: string) {
  const client = new RestClient("Integration test Api", serverUrl, undefined, {
    socketTimeout: 2000,
    maxRetries: 3,
    allowRetries: true,
  })
  console.log(`Client created pointing at ${serverUrl}`)
  return client
}

const clientAndServerConfigMaker = (
  host = "http://localhost",
  port: 9999,
  makeApi: ApiMaker
): ClientAndServerConfig => ({ host, port, makeApi })
