import {TCPConfig} from "./tcp.types"
export const tcpConfigUrlMaker = (tcpConfig: TCPConfig) => `${tcpConfig.protocol}://${tcpConfig.host}:${tcpConfig.port}`