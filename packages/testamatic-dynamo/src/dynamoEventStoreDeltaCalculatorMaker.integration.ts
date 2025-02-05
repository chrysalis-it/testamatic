import { assertThat } from "mismatched"
import { match } from "mismatched"
import { DynamoTableSetup } from "./DynamoTableSetup"
import { simpleTableDefinitionMaker } from "./DynamoTableSetup"
import { dynamoEventStoreDeltaCalculatorMaker } from "./dynamoEventStoreDeltaCalculatorMaker"
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb"
import { DynamoDBClient } from "@aws-sdk/client-dynamodb"
import { dynamoRowFixture } from "./dynamo.fixture"
import { dynamoTableFixtureMaker } from "./dynamo.fixture"

const localStackConfig = {
  endpoint: "http://localstack:4566",
  region: "ap-southeast-2",
  credentials: { accessKeyId: "wegeewg", secretAccessKey: "dwqdqdwq" },
  maxRetries: 3,
  timeout: 2000,
}

describe("dynamoEventStoreDeltaConfigMaker.integration", () => {
  const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient(localStackConfig))
  const TABLE_NAME = "testTableName"
  const dynamoTableSetup = new DynamoTableSetup(dynamo, simpleTableDefinitionMaker(TABLE_NAME))
  const whenDeltaConfig = dynamoEventStoreDeltaCalculatorMaker(dynamo, TABLE_NAME)
  const dyamoFixture = dynamoTableFixtureMaker(dynamo, TABLE_NAME)

  beforeAll(async () => await dynamoTableSetup.setup())
  afterAll(async () => await dynamoTableSetup.teardown())

  describe("snapshot", () => {
    it("when no rows", async () => {
      //given
      const whenDeltaConfig = dynamoEventStoreDeltaCalculatorMaker(dynamo, TABLE_NAME)

      //when
      const snapshot = await whenDeltaConfig.snapshot()

      //then
      assertThat(snapshot).is([])
    })
    it("when rows exist", async () => {
      //given
      const whenDeltaConfig = dynamoEventStoreDeltaCalculatorMaker(dynamo, TABLE_NAME)
      const expectedDynamoRows = await createTwoRows(dyamoFixture)

      //when
      const snapshot = await whenDeltaConfig.snapshot()

      //then
      assertThat(snapshot).is(match.array.unordered(expectedDynamoRows))
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
        const expectedDelta = await createTwoRows(dyamoFixture)

        //then
        const delta = await whenDeltaConfig.diff(before)

        console.log(JSON.stringify(delta))

        assertThat(delta).is(match.array.unordered(expectedDelta))
      })
    })

    describe("when rows before", () => {
      it("and none added", async () => {
        //given
        const existingRows = await createTwoRows(dyamoFixture)
        const snapshot = await whenDeltaConfig.snapshot()

        //when
        const delta = await whenDeltaConfig.diff(snapshot)

        //then
        assertThat(delta).is(match.array.unordered([]))
      })

      it("and rows added", async () => {
        //given
        const existingRows = await createTwoRows(dyamoFixture)
        const snapshot = await whenDeltaConfig.snapshot()

        const rowsAdded = await createTwoRows(dyamoFixture)

        //when
        const delta = await whenDeltaConfig.diff(snapshot)

        //then
        assertThat(delta).is(match.array.unordered(rowsAdded))
      })
    })
  })
})

const createTwoRows = async (dyamoClient: ReturnType<typeof dynamoTableFixtureMaker>) => {
  const createdRows = [dynamoRowFixture(), dynamoRowFixture()]
  return Promise.allSettled(createdRows.map((row) => dyamoClient.upsert(row))).then(() => createdRows)
}
