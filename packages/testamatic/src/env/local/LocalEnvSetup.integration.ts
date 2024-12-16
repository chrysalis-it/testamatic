import { assertThat } from "mismatched"
import { EnvVars } from "../../IntegrationTestCtx"
import { LocalEnvSetup } from "./LocalEnvSetup"
import * as process from "process"

type EnvKeys = "pstoreVarName"

const env: EnvVars<EnvKeys> = {
  pstoreVarName: "somePStoreValue",
}

describe("LocalEnvSetup.integration.ts", () => {
  describe("LocalEnvSetup.integration.ts", () => {
    it("setup and teardown one string var", async () => {
      const setup = new LocalEnvSetup()

      await setup.setup(env)

      Object.entries(env).forEach((entry) => {
        assertThat(process.env[entry[0]]).is(entry[1])
      })

      await setup.teardown()

      Object.entries(env).forEach((entry) => {
        assertThat(process.env[entry[0]]).is(undefined)
      })
    })
  })
})
