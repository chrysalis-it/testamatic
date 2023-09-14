import { Clock } from "./Clock"

export class FrozenClock implements Clock {
  constructor(private frozenNow: Date = new Date()) {}

  now(): Date {
    return this.frozenNow
  }
}
