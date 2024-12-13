import { assertThat } from "mismatched"
import express, { Router as ExRouter } from "express"
import { RestClient } from "typed-rest-client"
import {
  ClientAndServerProvider,
  configureIntegrationTestCtxProvider,
  expressClientAndServerProviderMaker,
  local,
  LocalEnvSetup,
  ServerStarter,
} from "@chrysalis-it/testamatic"

import { PutCommand } from "@aws-sdk/lib-dynamodb"

import { DynamoRow, DynamoTableSetup, dynamoWhenDeltaConfigMaker } from "@chrysalis-it/testamatic-dynamo"
import {match} from "mismatched";
import {simpleTableDefinitionMaker} from "@chrysalis-it/testamatic-dynamo";

type SomeEnvKeys = "EnvKeyOne" | "EnvKeyTwo"
type SomeMockServerNames = "HttpMockServer1" | "HttpMockServer2" | "HttpMockServer3"

type DynamoColumns = { col1: string; col2: string }
type WHENDELTA = DynamoRow<DynamoColumns>[]
describe("configureIntegrationTestCtxFactory.integration", () => {
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
        dynamoWhenDeltaConfigMaker<DynamoColumns>(local.awsClients.dynamo, dynamoTestTableName),
        [],
        [new DynamoTableSetup(local.awsClients.dynamo, simpleTableDefinitionMaker(dynamoTestTableName))],
      )
      const ctx = await testCtx()

      await ctx.all.before()
      await ctx.each.before()

      const whenResponse = await ctx.when(async () => {
        await local.awsClients.dynamo.send(
          new PutCommand({
            TableName: dynamoTestTableName,
            Item: expectedDynamoRows[0],
          }),
        )
        await local.awsClients.dynamo.send(
          new PutCommand({
            TableName: dynamoTestTableName,
            Item: expectedDynamoRows[1],
          }),
        )

        return ctx.api.client().get<string>(url)
      })
      assertThat(whenResponse.delta).is(match.array.unordered(expectedDynamoRows))
      assertThat(whenResponse.response.statusCode).is(200)
      assertThat(whenResponse.response.result).is(expectedResponse)

      await ctx.each.after()
      await ctx.all.after()
    })
  })
})
