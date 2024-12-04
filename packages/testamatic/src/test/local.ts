import { DynamoDB, SSM } from "aws-sdk"
import { DocumentClient } from "aws-sdk/clients/dynamodb"

const localStackConfig = {
  endpoint: "http://localstack:4566",
  region: "ap-southeast-2",
  credentials: { accessKeyId: "wegeewg", secretAccessKey: "dwqdqdwq" },
  maxRetries: 3,
  timeout: 2000,
}

const awsClients = {
  ssm: new SSM(localStackConfig),
  dynamoDocumentClient: new DocumentClient({ service: new DynamoDB(localStackConfig) }),
  dynamoDb: new DynamoDB(localStackConfig)
}

export const local = {
  awsClients: awsClients,
}
