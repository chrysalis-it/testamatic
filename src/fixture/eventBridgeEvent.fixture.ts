import { EventBridgeEvent } from "aws-lambda"
import { someFixture } from "./someFixture"

export function createEventBridgeEvent<T extends string, E>(detailType: T, data: E): EventBridgeEvent<T, E> {
  return {
    id: someFixture.someUuid(),
    version: "1",
    account: someFixture.someUniqueString("account"),
    time: new Date().toUTCString(),
    region: someFixture.someUniqueString("region"),
    resources: [someFixture.someUniqueString("someResource")],
    source: someFixture.someUniqueString("resource"),
    "detail-type": detailType,
    detail: data
  }
}
