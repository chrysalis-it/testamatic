import { RestClient } from "typed-rest-client"
import { TCPConfig, TcpListener } from "../../tcp/tcp.types"
import { EnvVars } from "../../integration/IntegrationTestCtx"
import { closeTcpListenerMaker } from "../../tcp/closeTcpListenerMaker"
import express, { Router as ExRouter } from "express"
import {logger} from "../../logger/Logger";
import * as core from "express-serve-static-core";


export const expressTcpListenerFactory = (tcpConfig: TCPConfig, expressApp: core.Express, name: string) =>
  new Promise<TcpListener>((resolve, reject) => {
    const onUrl = `${tcpConfig.protocol}://${tcpConfig.host}:${tcpConfig.port}`
    try {
      const server = expressApp.listen(
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
