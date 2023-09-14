import { assertThat } from "mismatched"
import { isAfter, isBefore } from "./Date"

describe("DateTime.micro", () => {
  describe("isAfter", () => {
    it("when dates are the same", () => {
      // given
      const now = new Date()

      // when
      const actual = isAfter(now)(now)

      // then`
      assertThat(actual).is(false)
    })

    it("when date to compare is in the future", () => {
      // given
      const pastDate = new Date()
      const futureDate = new Date(pastDate.getTime() + 100)

      // when
      const actual = isAfter(pastDate)(futureDate)

      // then`
      assertThat(actual).is(true)
    })

    it("when date to compare is in the past", () => {
      // given
      const pastDate = new Date()
      const futureDate = new Date(pastDate.getTime() + 100)

      // when
      const actual = isAfter(futureDate)(pastDate)

      // then`
      assertThat(actual).is(false)
    })
  })
  describe("isBefore", () => {
    it("when dates are the same", () => {
      // given
      const now = new Date()

      // when
      const actual = isBefore(now)(now)

      // then`
      assertThat(actual).is(false)
    })

    it("when date to compare is in the future", () => {
      // given
      const pastDate = new Date()
      const futureDate = new Date(pastDate.getTime() + 100)

      // when
      const actual = isBefore(pastDate)(futureDate)

      // then`
      assertThat(actual).is(false)
    })

    it("when date to compare is in the past", () => {
      // given
      const pastDate = new Date()
      const futureDate = new Date(pastDate.getTime() + 100)

      // when
      const actual = isBefore(futureDate)(pastDate)

      // then`
      assertThat(actual).is(true)
    })
  })
})
