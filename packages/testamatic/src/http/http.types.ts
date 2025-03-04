export type HttpMockConfig = {
  protocol: "http" | "https"
  hostName?: string
  certificatePath?: string
}

export type HttpConfig = { port: number } & HttpMockConfig

export type HttpListener = { onUrl: string; close: () => Promise<void> }
