import { HttpConfig } from "./http.types"

export const httpConfigUrlMaker = (tcpConfig: HttpConfig, host = "localhost") =>
  `${tcpConfig.protocol}://${host}:${tcpConfig.port}`
