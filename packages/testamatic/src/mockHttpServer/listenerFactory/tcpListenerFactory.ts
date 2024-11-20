import {TCPConfig, TcpListener} from "../../tcp/tcp.types"
import { closeTcpListenerMaker } from "../../tcp/closeTcpListenerMaker"
import {tcpConfigUrlMaker} from "../../tcp/tcpConfigUrlMaker";

import {ListenOptions} from "net";
import {Server} from "http";
import {PrettyPrinter} from "mismatched";

export type ServerStarter = { listen: (options: ListenOptions, listeningListener?: () => void) => Server}


export const tcpListenerFactory = (tcpConfig: TCPConfig, serverStarter: ServerStarter, name: string) =>
  new Promise<TcpListener>((resolve, reject) => {
    const onUrl = tcpConfigUrlMaker(tcpConfig)
    console.log(`🚀 ${name} is starting on ${onUrl}`)
    try {
      const server = serverStarter.listen(
        {
          port: tcpConfig.port,
          exclusive: false
          // host: tcpConfig.host,
        },
        () => {
          console.log(`🚀 ${name} is listening on ${onUrl}`)
          resolve({ onUrl, close: closeTcpListenerMaker(name, onUrl, server) })
        },
      )
    } catch (err) {
      reject(err)
    }
  })

