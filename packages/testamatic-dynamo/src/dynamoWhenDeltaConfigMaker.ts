import DynamoDB = require("aws-sdk/clients/dynamodb")
import { WhenDeltaConfig } from "@chrysalis-it/testamatic"
import { PrettyPrinter } from "mismatched"

export type DynamoID = {
  PK: string
  SK: number
}

export type DynamoRow<COLUMNS extends object> = DynamoID & COLUMNS

export const dynamoWhenDeltaConfigMaker = <COLUMNS extends object>(
  dynamoClient: DynamoDB.DocumentClient,
  tableName: string,
): WhenDeltaConfig<DynamoRow<COLUMNS>[]> => {
  const scan = scanMaker<COLUMNS>(dynamoClient, tableName)

  return {
    snapshot: scan,
    diff: async (before: DynamoRow<COLUMNS>[] = []): Promise<DynamoRow<COLUMNS>[]> => {
      const after = await scan()
      return after.filter(
        (afterItem) => !before.some((beforeItem) => beforeItem.PK + beforeItem.SK === afterItem.PK + afterItem.SK),
      )
    },
  }
}

const scanMaker =
  <COLUMNS extends object>(dynamoClient: DynamoDB.DocumentClient, tableName: string) =>
  async () => {
    const input: DynamoDB.Types.ScanInput = {
      TableName: tableName,
    }
    const data = await dynamoClient.scan(input).promise()
    return (data.Items ?? []) as DynamoRow<COLUMNS>[]
  }

const printMaker = (dynamoClient: DynamoDB.DocumentClient, tableName: string) => async () =>
  console.log(`Table content => ${PrettyPrinter.make().render(await scanMaker(dynamoClient, tableName))}`)
