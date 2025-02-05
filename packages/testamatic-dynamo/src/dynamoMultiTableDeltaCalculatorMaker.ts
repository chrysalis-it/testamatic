import { WhenDeltaCalculator } from "@chrysalis-it/testamatic"
import { TableDiff } from "./dynamoTableDeltaCalculatorMaker"

type MultiTableDiff<TABLENAMES extends string, ROW extends object> = Record<TABLENAMES, TableDiff<ROW>>
type MultiTableScan<TABLENAMES extends string, ROW extends object> = Record<TABLENAMES, ROW[]>

export const dynamoMultiTableDeltaCalculatorMaker = <TABLENAMES extends string, ROW extends object>(
  whenDeltaConfigs: Record<TABLENAMES, WhenDeltaCalculator<ROW[], TableDiff<ROW>>>,
): WhenDeltaCalculator<MultiTableScan<TABLENAMES, ROW>, MultiTableDiff<TABLENAMES, ROW>> => {
  const snapshot = async (): Promise<MultiTableScan<TABLENAMES, ROW>> => {
    const scans = await Promise.all(
      Object.keys(whenDeltaConfigs).map(async (tableName: TABLENAMES) => {
        const scan = await whenDeltaConfigs[tableName].snapshot()
        return { tableName, scan }
      }),
    )
    return scans.reduce<MultiTableScan<TABLENAMES, ROW>>(
      (accumulated, current) => {
        accumulated[current.tableName] = current.scan
        return accumulated
      },
      {} as MultiTableScan<TABLENAMES, ROW>,
    )
  }

  const diff = async (before: MultiTableScan<TABLENAMES, ROW>): Promise<MultiTableDiff<TABLENAMES, ROW>> => {
    const scans = await Promise.all(
      Object.keys(whenDeltaConfigs).map(async (tableName: TABLENAMES) => {
        const diff = await whenDeltaConfigs[tableName].diff(before[tableName])
        return { tableName, diff }
      }),
    )
    return scans.reduce<MultiTableDiff<TABLENAMES, ROW>>(
      (accumulated, current) => {
        accumulated[current.tableName] = current.diff
        return accumulated
      },
      {} as MultiTableDiff<TABLENAMES, ROW>,
    )
  }
  return {
    snapshot,
    diff,
  }
}
