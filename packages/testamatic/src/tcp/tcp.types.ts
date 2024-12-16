export type TCPConfig = {
  protocol: "http" | "https"
  port: number
  host: string
}
export type TcpListener = { onUrl: string; close: () => Promise<void> }
