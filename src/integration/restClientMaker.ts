import { RestClient } from "typed-rest-client"
import { logger } from "../logger/Logger"

export const restClientMaker = (serverUrl: string) => {
  const client = new RestClient("Integration test Api", serverUrl, undefined, {
    socketTimeout: 2000,
    maxRetries: 3,
    allowRetries: true,
  })
  logger.info("Client created", { serverUrl: serverUrl })
  return client
}