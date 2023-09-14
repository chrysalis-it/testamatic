export const urn = {
  getValue: (urn: string) => {
    const id = urn.split(":").reverse()[0]
    return id
  },
}
