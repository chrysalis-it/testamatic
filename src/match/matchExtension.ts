import { DiffMatcher, MatchResult } from "mismatched"
import { ContextOfValidationError } from "mismatched/dist/src/matcher/DiffMatcher"
import { Mismatched } from "mismatched/dist/src/matcher/Mismatched"
import { ObjectMatcher } from "mismatched/dist/src/matcher/ObjectMatcher"

export const matchExtension = {
  jsonString: {
    match: (expected: object) => new JsonStringMatcher(expected) as any,
  },
}

export class JsonStringMatcher extends DiffMatcher<string> {
  private objMatcher: ObjectMatcher<any>
  constructor(expected: object) {
    super()
    this.objMatcher = ObjectMatcher.make(expected)
  }
  describe(): any {
    this.objMatcher.describe()
  }

  mismatches(context: ContextOfValidationError, mismatched: Array<Mismatched>, actual: string): MatchResult {
    let actualObj: object
    try {
      actualObj = JSON.parse(actual)
    } catch {
      actualObj = { INVALID_JSON: actual }
    }
    return this.objMatcher.mismatches(context, mismatched, actualObj)
  }
}
