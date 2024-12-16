import { closeHtttpListenerMaker } from "../../http/closeHtttpListenerMaker"
import { httpConfigUrlMaker } from "../../http/httpConfigUrlMaker"

import { ListenOptions } from "net"
import { Server } from "http"
import { HttpConfig, HttpListener } from "../../http/http.types"
import { StructuredLogger } from "../../logger/StructuredLogger"

export type ListenerConfig = Omit<HttpConfig, "host">

export type ServerStarter = { listen: (options: ListenOptions, listeningListener?: () => void) => Server }

export const httpListenerFactory = (
  httpConfig: ListenerConfig,
  serverStarter: ServerStarter,
  name: string,
  logger: StructuredLogger,
) =>
  new Promise<HttpListener>((resolve, reject) => {
    const onUrl = httpConfigUrlMaker({ ...httpConfig, host: "localhost" })
    console.log(`🚀 ${name} is starting on ${onUrl}`)
    try {
      const server = serverStarter.listen({
        port: httpConfig.port,
        exclusive: false,
        // host: tcpConfig.host,
      })

      server.on("listening", () => {
        resolve({ onUrl, close: closeHtttpListenerMaker(name, onUrl, server) })
      })

      server.on("close", () => {
        logger.info("HTTP server closed ")
      })
      server.on("error", (e) => {
        logger.error("HTTP server closed with error", e?.message)
      })
      if (server.listening) {
        logger.info(`🚀 ${name} is listening on ${onUrl}`)
        resolve({ onUrl, close: closeHtttpListenerMaker(name, onUrl, server) })
      }
    } catch (err) {
      reject(err)
    }
  })
