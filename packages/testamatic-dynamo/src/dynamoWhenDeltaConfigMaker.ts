import { WhenDeltaConfig } from "@chrysalis-it/testamatic"
import { DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb"

export type DynamoID = {
  PK: string
  SK: number
}

export type DynamoRow<COLUMNS extends object> = DynamoID & COLUMNS

export const dynamoWhenDeltaConfigMaker = <COLUMNS extends object>(
  dynamoClient: DynamoDBDocumentClient,
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
  <COLUMNS extends object>(dynamoClient: DynamoDBDocumentClient, tableName: string) =>
  async () => {
    const data = await dynamoClient.send(
      new ScanCommand({
        TableName: tableName,
      }),
    )
    return (data.Items ?? []) as DynamoRow<COLUMNS>[]
  }
