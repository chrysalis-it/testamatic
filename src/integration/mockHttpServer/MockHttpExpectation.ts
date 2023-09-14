import { DiffMatcher, match, validateThat } from "mismatched"

export interface MatchInfo {
  method: string
  url: string
  headers: object
  body: object
}

export interface HttpRequestMatcher {
  body?: DiffMatcher<object>
  headers?: DiffMatcher<object>
  method: "get" | "post" | "put" | "delete" | "head"
  url: DiffMatcher<string>
}

export interface ExpectedHttpResponse<BODY> {
  body: BODY
  status: number
  statusText: string
}

export class MockHttpExpectation<REQ = object, RES = any> {
  constructor(private requestMatcher: HttpRequestMatcher, public response: ExpectedHttpResponse<RES>) {}

  matches(ctx: MatchInfo) {
    return validateThat(ctx).satisfies(match.obj.has(this.requestMatcher))
  }
}

export const createExpectedHttpResponse = <BODY>(
  body: BODY,
  status = 200,
  statusText = "All good"
): ExpectedHttpResponse<BODY> => {
  return {
    status: status,
    statusText: statusText,
    body: body,
  }
}
