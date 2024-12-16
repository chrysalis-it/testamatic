export type HttpConfig = {
  protocol: "http" | "https"
  port: number
  host: string
}
export type HttpListener = { onUrl: string; close: () => Promise<void> }
