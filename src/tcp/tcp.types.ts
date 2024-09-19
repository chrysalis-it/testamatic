export type TCPConfig = {
  protocol: "http" | "https"
  port: number
  host: string
}
export type TcpListener = { onUrl: string; close: () => Promise<void> }

export const tcpConfigUrlMaker = (tcpConfig: TCPConfig) => `${tcpConfig.protocol}://${tcpConfig.host}:${tcpConfig.port}`


