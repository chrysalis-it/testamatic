import { TCPConfig } from "./tcp/tcp.types"
import { ClientAndServer } from "./configureIntegrationTestCtxFactory"
import { RestClient } from "typed-rest-client"
import { restClientMaker } from "./restClientMaker"
import { ServerStarter, tcpListenerFactory } from "./mockHttpServer/listenerFactory/tcpListenerFactory"
import { ListenerConfig } from "./mockHttpServer/listenerFactory/tcpListenerFactory"

export const expressClientAndServerProviderMaker =
  (
    serverStarterProvider: () => ServerStarter,
    tcpConfig: ListenerConfig = {
      port: 9999,
      protocol: "http",
    },
  ) =>
  async (): Promise<ClientAndServer<RestClient>> => {
    const server = await tcpListenerFactory(tcpConfig, serverStarterProvider(), "api")
    const client = restClientMaker(server.onUrl)
    return {
      client: client,
      close: () => server.close(),
    }
  }
