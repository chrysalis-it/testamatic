import http from "http"

export const closeHtttpListenerMaker = (name: string, url: string, server: http.Server) => (): Promise<void> =>
  new Promise<void>((resolve, reject) => {
    server.close((err) => {
      if (err) {
        return reject(err)
      }
      console.log(`🚀 ${name} TCPListener  on ${url} stopped`)
      return resolve()
    })
  })
