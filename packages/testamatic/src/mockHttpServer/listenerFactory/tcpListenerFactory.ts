import { TCPConfig, TcpListener } from "../../tcp/tcp.types"
import { closeTcpListenerMaker } from "../../tcp/closeTcpListenerMaker"
import { tcpConfigUrlMaker } from "../../tcp/tcpConfigUrlMaker"

import { ListenOptions } from "net"
import { Server } from "http"
import { logger } from "../../logger/Logger"

export type ListenerConfig = Omit<TCPConfig, "host">

export type ServerStarter = { listen: (options: ListenOptions, listeningListener?: () => void) => Server }

export const tcpListenerFactory = (tcpConfig: ListenerConfig, serverStarter: ServerStarter, name: string) =>
  new Promise<TcpListener>((resolve, reject) => {
    const onUrl = tcpConfigUrlMaker({ ...tcpConfig, host: "localhost" })
    console.log(`🚀 ${name} is starting on ${onUrl}`)
    try {
      const server = serverStarter.listen(
        {
          port: tcpConfig.port,
          exclusive: false,
          // host: tcpConfig.host,
        },
        () => {
          console.log(`🚀 ${name} is listening on ${onUrl}`)
          resolve({ onUrl, close: closeTcpListenerMaker(name, onUrl, server) })
        },
      )

      server.on("close", () => {
        logger.info("HTTP server closed ")
      })
      server.on("error", (e) => {
        logger.error("HTTP server closed with error", e?.message)
      })
    } catch (err) {
      reject(err)
    }
  })
