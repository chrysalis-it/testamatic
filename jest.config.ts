import type { Config } from "jest"

const config: Config = {
  testTimeout: 15 * 1000,
  testEnvironment: "node",
  verbose: true,
  reporters: ["default", ["summary", { summaryThreshold: 1 }]],
  projects: [
    {
      displayName: "micro",
      preset: "ts-jest",
      testMatch: ["<rootDir>/packages/**/src/**/*.micro.ts"],
      transform: { "^.+\\.tsx?$": ["ts-jest", { tsconfig: "tsconfig-base.json" }] },
    },
    {
      displayName: "integration",
      preset: "ts-jest",
      testMatch: ["<rootDir>/packages/**/src/**/*.integration.ts"],
      transform: { "^.+\\.tsx?$": ["ts-jest", { tsconfig: "tsconfig-base.json" }] },
      slowTestThreshold: 20000,
    },
  ],
  maxWorkers: "50%",
  workerIdleMemoryLimit: 0.1,
}

export default config
