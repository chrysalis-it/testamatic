import { WhenDeltaConfig } from "@chrysalis-it/testamatic"
import { DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb"

export type TableDiff<ROW extends object> = {
  added: ROW[]
  removed: ROW[]
  changed: ROW[]
}

export const dynamoTableDeltaConfigMaker = <ROW extends object>(
  dynamoClient: DynamoDBDocumentClient,
  tableName: string,
  partitionKeyName = "PK",
  sortKeyName = "SK",
): WhenDeltaConfig<ROW[], TableDiff<ROW>> => {
  const scan = scanMaker<ROW>(dynamoClient, tableName)

  return {
    snapshot: scan,
    diff: async (before: ROW[] = []): Promise<TableDiff<ROW>> => {
      const after = await scan()

      const beforeMap: Map<string, ROW> = new Map(
        before.map((beforeItem) => [beforeItem[partitionKeyName] + beforeItem[sortKeyName], beforeItem]),
      )
      const afterMap: Map<string, ROW> = new Map(
        after.map((afterItem) => [afterItem[partitionKeyName] + afterItem[sortKeyName], afterItem]),
      )
      const beforeKeys = Array.from(beforeMap.keys())
      const afterKeys: string[] = Array.from(afterMap.keys())

      const addedKeys = afterKeys.filter((afterKey) => !beforeKeys.includes(afterKey))
      const removedKeys = beforeKeys.filter((beforeKey) => !afterKeys.includes(beforeKey))
      const changedKeys = beforeKeys
        .filter((beforeKey) => !removedKeys.includes(beforeKey))
        .filter(
          (possiblyChangedKey) =>
            JSON.stringify(beforeMap.get(possiblyChangedKey)) !== JSON.stringify(afterMap.get(possiblyChangedKey)),
        )

      return Promise.resolve({
        added: addedKeys
          .map((addedKey) => afterMap.get(addedKey))
          .filter((possiblyUndefined) => possiblyUndefined != undefined),
        removed: removedKeys
          .map((removedKey) => beforeMap.get(removedKey))
          .filter((possiblyUndefined) => possiblyUndefined != undefined),
        changed: changedKeys
          .map((changedKey) => afterMap.get(changedKey))
          .filter((possiblyUndefined) => possiblyUndefined != undefined),
      })
    },
  }
}

const scanMaker =
  <ROW extends object>(dynamoClient: DynamoDBDocumentClient, tableName: string) =>
  async () => {
    const data = await dynamoClient.send(
      new ScanCommand({
        TableName: tableName,
      }),
    )
    return (data.Items ?? []) as ROW[]
  }
