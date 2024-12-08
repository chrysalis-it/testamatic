import { assertThat } from "mismatched"
import express, { Router as ExRouter } from "express"
import { RestClient } from "typed-rest-client"
import { logger } from "./logger/Logger"
import {
  ClientAndServerProvider,
  configureIntegrationTestCtxProvider,
  createAxiosInstance,
  expressClientAndServerProviderMaker,
  local,
  LocalEnvSetup,
  ServerStarter,
} from "@chrysalis-it/testamatic"
import {DynamoRow, DynamoTableSetup, dynamoWhenDeltaConfigMaker} from "@chrysalis-it/testamatic-dynamo"

type SomeEnvKeys = "EnvKeyOne" | "EnvKeyTwo"
type SomeMockServerNames = "HttpMockServer1" | "HttpMockServer2" | "HttpMockServer3"

type DynamoColumns = { col1: string; col2: string }
type WHENDELTA = DynamoRow<DynamoColumns>[]
describe.skip("configureIntegrationTestCtxFactory.integration", () => {

  describe("test runs with dynamo config", () => {
    const url = "/"
    const expectedResponse = "yes I am alive AND LIFE IS GOOD!"
    const simpleAppProvider = (): ServerStarter => {
      const app = express()
      const router = ExRouter()
      router.get(url, (req, res) => {
        res.json(expectedResponse)
      })
      app.use(router)
      return app
    }

    it("with dynamo when delta", async () => {
      const clientAndServerProvider: ClientAndServerProvider<SomeEnvKeys, RestClient> =
        expressClientAndServerProviderMaker(simpleAppProvider)

      const dynamoTestTableName = "dynamoTestTableName"
      const expectedDynamoRows: DynamoRow<DynamoColumns>[] = [
        {
          PK: "1",
          SK: 0,
          col1: "Hello",
          col2: "I am row 1",
        },
        {
          PK: "2",
          SK: 0,
          col1: "Hello",
          col2: "I am row 2",
        },
      ]

      const testCtx = configureIntegrationTestCtxProvider<SomeEnvKeys, string, WHENDELTA>(
        clientAndServerProvider,
        {
          defaultEnv: {
            EnvKeyOne: "EnvValueOne",
            EnvKeyTwo: "EnvValueTwo",
          },
          envSetup: new LocalEnvSetup(),
        },
        dynamoWhenDeltaConfigMaker<DynamoColumns>(local.awsClients.dynamoDocumentClient, dynamoTestTableName),
        [],
        [new DynamoTableSetup(dynamoTestTableName, local.awsClients.dynamoDb)]

      )
      const ctx = await testCtx()

      await ctx.all.before()
      await ctx.each.before()


      const whenResponse = await ctx.when(() => {
        local.awsClients.dynamoDocumentClient.put({
          Item: expectedDynamoRows[1],
          TableName: dynamoTestTableName,
        })

        local.awsClients.dynamoDocumentClient.put({
          Item: expectedDynamoRows[2],
          TableName: dynamoTestTableName,
        })

        return ctx.api.client().get<string>(url)
      })
      assertThat(whenResponse.delta).is(expectedDynamoRows)
      assertThat(whenResponse.response.statusCode).is(200)
      assertThat(whenResponse.response.result).is(expectedResponse)

      await ctx.each.after()
      await ctx.all.after()
    })
  })
})
