import { assertThat, match } from "mismatched"
import { local } from "../../test/local"
import { ParamStoreEnvSetup } from "./ParameterStoreEnvSetup"
import { EnvVars } from "../../IntegrationTestCtx"
import { someFixture } from "@chrysalis-it/some-fixture"
import {consoleLogger} from "../../logger/console/consoleLogger";

type EnvKeys = "pstoreVarName"

const env: EnvVars<EnvKeys> = {
  pstoreVarName: "somePStoreValue",
}

describe("ParameterStoreSetup.integration.ts", () => {
  describe("ParameterStoreSetup.integration.ts", () => {
    it("setup and teardown one string var", async () => {
      const path = `/some/${someFixture.someUniqueString("unique")}/pstore/path`

      const setup = new ParamStoreEnvSetup(path, local.awsClients.ssm, consoleLogger)

      await setup.setup(env)

      const parametersAfterSetup = await local.awsClients.ssm.getParametersByPath({
        Path: path,
      })

      assertThat(parametersAfterSetup.Parameters).is([
        {
          Name: `${path}/${Object.keys(env)[0]}`,
          Type: "String",
          Value: Object.values(env)[0],
          Version: 1,
          LastModifiedDate: match.any(),
          ARN: match.any(),
          DataType: match.any(),
        },
      ])

      await setup.teardown()

      const parametersAfterTeardown = await local.awsClients.ssm.getParametersByPath({
        Path: path,
      })

      assertThat(parametersAfterTeardown.Parameters).is([])
    })
  })
})
