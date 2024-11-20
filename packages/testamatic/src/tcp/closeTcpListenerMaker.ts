import http from "http"

export const closeTcpListenerMaker = (name: string, url: string, server: http.Server) => () =>
  new Promise<void>((resolve, reject) => {
    if (server) {
      server.close((err) => {
        if (err) {
          return reject(err)
        }
        console.log(`🚀 ${name} TCPListener  on ${url} stopped`)
        return resolve()
      })
    }
  })
