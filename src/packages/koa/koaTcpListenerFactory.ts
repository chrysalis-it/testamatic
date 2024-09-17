import Koa from "koa"
import { TCPConfig, TcpListener } from "../../tcp/tcp.types"
import { closeTcpListenerMaker } from "../../tcp/closeTcpListenerMaker"

export const koaTcpListenerFactory = (tcpConfig: TCPConfig, middleWares: Koa.Middleware[], name: string) =>
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
          resolve({ onUrl, close: closeTcpListenerMaker(name, onUrl, server) })
        },
      )
    } catch (err) {
      reject(err)
    }
  })

