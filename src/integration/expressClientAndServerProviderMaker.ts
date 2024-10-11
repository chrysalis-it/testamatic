import { TCPConfig } from "../tcp/tcp.types"
import { ClientAndServer } from "./configureIntegrationTestCtxFactory"
import { RestClient } from "typed-rest-client"
import { restClientMaker } from "./restClientMaker"
import { ServerStarter, tcpListenerFactory } from "./mockHttpServer/listenerFactory/tcpListenerFactory"

export const expressClientAndServerProviderMaker =
  <ENVKEYS extends string>(
    serverStarterProvider: () => ServerStarter,
    tcpConfig: TCPConfig = {
      port: 9999,
      host: "localhost",
      protocol: "http",
    },
  ) =>
  async (): Promise<ClientAndServer<RestClient>> => {
    const server = await tcpListenerFactory(tcpConfig, serverStarterProvider(), "api")
    const client = restClientMaker(server.onUrl)
    return {
      client: client,
      close: server.close,
    }
  }
