import { assertThat } from "mismatched"
import { match } from "mismatched"
import { DynamoTableSetup } from "./DynamoTableSetup"
import { simpleTableDefinitionMaker } from "./DynamoTableSetup"
import { PutCommand } from "@aws-sdk/lib-dynamodb"
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb"
import { someFixture } from "@chrysalis-it/some-fixture"
import { DynamoDBClient } from "@aws-sdk/client-dynamodb"
import { dynamoTableDeltaConfigMaker } from "./dynamoTableDeltaConfigMaker"
import { dynamoTableFixtureMaker } from "./dynamo.fixture"
import { dynamoRowFixture } from "./dynamo.fixture"

const localStackConfig = {
  endpoint: "http://localstack:4566",
  region: "ap-southeast-2",
  credentials: { accessKeyId: "wegeewg", secretAccessKey: "dwqdqdwq" },
  maxRetries: 3,
  timeout: 2000,
}

describe("dynamoTableDeltaConfigMaker.integration", () => {
  const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient(localStackConfig))
  const TABLE_NAME = "testTableName"
  const dynamoTableSetup = new DynamoTableSetup(dynamo, simpleTableDefinitionMaker(TABLE_NAME))

  const dynamoTableFixture = dynamoTableFixtureMaker<DynamoRow>(dynamo, TABLE_NAME)
  const whenDeltaConfig = dynamoTableDeltaConfigMaker<DynamoRow>(dynamo, TABLE_NAME)

  beforeAll(async () => await dynamoTableSetup.setup())
  afterAll(async () => await dynamoTableSetup.teardown())

  describe("snapshot", () => {
    it("when no rows", async () => {
      const snapshot = await whenDeltaConfig.snapshot()
      assertThat(snapshot).is([])
    })
    it("when rows exist", async () => {
      const expectedDynamoRows: DynamoRow[] = [
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
        assertThat(delta).is({
          added: [],
          removed: [],
          changed: [],
        })
      })
      it("and rows added", async () => {
        //given
        const before = await whenDeltaConfig.snapshot()
        console.log(JSON.stringify(before))

        //when
        const expectedDelta = await createTwoRows(dynamoTableFixture)

        //then
        const delta = await whenDeltaConfig.diff(before)

        console.log(JSON.stringify(delta))

        assertThat(delta).is({
          added: match.array.unordered(expectedDelta),
          removed: [],
          changed: [],
        })
      })
    })

    describe("when rows before", () => {
      it("and none added", async () => {
        //given
        await createTwoRows(dynamoTableFixture)
        const snapshot = await whenDeltaConfig.snapshot()

        //when
        const delta = await whenDeltaConfig.diff(snapshot)

        //then
        assertThat(delta).is({
          added: [],
          removed: [],
          changed: [],
        })
      })
      it("and rows added", async () => {
        //given
        await createTwoRows(dynamoTableFixture)
        const snapshot = await whenDeltaConfig.snapshot()
        const rowsAdded = await createTwoRows(dynamoTableFixture)

        //when
        const delta = await whenDeltaConfig.diff(snapshot)

        //then
        assertThat(delta).is({
          added: match.array.unordered(rowsAdded),
          removed: [],
          changed: [],
        })
      })
      it("and row removed", async () => {
        //given
        const existingRows = await createTwoRows(dynamoTableFixture)
        const snapshot = await whenDeltaConfig.snapshot()
        await dynamoTableFixture.delete({ PK: existingRows[0].PK, SK: existingRows[0].SK })

        //when
        const delta = await whenDeltaConfig.diff(snapshot)

        //then
        assertThat(delta).is({
          added: [],
          removed: [existingRows[0]],
          changed: [],
        })
      })
      it("and row changed", async () => {
        //given
        const existingRows = await createTwoRows(dynamoTableFixture)
        const snapshot = await whenDeltaConfig.snapshot()
        const updatedRow = { ...existingRows[0], col1: someFixture.someUniqueString("updatedValue") }
        await dynamoTableFixture.upsert(updatedRow)

        //when
        const delta = await whenDeltaConfig.diff(snapshot)

        //then
        assertThat(delta).is({
          added: [],
          removed: [],
          changed: [updatedRow],
        })
      })
    })
  })
})

type DynamoRowKey = { PK: string; SK: number }
type DynamoRow = DynamoRowKey & { col1: string; col2: string }

const createTwoRows = async (dyamoClient: ReturnType<typeof dynamoTableFixtureMaker>) => {
  const createdRows = [dynamoRowFixture(), dynamoRowFixture()]
  return Promise.allSettled(createdRows.map((row) => dyamoClient.upsert(row))).then(() => createdRows)
}
