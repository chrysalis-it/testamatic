import { closeHtttpListenerMaker } from "../../http/closeHtttpListenerMaker"
import { httpConfigUrlMaker } from "../../http/httpConfigUrlMaker"
import { Server } from "http"
import { HttpConfig, HttpListener } from "../../http/http.types"
import { TestamaticLogger } from "../../logger/TestamaticLogger"

export type ServerStarter = (httpConfig: HttpConfig) => Promise<Server>

export const httpListenerFactory = async (
  httpConfig: HttpConfig,
  startServer: ServerStarter,
  name: string,
  logger: TestamaticLogger,
): Promise<HttpListener> => {
  const server = await startServer(httpConfig)
  return new Promise<HttpListener>((resolve, reject) => {
    const onUrl = httpConfigUrlMaker(httpConfig, httpConfig.hostName)
    console.log(`🚀 ${name} is starting on ${onUrl}`)
    try {
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
}
