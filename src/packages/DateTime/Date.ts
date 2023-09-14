export const isBefore = (fixedPntInTime: Date) => (dateToCompare: Date) =>
  dateToCompare.getTime() < fixedPntInTime.getTime()

export const isAfter = (fixedPntInTime: Date) => (dateToCompare: Date) =>
  dateToCompare.getTime() > fixedPntInTime.getTime()
