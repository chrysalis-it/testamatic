import * as uuid from "uuid"

export class SomeFixture {
  constructor(private uniqueNumber: number) {}

  someUuid(): string {
    return uuid.v4()
  }

  someUrn(id = uuid.v4()): string {
    return `some:thing:${id}`
  }

  someUniqueNumber(): number {
    return this.uniqueNumber++
  }

  someUniqueString(label = "String"): string {
    return `some${label}-${this.someUniqueNumber()}`
  }

  someObjectOfType<T extends object>(having?: Partial<T>): T {
    return { ...having, someUniqueValue: someFixture.someUniqueNumber() } as any as T
  }

  someEmail(label: string): string {
    return `${this.someUuid()}${label}@example.com`
  }

  someDate(): Date {
    return new Date()
  }
}

export const someFixture = new SomeFixture(Math.round(Math.random() * 100000))
