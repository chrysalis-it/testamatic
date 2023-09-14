import { Thespian, TMocked } from "thespian"
import { assertThat } from "mismatched"
import { matchExtension } from "./matchExtension"

describe("matchExtension.micro", () => {
  it("invalid json string fails", () => {
    try {
      assertThat("ghewgegere").is(matchExtension.jsonString.match({}))
      fail("Should never get here")
    } catch {
      // pass
    }
  })

  it("empty object matches", () => {
    // then`
    assertThat("{}").is(matchExtension.jsonString.match({}))
  })

  it("non empty objects that are the same", () => {
    // then`
    matchExtension.jsonString.match({ blah: 1 }).matches("{ blah: 1 }")
  })

  it("invalid json string fails", () => {
    try {
      assertThat("{blah: 2}").is(matchExtension.jsonString.match({ blah: 1 }))
      fail("Should never get here")
    } catch {
      // pass
    }
  })
})
