export type HttpConfig = {
  protocol: "http" | "https"
  port: number
}
export type HttpListener = { onUrl: string; close: () => Promise<void> }
