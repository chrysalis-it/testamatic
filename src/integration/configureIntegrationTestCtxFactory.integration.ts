import {configureIntegrationTestCtxProvider, ServerProvider} from "./configureIntegrationTestCtxFactory"
import { ParamStoreEnvSetup } from "../env/parameterstore/ParameterStoreEnvSetup"
import { local } from "../test/local"
import {EnvVars} from "./IntegrationTestCtx"
import { koaTcpListenerFactory } from "../packages/koa/koaTcpListenerFactory"
import { TcpListener } from "../tcp/tcp.types"
import {assertThat} from "mismatched";
import { Router as KoaRouter } from "@koa/router";
import {expressTcpListenerFactory} from "../packages/koa/expressTcpListenerFactory";
import express, { Router as ExRouter } from "express"
import {logger} from "../logger/Logger";

type SomeEnvKeys = "EnvKeyOne" | "EnvKeyTwo"
type SomeMockServerNames = "HttpMockServer1" | "HttpMockServer2" | "HttpMockServer3"
const pstorePath = "some/pstore/path"

const expressTcpListener =  (router: ExRouter) => async (env: EnvVars<SomeEnvKeys>): Promise<TcpListener> => {
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
    it.only("no mock servers", async () => {
      const router = ExRouter()
      const url = "/";
      const expectedResponse = "yes I am alive AND LIFE IS GOOD!";
      router.get( url, (req, res) => {
        res.json(expectedResponse)
      })

      const testCtx = configureIntegrationTestCtxProvider<SomeEnvKeys>(
        {
          EnvKeyOne: "EnvValueOne",
          EnvKeyTwo: "EnvValueTwo",
        },
        new ParamStoreEnvSetup(pstorePath, local.awsClients.ssm),
        {
          snapshot: () => Promise.resolve({}),
          diff: (first: {}) => Promise.resolve({}),
        },
        expressTcpListener(router),
      )
      const ctx = await testCtx()


      await ctx.all.before()
      await ctx.each.before()

      const whenResponse = await ctx.when(() => ctx.api.client().get<string>(url))
      assertThat(whenResponse.delta).is({});
      assertThat(whenResponse.response.statusCode).is(200);
      assertThat(whenResponse.response.result).is(expectedResponse)

      await ctx.each.after()
      await ctx.all.after()

    })

    it("mock servers", async () => {
      const router = ExRouter()
      const url = "/";
      const expectedResponse = "yes I am alive AND LIFE IS GOOD!";
      router.get( url, (req, res) => {
        res.send(expectedResponse)
      })

      const testCtx = configureIntegrationTestCtxProvider<SomeEnvKeys>(
        {
          EnvKeyOne: "EnvValueOne",
          EnvKeyTwo: "EnvValueTwo",
        },
        new ParamStoreEnvSetup(pstorePath, local.awsClients.ssm),
        {
          snapshot: () => Promise.resolve({}),
          diff: (first: {}) => Promise.resolve({}),
        },
        expressTcpListener(router),
      )
      const ctx = await testCtx()
      const whenResponse = await ctx.when(() => ctx.api.client().get<string>(url))

      assertThat(whenResponse.delta).is({});
      assertThat(whenResponse.response.statusCode).is(200);

    })

  })
})
