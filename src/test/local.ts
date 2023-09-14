import { DynamoDB, SSM } from "aws-sdk"
import { DocumentClient } from "aws-sdk/clients/dynamodb"

const localStackConfig = {
  endpoint: "http://localstack.local:4566",
  region: "ap-southeast-2",
  maxRetries: 3,
}
const localStackDynamoClient = new DynamoDB(localStackConfig)

const awsClients = {
  ssm: new SSM(localStackConfig),
  dynamoDocumentClient: new DocumentClient({ service: localStackDynamoClient }),
}

export const local = {
  awsClients: awsClients,
}
