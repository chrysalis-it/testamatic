import { assertThat } from "mismatched"
import { match } from "mismatched"
import express, { Router as ExRouter } from "express"
import { RestClient } from "typed-rest-client"
import {
  ClientAndServerProvider,
  configureIntegrationTestCtxProvider,
  LocalEnvSetup,
  restClientAndExpressServerProviderMaker,
  ServerStarter,
} from "@chrysalis-it/testamatic"
import { consoleLogger } from "@chrysalis-it/testamatic"
import { HttpConfig } from "@chrysalis-it/testamatic"

import { PutCommand } from "@aws-sdk/lib-dynamodb"

import { dynamoEventStoreDeltaConfigMaker, DynamoTableSetup } from "@chrysalis-it/testamatic-dynamo"
import { simpleTableDefinitionMaker } from "@chrysalis-it/testamatic-dynamo"
import { TableDiff } from "@chrysalis-it/testamatic-dynamo"
import { local } from "./local"
import http from "http"
import {dynamoTableDeltaConfigMaker} from "@chrysalis-it/testamatic-dynamo";

type SomeEnvKeys = "EnvKeyOne" | "EnvKeyTwo"

type DynamoColumns = { PK: string; SK: number; col1: string; col2: string }
describe("configureIntegrationTestCtxFactory.integration", () => {
  describe("test runs with dynamo config", () => {
    const url = "/"
    const expectedResponse = "yes I am alive AND LIFE IS GOOD!"

    const simpleServerStarter: ServerStarter = (httpConfig: HttpConfig) => {
      const expressApp = express()
      const router = ExRouter()
      router.get(url, (req, res) => {
        res.json(expectedResponse)
      })
      expressApp.use(router)
      return Promise.resolve(http.createServer(expressApp).listen(httpConfig.port))
    }

    it("with dynamo when delta", async () => {
      const clientAndServerProvider: ClientAndServerProvider<SomeEnvKeys, RestClient> =
        restClientAndExpressServerProviderMaker(simpleServerStarter, "Test", consoleLogger)

      const dynamoTestTableName = "dynamoTestTableName"
      const expectedDynamoRows: DynamoColumns[] = [
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

      const testCtx = configureIntegrationTestCtxProvider<
        SomeEnvKeys,
        string,
        DynamoColumns[],
        TableDiff<DynamoColumns>
      >(
        clientAndServerProvider,
        consoleLogger,
        {
          defaultEnv: {
            EnvKeyOne: "EnvValueOne",
            EnvKeyTwo: "EnvValueTwo",
          },
          envSetup: new LocalEnvSetup(consoleLogger),
        },
        dynamoTableDeltaConfigMaker<DynamoColumns>(local.awsClients.dynamo, dynamoTestTableName),
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
      assertThat(whenResponse.delta).is({
        removed: [],
        added: match.array.unordered(expectedDynamoRows),
        changed: [],
      })
      assertThat(whenResponse.response.statusCode).is(200)
      assertThat(whenResponse.response.result).is(expectedResponse)

      await ctx.each.after()
      await ctx.all.after()
    })
  })
})
