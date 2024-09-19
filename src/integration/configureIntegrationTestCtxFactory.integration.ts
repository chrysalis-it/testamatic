import { ClientAndServerProvider, configureIntegrationTestCtxProvider } from "./configureIntegrationTestCtxFactory"
import {assertThat, match} from "mismatched"
import express, { Router as ExRouter } from "express"
import { ExpressAppProvider, expressClientAndServerProviderMaker } from "./expressClientAndServerProviderMaker"
import { RestClient } from "typed-rest-client"
import { LocalEnvSetup } from "../env/local/LocalEnvSetup"
import * as process from "process"
import { EnvVars } from "./IntegrationTestCtx"
import { MockHttpServer } from "./mockHttpServer/MockHttpServer"
import { koaMockServerTcpListenerFactory } from "./mockHttpServer/listenerFactory/koaMockServerTcpListenerFactory"
import axios from "axios";

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
    it.only("with mock servers", async () => {
      const url = "/"
      const expectedServerResponse = "yes I am alive AND LIFE IS GOOD!"

      const mockedUrl = "helloMockServer"
      const expectedMockServerResponse = "Hello I am a mocked server"

      const appProvider: ExpressAppProvider = () => {
        // get env
        const env = process.env as EnvVars<SomeEnvKeys>

        // compose app that calls mocked service
        const dependencyUrl = env["EnvKeyOne"]
        console.log(`!!!!!!!!!!!!!!!!1Url from env is ${url}`)
        // const restClient = new RestClient(url)

        const axiosClient = axios.create({
          validateStatus: (status) => true,
          timeout: 1000,
        })

        const app = express()
        const router = ExRouter()
        router.get(url, async (req, res) => {
          const response = await axiosClient.get(`${dependencyUrl}/${mockedUrl}`)
          res.json({serverResponse: expectedServerResponse, mockResponse: expectedMockServerResponse})
        })
        app.use(router)
        return app
      }

      const testCtx = configureIntegrationTestCtxProvider<SomeEnvKeys, SomeMockServerNames>(
        expressClientAndServerProviderMaker(appProvider),
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
            "HttpMockServer3",
            "EnvKeyOne",
            koaMockServerTcpListenerFactory,
            {
              host: "localhost",
              protocol: "http",
            },
          ),
        ],
      )
      const ctx = await testCtx()

      await ctx.all.before()
      await ctx.each.before()

      ctx.httpMock.expect("HttpMockServer3", {
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

      const whenResponse = await ctx.when(() =>
        ctx.api.client().get<{
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

      await ctx.each.after()
      await ctx.all.after()
    })
  })
})
