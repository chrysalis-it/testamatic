import { assertThat } from "mismatched"
import { match } from "mismatched"
import { DynamoTableSetup } from "./DynamoTableSetup"
import { simpleTableDefinitionMaker } from "./DynamoTableSetup"
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb"
import { DynamoDBClient } from "@aws-sdk/client-dynamodb"
import { dynamoTableDeltaCalculatorMaker } from "./dynamoTableDeltaCalculatorMaker"
import { dynamoTableFixtureMaker } from "./dynamo.fixture"
import { dynamoRowFixture } from "./dynamo.fixture"
import { DynamoTestRow } from "./dynamo.fixture"
import { dynamoMultiTableDeltaCalculatorMaker } from "./dynamoMultiTableDeltaCalculatorMaker"
import { someFixture } from "@chrysalis-it/some-fixture"

const localStackConfig = {
  endpoint: "http://localstack:4566",
  region: "ap-southeast-2",
  credentials: { accessKeyId: "wegeewg", secretAccessKey: "dwqdqdwq" },
  maxRetries: 3,
  timeout: 2000,
}

type TableNames = "testTableName1" | "testTableName2" | "testTableName3"
const tableNameList: TableNames[] = ["testTableName1", "testTableName2", "testTableName3"]

describe("dynamoTableDeltaConfigMaker.integration", () => {
  const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient(localStackConfig))

  const dynamoTableSetups: DynamoTableSetup[] = tableNameList.map(
    (tableName) => new DynamoTableSetup(dynamo, simpleTableDefinitionMaker(tableName)),
  )

  const dynamoTable1Fixture = dynamoTableFixtureMaker<DynamoTestRow>(dynamo, tableNameList[0])
  const dynamoTable2Fixture = dynamoTableFixtureMaker<DynamoTestRow>(dynamo, tableNameList[1])
  const dynamoTable3Fixture = dynamoTableFixtureMaker<DynamoTestRow>(dynamo, tableNameList[2])

  const whenDeltaConfig = dynamoMultiTableDeltaCalculatorMaker<TableNames, DynamoRow>({
    testTableName1: dynamoTableDeltaCalculatorMaker<DynamoRow>(dynamo, "testTableName1"),
    testTableName2: dynamoTableDeltaCalculatorMaker<DynamoRow>(dynamo, "testTableName2"),
    testTableName3: dynamoTableDeltaCalculatorMaker<DynamoRow>(dynamo, "testTableName3"),
  })
  const setup = () => Promise.allSettled(dynamoTableSetups.map((setup) => setup.setup()))
  const teardown = () => Promise.allSettled(dynamoTableSetups.map((setup) => setup.teardown()))

  beforeAll(() => teardown().then(setup))
  afterAll(() => teardown())

  const emptySnapshot = { added: [], removed: [], changed: [] }

  describe("snapshot", () => {
    it("when no rows", async () => {
      const snapshot = await whenDeltaConfig.snapshot()
      assertThat(snapshot).is({
        testTableName1: [],
        testTableName2: [],
        testTableName3: [],
      })
    })
    it("when rows exist", async () => {
      const table1Rows = await createTwoRows(dynamoTable1Fixture)
      const table2Rows = await createTwoRows(dynamoTable2Fixture)
      const table3Rows = await createTwoRows(dynamoTable3Fixture)

      const snapshot = await whenDeltaConfig.snapshot()

      assertThat(snapshot).is({
        testTableName1: match.array.unordered(table1Rows),
        testTableName2: match.array.unordered(table2Rows),
        testTableName3: match.array.unordered(table3Rows),
      })
    })
  })

  describe("diff", () => {
    const emptyTableDiff = {
      added: [],
      removed: [],
      changed: [],
    }

    describe("when no rows before", () => {
      it("and none added", async () => {
        //given
        const snapshot = await whenDeltaConfig.snapshot()

        //when
        const delta = await whenDeltaConfig.diff(snapshot)

        //then
        assertThat(delta).is({
          testTableName1: emptyTableDiff,
          testTableName2: emptyTableDiff,
          testTableName3: emptyTableDiff,
        })
      })
      it("and rows added", async () => {
        //given
        const before = await whenDeltaConfig.snapshot()

        //when
        const table1RowsAdded = await createTwoRows(dynamoTableFixtureMaker(dynamo, tableNameList[0]))
        const table2RowsAdded = await createTwoRows(dynamoTableFixtureMaker(dynamo, tableNameList[1]))
        const table3RowsAdded = await createTwoRows(dynamoTableFixtureMaker(dynamo, tableNameList[2]))

        //then
        const delta = await whenDeltaConfig.diff(before)

        console.log(JSON.stringify(delta))

        assertThat(delta).is({
          testTableName1: {
            removed: [],
            changed: [],
            added: match.array.unordered(table1RowsAdded),
          },
          testTableName2: {
            removed: [],
            changed: [],
            added: match.array.unordered(table2RowsAdded),
          },
          testTableName3: {
            removed: [],
            changed: [],
            added: match.array.unordered(table3RowsAdded),
          },
        })
      })
    })

    describe("when rows before", () => {
      it("and none added", async () => {
        //given
        const table1Rows = await createTwoRows(dynamoTable1Fixture)
        const table2Rows = await createTwoRows(dynamoTable2Fixture)
        const table3Rows = await createTwoRows(dynamoTable3Fixture)

        const snapshot = await whenDeltaConfig.snapshot()

        //when
        const delta = await whenDeltaConfig.diff(snapshot)

        //then
        assertThat(delta).is({
          testTableName1: emptyTableDiff,
          testTableName2: emptyTableDiff,
          testTableName3: emptyTableDiff,
        })
      })
      it("and rows added", async () => {
        //given
        await createTwoRows(dynamoTable1Fixture)
        await createTwoRows(dynamoTable2Fixture)
        await createTwoRows(dynamoTable3Fixture)

        const snapshot = await whenDeltaConfig.snapshot()
        const table1RowsAdded = await createTwoRows(dynamoTable1Fixture)
        const table2RowsAdded = await createTwoRows(dynamoTable2Fixture)
        const table3RowsAdded = await createTwoRows(dynamoTable3Fixture)

        //when
        const delta = await whenDeltaConfig.diff(snapshot)

        //then
        assertThat(delta).is({
          testTableName1: {
            removed: [],
            changed: [],
            added: match.array.unordered(table1RowsAdded),
          },
          testTableName2: {
            removed: [],
            changed: [],
            added: match.array.unordered(table2RowsAdded),
          },
          testTableName3: {
            removed: [],
            changed: [],
            added: match.array.unordered(table3RowsAdded),
          },
        })
      })
      it("and row removed", async () => {
        //given
        const table1Rows = await createTwoRows(dynamoTable1Fixture)

        const table2Rows = await createTwoRows(dynamoTable2Fixture)

        const table3Rows = await createTwoRows(dynamoTable3Fixture)

        const snapshot = await whenDeltaConfig.snapshot()

        await dynamoTable1Fixture.delete({ PK: table1Rows[0].PK, SK: table1Rows[0].SK })
        await dynamoTable2Fixture.delete({ PK: table2Rows[0].PK, SK: table2Rows[0].SK })
        await dynamoTable3Fixture.delete({ PK: table3Rows[0].PK, SK: table3Rows[0].SK })

        //when
        const delta = await whenDeltaConfig.diff(snapshot)

        //then
        assertThat(delta).is({
          testTableName1: {
            removed: [table1Rows[0]],
            changed: [],
            added: [],
          },
          testTableName2: {
            removed: [table2Rows[0]],
            changed: [],
            added: [],
          },
          testTableName3: {
            removed: [table3Rows[0]],
            changed: [],
            added: [],
          },
        })
      })
      it("and row changed", async () => {
        //given
        const table1ExistingRows = await createTwoRows(dynamoTable1Fixture)
        const table2ExistingRows = await createTwoRows(dynamoTable2Fixture)
        const table3ExistingRows = await createTwoRows(dynamoTable3Fixture)

        const snapshot = await whenDeltaConfig.snapshot()

        const table1Updated = await dynamoTable1Fixture.upsert({
          ...table1ExistingRows[0],
          col1: someFixture.someUniqueString("updatedValue table1"),
        })
        const table2Updated = await dynamoTable2Fixture.upsert({
          ...table2ExistingRows[0],
          col1: someFixture.someUniqueString("updatedValue table2"),
        })
        const table3Updated = await dynamoTable3Fixture.upsert({
          ...table3ExistingRows[0],
          col1: someFixture.someUniqueString("updatedValue table3"),
        })

        //when
        const delta = await whenDeltaConfig.diff(snapshot)

        //then
        assertThat(delta).is({
          testTableName1: {
            changed: [table1Updated],
            removed: [],
            added: [],
          },
          testTableName2: {
            changed: [table2Updated],
            removed: [],
            added: [],
          },
          testTableName3: {
            changed: [table3Updated],
            removed: [],
            added: [],
          },
        })
      })
    })
  })
})

type DynamoRowKey = { PK: string; SK: number }
type DynamoRow = DynamoRowKey & { col1: string; col2: string }

const createTwoRows = async (dynamoFixture: ReturnType<typeof dynamoTableFixtureMaker>) => {
  const createdRows = [dynamoRowFixture(dynamoFixture.tableName), dynamoRowFixture(dynamoFixture.tableName)]
  const settled = await Promise.allSettled(createdRows.map((row) => dynamoFixture.upsert(row)))
  if (settled.filter((x) => x.status === "rejected").length > 0)
    throw new Error("dynamoTableFixture failed to create rows")
  return createdRows
}
