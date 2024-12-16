import { HttpConfig } from "./http.types"

export const httpConfigUrlMaker = (tcpConfig: HttpConfig) =>
  `${tcpConfig.protocol}://${tcpConfig.host}:${tcpConfig.port}`
