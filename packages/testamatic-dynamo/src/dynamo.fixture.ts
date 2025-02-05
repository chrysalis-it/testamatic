import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb"
import { PutCommand } from "@aws-sdk/lib-dynamodb"
import { DeleteCommand } from "@aws-sdk/lib-dynamodb"
import { someFixture } from "@chrysalis-it/some-fixture"

export type DynamoTestRow = { PK: string; SK: number; col1: string; col2: string }

export const dynamoRowFixture = (tableName = "someTable"): DynamoTestRow => ({
  PK: someFixture.someUniqueString("PK"),
  SK: 0,
  col1: someFixture.someUniqueString(`${tableName}.col1`),
  col2: someFixture.someUniqueString(`${tableName}.col2`),
})

export const dynamoTableFixtureMaker = <ROW extends object>(dynamo: DynamoDBDocumentClient, table_name: string) => ({
  tableName: table_name,
  upsert: async (row: ROW) => {
    await dynamo.send(
      new PutCommand({
        TableName: table_name,
        Item: row,
      }),
    )
    return row
  },
  delete: async (key: Partial<ROW>) => {
    await dynamo.send(
      new DeleteCommand({
        TableName: table_name,
        Key: key,
      }),
    )
  },
})
