import { RestClient } from "typed-rest-client"
import { TestamaticLogger } from "./logger/TestamaticLogger"

export const restClientMaker = (serverUrl: string, name: string, logger: TestamaticLogger) => {
  const client = new RestClient(name, serverUrl, undefined, {
    socketTimeout: 2000,
    maxRetries: 3,
    allowRetries: true,
  })
  logger.info("Client created", { serverUrl: serverUrl })
  return client
}
