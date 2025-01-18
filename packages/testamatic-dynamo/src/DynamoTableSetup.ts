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
