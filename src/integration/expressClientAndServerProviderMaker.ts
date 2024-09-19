import { TCPConfig } from "../tcp/tcp.types"
import { EnvVars } from "./IntegrationTestCtx"
import { expressTcpListenerFactory } from "../packages/express/tcpListenerFactory"
import * as core from "express-serve-static-core"
import {ClientAndServer, ClientAndServerProvider} from "./configureIntegrationTestCtxFactory";
import {RestClient} from "typed-rest-client";
import {restClientMaker} from "./restClientMaker";

export type ExpressAppProvider = () => core.Express

export const expressClientAndServerProviderMaker =
  <ENVKEYS extends string>(
    appProvider: ExpressAppProvider,
    tcpConfig: TCPConfig = {
      port: 9999,
      host: "localhost",
      protocol: "http",
    },
  ) =>
  async (): Promise<ClientAndServer<RestClient>> => {
    const server = await expressTcpListenerFactory(tcpConfig, appProvider(), "api")
    const client = restClientMaker(server.onUrl);
    return {
      client: client,
      close: async () => {
        await server.close()
      }
    }
  }
