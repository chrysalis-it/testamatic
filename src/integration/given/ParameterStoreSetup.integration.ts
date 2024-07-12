import { assertThat, match } from "mismatched"
import axios from "axios"
import { ParamStoreSetup } from "./ParameterStoreSetup"
import { local } from "../../test/local"
import {someFixture} from "../../fixture/someFixture";

class SomeClass {
  go() {}
}

describe("ParameterStoreSetup.integration.ts", () => {
  const axiosClient = axios.create({
    validateStatus: (status) => true,
    timeout: 1000,
  })

  describe("ParameterStoreSetup.integration.ts", () => {
    it("setup and teardown one string var", async () => {
      const path = `/some/${someFixture.someUniqueString("unique")}/pstore/path`
      const varName = someFixture.someUniqueString("pstoreVarName")
      let pstoreVarValue = "somePStoreValue"
      const setup = new ParamStoreSetup(local.awsClients.ssm, [
        {
          path: path,
          type: "String",
          value: pstoreVarValue,
          varName: varName,
        },
      ])

      await setup.setup()

      const parametersAfterSetup = await local.awsClients.ssm
        .getParametersByPath({
          Path: path,
        })
        .promise()

      assertThat(parametersAfterSetup.Parameters).is([
        {
          Name: `${path}/${varName}`,
          Type: "String",
          Value: pstoreVarValue,
          Version: 1,
          LastModifiedDate: match.any(),
          ARN: match.any(),
          DataType: match.any(),
        },
      ])

      await setup.tearDown()

      const parametersAfterTeardown = await local.awsClients.ssm
        .getParametersByPath({
          Path: path,
        })
        .promise()
      assertThat(parametersAfterTeardown.Parameters).is([])
    })
  })

})
