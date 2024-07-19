import { assertThat, match } from "mismatched"
import axios from "axios"
import { local } from "../../test/local"
import {someFixture} from "../../fixture/someFixture";
import {ParamStoreEnvSetup} from "./ParameterStoreEnvSetup";
import {EnvVars} from "../../integration/IntegrationTestCtx";

type EnvKeys = "pstoreVarName"

const env: EnvVars<EnvKeys> = {
  pstoreVarName: "somePStoreValue"
}

describe("ParameterStoreSetup.integration.ts", () => {
  const axiosClient = axios.create({
    validateStatus: (status) => true,
    timeout: 1000,
  })

  describe("ParameterStoreSetup.integration.ts", () => {
    it("setup and teardown one string var", async () => {
      const path = `/some/${someFixture.someUniqueString("unique")}/pstore/path`

      const setup = new ParamStoreEnvSetup( path, local.awsClients.ssm)

      await setup.setup(env)

      const parametersAfterSetup = await local.awsClients.ssm
        .getParametersByPath({
          Path: path,
        })
        .promise()

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

      const parametersAfterTeardown = await local.awsClients.ssm
        .getParametersByPath({
          Path: path,
        })
        .promise()
      assertThat(parametersAfterTeardown.Parameters).is([])
    })
  })

})
