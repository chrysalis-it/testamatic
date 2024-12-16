import { RestClient } from "typed-rest-client"
import { StructuredLogger } from "./logger/StructuredLogger"

export const restClientMaker = (serverUrl: string, name: string, logger: StructuredLogger) => {
  const client = new RestClient(name, serverUrl, undefined, {
    socketTimeout: 2000,
    maxRetries: 3,
    allowRetries: true,
  })
  logger.info("Client created", { serverUrl: serverUrl })
  return client
}
