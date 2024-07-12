import { match, matchMaker } from "mismatched"

export interface RequestMatchInfo<REQ = unknown> {
  method: string
  url: string
  headers?: object
  body?: REQ
}

export type HttpRequestMatcher<REQ = unknown> = RequestMatchInfo<REQ>

export type ResponseBodyFactory<REQ, BODY> = (req: RequestMatchInfo<REQ>) => BODY

export interface ExpectedHttpResponse<BODY = unknown, REQ = unknown> {
  body?: BODY | ResponseBodyFactory<REQ, BODY>
  status: number
  statusText: string
}

export interface MockHttpServerExpectation<REQ = unknown, RES = unknown> {
  readonly response: ExpectedHttpResponse<RES, REQ>
  readonly requestMatcher: HttpRequestMatcher<REQ>
}

export const mockHttpServerExpectationMatchesRequest = (
  expectation: MockHttpServerExpectation,
  request: RequestMatchInfo,
) =>
  matchMaker({
    ...expectation.requestMatcher,
    headers: expectation.requestMatcher.headers ?? match.any(),
    body: expectation.requestMatcher.body ?? match.any(),
  }).matches(request)
