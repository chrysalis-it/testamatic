import { ClientAndServer } from "./configureIntegrationTestCtxFactory"
import { RestClient } from "typed-rest-client"
import { restClientMaker } from "./restClientMaker"
import { httpListenerFactory, ServerStarter } from "./mockHttpServer/listenerFactory/httpListenerFactory"
import { TestamaticLogger } from "./logger/TestamaticLogger"
import { HttpConfig } from "./http/http.types"

export const restClientAndExpressServerProviderMaker =
  (
    serverStarter: ServerStarter,
    name: string,
    logger: TestamaticLogger,
    httpConfig: HttpConfig = {
      port: 9999,
      protocol: "http",
    },
  ) =>
  async (): Promise<ClientAndServer<RestClient>> => {
    const server = await httpListenerFactory(httpConfig, serverStarter, name, logger)
    const client = restClientMaker(server.onUrl, `${name} client`, logger)
    return {
      client: client,
      close: () => server.close(),
    }
  }
