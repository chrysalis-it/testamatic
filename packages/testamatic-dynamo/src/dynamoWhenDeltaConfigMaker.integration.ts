import { assertThat } from "mismatched"
import { match } from "mismatched"
import { DynamoTableSetup } from "./DynamoTableSetup"
import { simpleTableDefinitionMaker } from "./DynamoTableSetup"
import { dynamoWhenDeltaConfigMaker } from "./dynamoWhenDeltaConfigMaker"
import { DynamoRow } from "./dynamoWhenDeltaConfigMaker"
import { PutCommand } from "@aws-sdk/lib-dynamodb"
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb"
import { someFixture } from "@chrysalis-it/some-fixture"
import { DynamoDBClient } from "@aws-sdk/client-dynamodb"

const localStackConfig = {
  endpoint: "http://localstack:4566",
  region: "ap-southeast-2",
  credentials: { accessKeyId: "wegeewg", secretAccessKey: "dwqdqdwq" },
  maxRetries: 3,
  timeout: 2000,
}

describe("dynamoWhenDeltaConfigMaker.integration", () => {
  const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient(localStackConfig))
  const TABLE_NAME = "testTableName"
  const dynamoTableSetup = new DynamoTableSetup(dynamo, simpleTableDefinitionMaker(TABLE_NAME))
  const whenDeltaConfig = dynamoWhenDeltaConfigMaker(dynamo, TABLE_NAME)

  beforeAll(async () => await dynamoTableSetup.setup())
  afterAll(async () => await dynamoTableSetup.teardown())

  describe("snapshot", () => {
    it("when no rows", async () => {
      const whenDeltaConfig = dynamoWhenDeltaConfigMaker(dynamo, TABLE_NAME)
      const snapshot = await whenDeltaConfig.snapshot()
      assertThat(snapshot).is([])
    })
    it("when rows exist", async () => {
      const whenDeltaConfig = dynamoWhenDeltaConfigMaker(dynamo, TABLE_NAME)

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

      await dynamo.send(
        new PutCommand({
          TableName: TABLE_NAME,
          Item: expectedDynamoRows[0],
        }),
      )
      await dynamo.send(
        new PutCommand({
          TableName: TABLE_NAME,
          Item: expectedDynamoRows[1],
        }),
      )

      const snapshot = await whenDeltaConfig.snapshot()
      assertThat(snapshot).is(expectedDynamoRows)
    })
  })

  describe("delta", () => {
    describe("when no rows before", () => {
      it("and none added", async () => {
        //given
        const snapshot = await whenDeltaConfig.snapshot()

        //when
        const delta = await whenDeltaConfig.diff(snapshot)

        //then
        assertThat(delta).is([])
      })

      it("and rows added", async () => {
        //given
        const before = await whenDeltaConfig.snapshot()
        console.log(JSON.stringify(before))

        //when
        const expectedDelta = await createTwoRows(TABLE_NAME, dynamo)

        //then
        const delta = await whenDeltaConfig.diff(before)

        console.log(JSON.stringify(delta))

        assertThat(delta).is(match.array.unordered(expectedDelta))
      })
    })

    describe("when rows before", () => {
      it("and none added", async () => {
        //given
        await createTwoRows(TABLE_NAME, dynamo)
        const snapshot = await whenDeltaConfig.snapshot()

        //when
        const delta = await whenDeltaConfig.diff(snapshot)

        //then
        assertThat(delta).is(match.array.unordered([]))
      })

      it("and rows added", async () => {
        //given
        await createTwoRows(TABLE_NAME, dynamo)
        const snapshot = await whenDeltaConfig.snapshot()
        const rowsAdded = await createTwoRows(TABLE_NAME, dynamo)

        //when
        const delta = await whenDeltaConfig.diff(snapshot)

        //then
        assertThat(delta).is(match.array.unordered(rowsAdded))
      })
    })
  })
})

type DynamoColumns = { col1: string; col2: string }

const createTwoRows = async (table_name: string, dynamo: DynamoDBDocumentClient) => {
  const expectedDynamoRows: DynamoRow<DynamoColumns>[] = [
    {
      PK: someFixture.someUniqueString("PK"),
      SK: 0,
      col1: someFixture.someUniqueString("col1"),
      col2: someFixture.someUniqueString("col2"),
    },
    {
      PK: someFixture.someUniqueString("PK"),
      SK: 0,
      col1: someFixture.someUniqueString("col1"),
      col2: someFixture.someUniqueString("col2"),
    },
  ]
  await dynamo.send(
    new PutCommand({
      TableName: table_name,
      Item: expectedDynamoRows[0],
    }),
  )
  await dynamo.send(
    new PutCommand({
      TableName: table_name,
      Item: expectedDynamoRows[1],
    }),
  )
  return expectedDynamoRows
}
