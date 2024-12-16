import { ClientAndServer } from "./configureIntegrationTestCtxFactory"
import { RestClient } from "typed-rest-client"
import { restClientMaker } from "./restClientMaker"
import { ServerStarter, httpListenerFactory } from "./mockHttpServer/listenerFactory/httpListenerFactory"
import { ListenerConfig } from "./mockHttpServer/listenerFactory/httpListenerFactory"
import { StructuredLogger } from "./logger/StructuredLogger"

export const restClientAndExpressServerProviderMaker =
  (
    serverStarterProvider: () => ServerStarter,
    name: string,
    logger: StructuredLogger,
    tcpConfig: ListenerConfig = {
      port: 9999,
      protocol: "http",
    },
  ) =>
  async (): Promise<ClientAndServer<RestClient>> => {
    const server = await httpListenerFactory(tcpConfig, serverStarterProvider(), name, logger)
    const client = restClientMaker(server.onUrl, `${name} client`, logger)
    return {
      client: client,
      close: () => server.close(),
    }
  }
