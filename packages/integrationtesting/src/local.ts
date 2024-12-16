import { SSM } from "@aws-sdk/client-ssm"
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb"
import { DynamoDBClient } from "@aws-sdk/client-dynamodb"

const localStackConfig = {
  endpoint: "http://localstack:4566",
  region: "ap-southeast-2",
  credentials: { accessKeyId: "wegeewg", secretAccessKey: "dwqdqdwq" },
  maxRetries: 3,
  timeout: 2000,
}

const awsClients = {
  ssm: new SSM(localStackConfig),
  dynamo: DynamoDBDocumentClient.from(new DynamoDBClient(localStackConfig)),
}

export const local = {
  awsClients: awsClients,
}
