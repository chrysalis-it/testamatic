import { RestClient } from "typed-rest-client"
import { TCPConfig, TcpListener } from "../../tcp/tcp.types"
import { EnvVars } from "../../integration/IntegrationTestCtx"
import { closeTcpListenerMaker } from "../../tcp/closeTcpListenerMaker"
import express, { Router as ExRouter } from "express"
import {Middleware} from "koa";
import {logger} from "../../logger/Logger";

export type ClientAndServer = { client: RestClient; close: () => Promise<unknown> }
export type ClientAndServerProvider<ENVKEYS extends string> = (env: EnvVars<ENVKEYS>) => Promise<ClientAndServer>

export const expressTcpListenerFactory = (tcpConfig: TCPConfig, router: ExRouter, name: string) =>
  new Promise<TcpListener>((resolve, reject) => {
    const exServer = express()
    exServer.use(router)
    const onUrl = `${tcpConfig.protocol}://${tcpConfig.host}:${tcpConfig.port}`
    try {
      const server = exServer.listen(
        {
          port: tcpConfig.port,
          host: tcpConfig.host,
        },
        () => {
          logger.info(`🚀 ${name} is listening on ${onUrl}`)
          resolve({ onUrl, close: closeTcpListenerMaker(name, onUrl, server) })
        },
      )
    } catch (err) {
      reject(err)
    }
  })
