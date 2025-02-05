import { WhenDeltaCalculator } from "@chrysalis-it/testamatic"
import { DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb"

export type DynamoID = {
  PK: string
  SK: number
}

export const dynamoEventStoreDeltaCalculatorMaker = <COLUMNS extends object>(
  dynamoClient: DynamoDBDocumentClient,
  tableName: string,
  partitionKeyName = "PK",
  sortKeyName = "SK",
): WhenDeltaCalculator<COLUMNS[], COLUMNS[]> => {
  const scan = scanMaker<COLUMNS>(dynamoClient, tableName)

  return {
    snapshot: scan,
    diff: async (before: COLUMNS[] = []): Promise<COLUMNS[]> => {
      const after = await scan()
      return after.filter(
        (afterItem) =>
          !before.some(
            (beforeItem) =>
              beforeItem[partitionKeyName] + beforeItem[sortKeyName] ===
              afterItem[partitionKeyName] + afterItem[sortKeyName],
          ),
      )
    },
  }
}

const scanMaker =
  <COLUMNS extends object>(dynamoClient: DynamoDBDocumentClient, tableName: string) =>
  async () => {
    const data = await dynamoClient.send(
      new ScanCommand({
        TableName: tableName,
      }),
    )
    return (data.Items ?? []) as COLUMNS[]
  }
