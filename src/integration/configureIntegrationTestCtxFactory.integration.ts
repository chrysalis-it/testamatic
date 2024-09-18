import { configureIntegrationTestCtxProvider } from "./configureIntegrationTestCtxFactory"
import { ParamStoreEnvSetup } from "../env/parameterstore/ParameterStoreEnvSetup"
import { local } from "../test/local"
import { EnvVars } from "./IntegrationTestCtx"
import { TcpListener } from "../tcp/tcp.types"
import { assertThat } from "mismatched"
import { expressTcpListenerFactory } from "../packages/koa/expressTcpListenerFactory"
import { Router as ExRouter } from "express"

type SomeEnvKeys = "EnvKeyOne" | "EnvKeyTwo"
type SomeMockServerNames = "HttpMockServer1" | "HttpMockServer2" | "HttpMockServer3"
const pstorePath = "some/pstore/path"

const expressTcpListener =
  (router: ExRouter) =>
  async (env: EnvVars<SomeEnvKeys>): Promise<TcpListener> => {
    return expressTcpListenerFactory(
      {
        port: 9999,
        host: "localhost",
        protocol: "http",
      },
      router,
      "app under test",
    )
  }

describe("configureIntegrationTestCtxFactory.integration", () => {
  describe("test runs with", () => {

    it("server config only", async () => {
      const router = ExRouter()
      const url = "/"
      const expectedResponse = "yes I am alive AND LIFE IS GOOD!"
      router.get(url, (req, res) => {
        res.json(expectedResponse)
      })

      const testCtx = configureIntegrationTestCtxProvider(
        expressTcpListener(router),
      )
      
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
      const router = ExRouter()
      const url = "/"
      const expectedResponse = "yes I am alive AND LIFE IS GOOD!"
      router.get(url, (req, res) => {
        res.json(expectedResponse)
      })

      const testCtx = configureIntegrationTestCtxProvider<SomeEnvKeys>(
        expressTcpListener(router),
        {
          defaultEnv: {
            EnvKeyOne: "EnvValueOne",
            EnvKeyTwo: "EnvValueTwo",
          },
          envSetup: new ParamStoreEnvSetup(pstorePath, local.awsClients.ssm)
        }
        
      )
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
      const router = ExRouter()
      const url = "/"
      const expectedResponse = "yes I am alive AND LIFE IS GOOD!"
      router.get(url, (req, res) => {
        res.json(expectedResponse)
      })

      const expectedDelta = {value: 2};
      const testCtx = configureIntegrationTestCtxProvider<SomeEnvKeys, string, {value: number}>(
        expressTcpListener(router),
        {
          defaultEnv: {
            EnvKeyOne: "EnvValueOne",
            EnvKeyTwo: "EnvValueTwo",
          },
          envSetup: new ParamStoreEnvSetup(pstorePath, local.awsClients.ssm)
        },
        {
          snapshot: () => Promise.resolve({value: 1}),
          diff: (first: {value: number}) => Promise.resolve(expectedDelta),
        }
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
    it.skip("with mock servers", async () => {
      const router = ExRouter()
      const url = "/"
      const expectedResponse = "yes I am alive AND LIFE IS GOOD!"
      router.get(url, (req, res) => {
        res.json(expectedResponse)
      })

      const testCtx = configureIntegrationTestCtxProvider<SomeEnvKeys, SomeMockServerNames>(
        expressTcpListener(router),
        {
          defaultEnv: {
            EnvKeyOne: "EnvValueOne",
            EnvKeyTwo: "EnvValueTwo",
          },
          envSetup: new ParamStoreEnvSetup(pstorePath, local.awsClients.ssm),
        },
        {
          snapshot: () => Promise.resolve({}),
          diff: (first: {}) => Promise.resolve({}),
        },
      )
      const ctx = await testCtx()

      await ctx.all.before()
      await ctx.each.before()

      ctx.httpMock.expect("HttpMockServer3", {
        requestMatcher: {
          url: url,
          method: "GET",
        },
        response: {
          status: 200,
          statusText: "OK",
          body: "Hello I am a mocked dependency",
        },
      })

      const whenResponse = await ctx.when(() => ctx.api.client().get<string>(url))
      assertThat(whenResponse.delta).is({})
      assertThat(whenResponse.response.statusCode).is(200)
      assertThat(whenResponse.response.result).is(expectedResponse)

      await ctx.each.after()
      await ctx.all.after()
    })
  })
})
