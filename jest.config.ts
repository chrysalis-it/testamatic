import type { Config } from "jest"

const config: Config = {
  testTimeout: 15 * 1000,
  testEnvironment: "node",
  roots: ["./src"],
  verbose: true,
  // reporters: [ "default", "jest-junit" ],
  projects: [
    {
      displayName: "micro",
      testMatch: ["<rootDir>/src/**/*.micro.ts"],
      preset: "ts-jest",
      // setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
    },
    {
      displayName: "integration",
      testMatch: ["<rootDir>/src/**/*.integration.ts"],
      preset: "ts-jest",
      //setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
      slowTestThreshold: 20000,
    },
  ],
  maxWorkers: "50%",
  workerIdleMemoryLimit: 0.1,
}

export default config
