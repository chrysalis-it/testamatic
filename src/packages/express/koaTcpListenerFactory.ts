import { Server } from "http"
import Koa from "koa"

export type TCPConfig = {
  protocol: "http" | "https"
  port: number
  host: string
}
export type TcpListener = { onUrl: string; close: () => Promise<void> }

export const koaTcpListenerFactory = (
  tcpConfig: TCPConfig,
  middleWares: Koa.Middleware[],
  name: string
) =>
  new Promise<TcpListener>((resolve, reject) => {
    const koa = new Koa()

    middleWares.forEach((middleWare) => koa.use(middleWare))

    const onUrl = `${tcpConfig.protocol}://${tcpConfig.host}:${tcpConfig.port}`
    try {
      const server = koa.listen(
        {
          port: tcpConfig.port,
          host: tcpConfig.host,
        },
        () => {
          console.log(`🚀 ${name} is listening on ${onUrl}`)
          resolve({ onUrl, close: closeKoaTcpListenerMaker(name, onUrl, server) })
        },
      )
    } catch (err) {
      reject(err)
    }
  })

const closeKoaTcpListenerMaker = (mockServerName: string, url: string, server: Server) => () =>
  new Promise<void>((resolve, reject) => {
    if (server) {
      server.close((err) => {
        if (err) {
          reject(err)
        }
        console.log(`🚀 ${mockServerName} mock http server  on ${url} stopped`)
        resolve()
      })
    }
  })
