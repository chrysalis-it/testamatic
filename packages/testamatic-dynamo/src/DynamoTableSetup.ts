import { DynamoDBClient } from "@aws-sdk/client-dynamodb"
import { CreateTableCommand } from "@aws-sdk/client-dynamodb"
import { DeleteTableCommand } from "@aws-sdk/client-dynamodb"
import { ListTablesCommand } from "@aws-sdk/client-dynamodb"
import { CreateTableInput } from "@aws-sdk/client-dynamodb"
import { Given } from "@chrysalis-it/testamatic"

export type TableDefinition = CreateTableInput & { TableName: string }

export class DynamoTableSetup implements Given {
  constructor(
    public dynamoDB: DynamoDBClient,
    private tableDefinition: TableDefinition = simpleTableDefinitionMaker(),
  ) {}

  public async setup(): Promise<void> {
    const exists = await this.tableExists()
    if (!exists) {
      await this.dynamoDB.send(new CreateTableCommand(this.tableDefinition))
      console.log(`dynamo table setup complete, ${this.tableDefinition.TableName}`)
    }
  }

  public async teardown(): Promise<void> {
    const exists = await this.tableExists()
    if (exists) {
      await this.dynamoDB.send(new DeleteTableCommand({ TableName: this.tableDefinition.TableName }))
      console.log(`dynamo teardown complete, ${this.tableDefinition.TableName}`)
    }
  }

  private async tableExists() {
    const tableNamesOutput = await this.dynamoDB.send(new ListTablesCommand())
    const exists = (tableNamesOutput.TableNames ?? []).includes(this.tableDefinition.TableName)
    return exists
  }
}

export const simpleTableDefinitionMaker = (
  tableName = "dynamoTableForTesting",
  pkName = "PK",
  skName = "SK",
): TableDefinition => ({
  TableName: tableName,
  KeySchema: [
    {
      AttributeName: pkName,
      KeyType: "HASH", //Partition key
    },
    {
      AttributeName: skName,
      KeyType: "RANGE", //Sort key
    },
  ],
  AttributeDefinitions: [
    {
      AttributeName: "PK",
      AttributeType: "S",
    },
    {
      AttributeName: "SK",
      AttributeType: "N",
    },
  ],
  ProvisionedThroughput: {
    ReadCapacityUnits: 1,
    WriteCapacityUnits: 1,
  },
})

async function waitForDynamoTableStatus(
  tableName: string,
  timeoutMs: number,
  statusPredicate: (status: string | undefined) => boolean,
  intervalMs: number
): Promise<TableStatus | undefined> {
  const pollTable = async (): Promise<TableStatus | undefined> => {
    try {
      const tableState = await client.send(new DescribeTableCommand({ TableName: tableName }))
      return tableState.Table?.TableStatus
    } catch (e) {
      // Table has gone so dont raise an error...
      if (e instanceof ResourceNotFoundException) return
      throw e
    }
  }

  return new Promise<TableStatus | undefined>((resolve, reject) => {
    let timeout = timeoutMs
    const interval = setInterval(async () => {
      try {
        const status = await pollTable()
        timeout -= intervalMs
        // console.log(`Status: ${status}, timeoutMs: ${timeoutMs}, Remaining: ${timeout}`)

        if (statusPredicate(status)) {
          clearInterval(interval)
          return resolve(status)
        }

        logger.info(`Table Status: ${status} retrying`)

        if (timeout <= 0) {
          clearInterval(interval)
          const errorMessage = `Timeout Wait For Dynamo Table(${tableName}) Status:${status}`
          logger.error(errorMessage, null)
          return reject(new Error(errorMessage))
        }
      } catch (e) {
        clearInterval(interval)
        const errorMessage = `Unexpected error Wait For Dynamo Table(${tableName})`
        logger.error(errorMessage, null)
        return reject(e)
      }
    }, intervalMs)
  })
}