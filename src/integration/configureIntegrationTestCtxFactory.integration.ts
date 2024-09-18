import {ClientAndServerProvider, configureIntegrationTestCtxProvider} from "./configureIntegrationTestCtxFactory"
import { ParamStoreEnvSetup } from "../env/parameterstore/ParameterStoreEnvSetup"
import { local } from "../test/local"
import { assertThat } from "mismatched"
import express, { Router as ExRouter } from "express"
import {ExpressAppProvider, expressClientAndServerProviderMaker} from "./expressClientAndServerProviderMaker"
import {RestClient} from "typed-rest-client";

type SomeEnvKeys = "EnvKeyOne" | "EnvKeyTwo"
type SomeMockServerNames = "HttpMockServer1" | "HttpMockServer2" | "HttpMockServer3"
const pstorePath = "some/pstore/path"

describe("configureIntegrationTestCtxFactory.integration", () => {
  const url = "/"
  const expectedResponse = "yes I am alive AND LIFE IS GOOD!"
  const simpleAppProvider: ExpressAppProvider<SomeEnvKeys> = (env) => {
    const app = express()
    const router = ExRouter()
    router.get(url, (req, res) => {
      res.json(expectedResponse)
    })
    app.use(router)
    return app
  }

  describe("test runs with", () => {
    it("server config only", async () => {

      const clientAndServerProvider: ClientAndServerProvider<SomeEnvKeys, RestClient> = expressClientAndServerProviderMaker(simpleAppProvider);
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
      const clientAndServerProvider: ClientAndServerProvider<SomeEnvKeys, RestClient> = expressClientAndServerProviderMaker(simpleAppProvider);

      const testCtx = configureIntegrationTestCtxProvider<SomeEnvKeys>(clientAndServerProvider, {
        defaultEnv: {
          EnvKeyOne: "EnvValueOne",
          EnvKeyTwo: "EnvValueTwo",
        },
        envSetup: new ParamStoreEnvSetup(pstorePath, local.awsClients.ssm),
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
      const clientAndServerProvider: ClientAndServerProvider<SomeEnvKeys, RestClient> = expressClientAndServerProviderMaker(simpleAppProvider);

      const expectedDelta = { value: 2 }
      const testCtx = configureIntegrationTestCtxProvider<SomeEnvKeys, string, { value: number }>(
        clientAndServerProvider,
        {
          defaultEnv: {
            EnvKeyOne: "EnvValueOne",
            EnvKeyTwo: "EnvValueTwo",
          },
          envSetup: new ParamStoreEnvSetup(pstorePath, local.awsClients.ssm),
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
    it.skip("with mock servers", async () => {
      const clientAndServerProvider: ClientAndServerProvider<SomeEnvKeys, RestClient> = expressClientAndServerProviderMaker(simpleAppProvider);

      const testCtx = configureIntegrationTestCtxProvider<SomeEnvKeys, SomeMockServerNames>(
        clientAndServerProvider,
        {
          defaultEnv: {
            EnvKeyOne: "EnvValueOne",
            EnvKeyTwo: "EnvValueTwo",
          },
          envSetup: new ParamStoreEnvSetup(pstorePath, local.awsClients.ssm),
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
