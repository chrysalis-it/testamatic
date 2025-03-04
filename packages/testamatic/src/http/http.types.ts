export type HttpConfig = {
  protocol: "http" | "https"
  port: number
  hostName?: string
  certificatePath?: string
}

export type HttpListener = { onUrl: string; close: () => Promise<void> }
