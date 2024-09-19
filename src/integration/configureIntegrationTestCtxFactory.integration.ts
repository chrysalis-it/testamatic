import { ClientAndServerProvider, configureIntegrationTestCtxProvider } from "./configureIntegrationTestCtxFactory"
import { assertThat, match } from "mismatched"
import express, { Router as ExRouter } from "express"
import { ExpressAppProvider, expressClientAndServerProviderMaker } from "./expressClientAndServerProviderMaker"
import { RestClient } from "typed-rest-client"
import { LocalEnvSetup } from "../env/local/LocalEnvSetup"
import * as process from "process"
import { EnvVars } from "./IntegrationTestCtx"
import { MockHttpServer } from "./mockHttpServer/MockHttpServer"
import { koaMockServerTcpListenerFactory } from "./mockHttpServer/listenerFactory/koaMockServerTcpListenerFactory"
import axios from "axios"

type SomeEnvKeys = "EnvKeyOne" | "EnvKeyTwo"
type SomeMockServerNames = "HttpMockServer1" | "HttpMockServer2" | "HttpMockServer3"
const pstorePath = "some/pstore/path"

describe("configureIntegrationTestCtxFactory.integration", () => {
  describe("test runs with", () => {
    const url = "/"
    const expectedResponse = "yes I am alive AND LIFE IS GOOD!"
    const simpleAppProvider: ExpressAppProvider = () => {
      const app = express()
      const router = ExRouter()
      router.get(url, (req, res) => {
        res.json(expectedResponse)
      })
      app.use(router)
      return app
    }

    it("server config only", async () => {
      const clientAndServerProvider: ClientAndServerProvider<SomeEnvKeys, RestClient> =
        expressClientAndServerProviderMaker(simpleAppProvider)
      const testCtx = configureIntegrationTestCtxProvider(clientAndServerProvider)

      const ctx = await testCtx()

      await ctx.all.before()
      await ctx.each.before()

      const whenResponse = await ctx.when(() => ctx.api.client().get<string>(url))
      assertThat(whenResponse.response.statusCode).is(200)
      assertThat(whenResponse.response.result).is(expectedResponse)
      assertThat(whenResponse.delta).is({})

      await ctx.each.after()
      await ctx.all.after()
    })
    it("server config and env config", async () => {
      const clientAndServerProvider: ClientAndServerProvider<SomeEnvKeys, RestClient> =
        expressClientAndServerProviderMaker(simpleAppProvider)

      const testCtx = configureIntegrationTestCtxProvider<SomeEnvKeys>(clientAndServerProvider, {
        defaultEnv: {
          EnvKeyOne: "EnvValueOne",
          EnvKeyTwo: "EnvValueTwo",
        },
        envSetup: new LocalEnvSetup(),
      })
      const ctx = await testCtx()

      await ctx.all.before()
      await ctx.each.before()

      const whenResponse = await ctx.when(() => ctx.api.client().get<string>(url))
      assertThat(whenResponse.delta).is({})
      assertThat(whenResponse.response.statusCode).is(200)
      assertThat(whenResponse.response.result).is(expectedResponse)

      await ctx.each.after()
      await ctx.all.after()
    })
    it("server config and env config and when delta", async () => {
      const clientAndServerProvider: ClientAndServerProvider<SomeEnvKeys, RestClient> =
        expressClientAndServerProviderMaker(simpleAppProvider)

      const expectedDelta = { value: 2 }
      const testCtx = configureIntegrationTestCtxProvider<SomeEnvKeys, string, { value: number }>(
        clientAndServerProvider,
        {
          defaultEnv: {
            EnvKeyOne: "EnvValueOne",
            EnvKeyTwo: "EnvValueTwo",
          },
          envSetup: new LocalEnvSetup(),
        },
        {
          snapshot: () => Promise.resolve({ value: 1 }),
          diff: (first: { value: number }) => Promise.resolve(expectedDelta),
        },
      )
      const ctx = await testCtx()

      await ctx.all.before()
      await ctx.each.before()

      const whenResponse = await ctx.when(() => ctx.api.client().get<string>(url))
      assertThat(whenResponse.delta).is(expectedDelta)
      assertThat(whenResponse.response.statusCode).is(200)
      assertThat(whenResponse.response.result).is(expectedResponse)

      await ctx.each.after()
      await ctx.all.after()
    })
    describe("mock server", () => {

      const url = "/"
      const expectedServerResponse = "yes I am alive AND LIFE IS GOOD!"

      const mockServerName = "HttpMockServer3";
      const mockedUrl = "helloMockServer"
      const expectedMockServerResponse = "Hello I am a mocked server"

      it("with no expectation and no calls", async () => {

        const simpleAppWithOnedependantCall: ExpressAppProvider = () => {
          // get env
          const env = process.env as EnvVars<SomeEnvKeys>
          // compose app that calls mocked service
          const dependencyUrl = env["EnvKeyOne"]

          const app = express()
          const router = ExRouter()
          router.get(url, async (req, res) => {
            res.json({serverResponse: expectedServerResponse, mockResponse: undefined})
          })
          app.use(router)
          return app
        }

        const IntegrationTestCtxProvider = configureIntegrationTestCtxProvider<SomeEnvKeys, SomeMockServerNames>(
          expressClientAndServerProviderMaker(simpleAppWithOnedependantCall),
          {
            defaultEnv: {
              EnvKeyOne: "EnvValueOne",
              EnvKeyTwo: "EnvValueTwo",
            },
            envSetup: new LocalEnvSetup(),
          },
          undefined,
          [
            new MockHttpServer<SomeMockServerNames, SomeEnvKeys>(
              mockServerName,
              "EnvKeyOne",
              koaMockServerTcpListenerFactory,
              {
                host: "localhost",
                protocol: "http",
              },
            ),
          ],
        )
        const testCtx = await IntegrationTestCtxProvider()

        await testCtx.all.before()
        await testCtx.each.before()

        const whenResponse = await testCtx.when(() =>
          testCtx.api.client().get<{
            serverResponse: string
            mockResponse: string
          }>(url),
        )

        assertThat(whenResponse.delta).is({})
        assertThat(whenResponse.response.statusCode).is(200)
        assertThat(whenResponse.response.result).is({
          serverResponse: expectedServerResponse,
          mockResponse: undefined,
        })

        await testCtx.each.after()
        await testCtx.all.after()
      })
      it("with expectation that is satisfied", async () => {

        const simpleAppWithOnedependantCall: ExpressAppProvider = () => {
          // get env
          const env = process.env as EnvVars<SomeEnvKeys>
          // compose app that calls mocked service
          const dependencyUrl = env["EnvKeyOne"]
          const axiosClient = axios.create({
            validateStatus: (status) => true,
            timeout: 1000,
          })
          const app = express()
          const router = ExRouter()
          router.get(url, async (req, res) => {
            const response = await axiosClient.get(`${dependencyUrl}/${mockedUrl}`)
            res.json({serverResponse: expectedServerResponse, mockResponse: response.data})
          })
          app.use(router)
          return app
        }

        const IntegrationTestCtxProvider = configureIntegrationTestCtxProvider<SomeEnvKeys, SomeMockServerNames>(
          expressClientAndServerProviderMaker(simpleAppWithOnedependantCall),
          {
            defaultEnv: {
              EnvKeyOne: "EnvValueOne",
              EnvKeyTwo: "EnvValueTwo",
            },
            envSetup: new LocalEnvSetup(),
          },
          undefined,
          [
            new MockHttpServer<SomeMockServerNames, SomeEnvKeys>(
              mockServerName,
              "EnvKeyOne",
              koaMockServerTcpListenerFactory,
              {
                host: "localhost",
                protocol: "http",
              },
            ),
          ],
        )
        const testCtx = await IntegrationTestCtxProvider()

        await testCtx.all.before()
        await testCtx.each.before()

        testCtx.httpMock.expect(mockServerName, {
          requestMatcher: {
            url: match.any(),
            method: "get",
          },
          response: {
            status: 200,
            statusText: "OK",
            body: expectedMockServerResponse,
          },
        })

        const whenResponse = await testCtx.when(() =>
          testCtx.api.client().get<{
            serverResponse: string
            mockResponse: string
          }>(url),
        )

        assertThat(whenResponse.delta).is({})
        assertThat(whenResponse.response.statusCode).is(200)
        assertThat(whenResponse.response.result).is({
          serverResponse: expectedServerResponse,
          mockResponse: expectedMockServerResponse,
        })

        await testCtx.each.after()
        await testCtx.all.after()
      })
      it("with no expectation and unexpected call", async () => {

        const simpleAppWithOnedependantCall: ExpressAppProvider = () => {
          // get env
          const env = process.env as EnvVars<SomeEnvKeys>
          // compose app that calls mocked service
          const dependencyUrl = env["EnvKeyOne"]
          const axiosClient = axios.create({
            validateStatus: (status) => true,
            timeout: 1000,
          })
          const app = express()
          const router = ExRouter()
          router.get(url, async (req, res) => {
            const response = await axiosClient.get(`${dependencyUrl}/${mockedUrl}`)
            res.json({serverResponse: expectedServerResponse, mockResponse: response.data})
          })
          app.use(router)
          return app
        }

        const IntegrationTestCtxProvider = configureIntegrationTestCtxProvider<SomeEnvKeys, SomeMockServerNames>(
          expressClientAndServerProviderMaker(simpleAppWithOnedependantCall),
          {
            defaultEnv: {
              EnvKeyOne: "EnvValueOne",
              EnvKeyTwo: "EnvValueTwo",
            },
            envSetup: new LocalEnvSetup(),
          },
          undefined,
          [
            new MockHttpServer<SomeMockServerNames, SomeEnvKeys>(
              mockServerName,
              "EnvKeyOne",
              koaMockServerTcpListenerFactory,
              {
                host: "localhost",
                protocol: "http",
              },
            ),
          ],
        )
        const testCtx = await IntegrationTestCtxProvider()

        await testCtx.all.before()
        await testCtx.each.before()

        try {
          const whenResponse = await testCtx.when(() =>
            testCtx.api.client().get<{
              serverResponse: string
              mockResponse: string
            }>(url),
          )
          fail('Should never get here')
        } catch (e) {

          assertThat(JSON.parse(e.message)).is({
            message: `Verify for MockServer ${mockServerName} failed`,
            unmet:[],
            failed: [{
              reason: "No remaining expectations",
              request: match.any()
            }]
          });
        } finally {
          await testCtx.each.after()
          await testCtx.all.after()

        }
      })
      it("with expectation that is not satisfied", async () => {

        const simpleAppWithOnedependantCall: ExpressAppProvider = () => {
          // get env
          const env = process.env as EnvVars<SomeEnvKeys>
          // compose app that calls mocked service
          const dependencyUrl = env["EnvKeyOne"]

          const app = express()
          const router = ExRouter()
          router.get(url, async (req, res) => {
            res.json({serverResponse: expectedServerResponse, mockResponse: expectedMockServerResponse})
          })
          app.use(router)
          return app
        }

        const IntegrationTestCtxProvider = configureIntegrationTestCtxProvider<SomeEnvKeys, SomeMockServerNames>(
          expressClientAndServerProviderMaker(simpleAppWithOnedependantCall),
          {
            defaultEnv: {
              EnvKeyOne: "EnvValueOne",
              EnvKeyTwo: "EnvValueTwo",
            },
            envSetup: new LocalEnvSetup(),
          },
          undefined,
          [
            new MockHttpServer<SomeMockServerNames, SomeEnvKeys>(
              mockServerName,
              "EnvKeyOne",
              koaMockServerTcpListenerFactory,
              {
                host: "localhost",
                protocol: "http",
              },
            ),
          ],
        )
        const testCtx = await IntegrationTestCtxProvider()

        await testCtx.all.before()
        await testCtx.each.before()

        testCtx.httpMock.expect(mockServerName, {
          requestMatcher: {
            url: match.any(),
            method: "get",
          },
          response: {
            status: 200,
            statusText: "OK",
            body: expectedMockServerResponse,
          },
        })

        try {
          const whenResponse = await testCtx.when(() =>
            testCtx.api.client().get<{
              serverResponse: string
              mockResponse: string
            }>(url),
          )
          fail('Should never get here')
        } catch (e) {
          assertThat(JSON.parse(e.message)).is({
            message: `Verify for MockServer ${mockServerName} failed`,
            unmet: match.array.length(1),
            failed: []
          });
        } finally {
          await testCtx.each.after()
          await testCtx.all.after()

        }

      })
    })
  })
})
