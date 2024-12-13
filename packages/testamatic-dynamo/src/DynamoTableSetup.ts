import { DynamoDBClient } from "@aws-sdk/client-dynamodb"
import { CreateTableCommand } from "@aws-sdk/client-dynamodb"
import { DeleteTableCommand } from "@aws-sdk/client-dynamodb"
import { ListTablesCommand } from "@aws-sdk/client-dynamodb"
import {Given} from "@chrysalis-it/testamatic";

export class DynamoTableSetup implements Given {
  constructor(
    private tableName: string,
    public dynamoDB: DynamoDBClient,
  ) {}

  public async setup(): Promise<void> {
    const exists = await this.tableExists()
    if (!exists) {
      await this.dynamoDB.send(
        new CreateTableCommand({
          TableName: this.tableName,
          KeySchema: [
            {
              AttributeName: "PK",
              KeyType: "HASH", //Partition key
            },
            {
              AttributeName: "SK",
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
        }),
      )
      console.log("dynamo setup complete")
    }
  }

  public async teardown(): Promise<void> {
    const exists = await this.tableExists()
    if (exists) {
      await this.dynamoDB.send(new DeleteTableCommand({ TableName: this.tableName }))
      console.log("dynamo tesrdown complete")
    }
  }

  private async tableExists() {
    const tableNamesOutput = await this.dynamoDB.send(new ListTablesCommand())
    const exists = tableNamesOutput.TableNames!.includes(this.tableName)
    return exists
  }
}
