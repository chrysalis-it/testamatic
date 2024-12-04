import DynamoDB = require("aws-sdk/clients/dynamodb")
import {BeforeAndAfter, Given} from "@chrysalis-it/testamatic";



export class DynamoTableSetup implements Given {
  constructor(
    private tableName: string,
    public dynamoDB: DynamoDB,
  ) {}

  public async setup(): Promise<void> {
    const params: DynamoDB.Types.CreateTableInput = {
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
    }
    const exists = (await this.dynamoDB.listTables().promise()).TableNames!.includes(this.tableName)
    if (!exists) {
      await this.dynamoDB.createTable(params).promise()
    }
  }

  public async teardown(): Promise<void> {
    const params: DynamoDB.Types.DeleteTableInput = { TableName: this.tableName }
    await this.dynamoDB.deleteTable(params).promise()
  }
}
