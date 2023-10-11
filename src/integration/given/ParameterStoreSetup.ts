import * as aws from "aws-sdk"
import {SSM} from "aws-sdk"
import {PutParameterRequest} from "aws-sdk/clients/ssm"
import {promises} from "promises-arrow"
import {someFixture} from "../../fixture/someFixture"
import {logger} from "../../logger/Logger"
import {Given} from "./Given";

export type ParameterSetupParams = {
  path: string
  varName: string
  value: string
  type: "String" | "SecureString"
}

export class ParamStoreSetup implements Given {
  private paramsToTeardown: ParameterSetupParams[] = []

  constructor(public ssm: aws.SSM, private parametersToSetup: ParameterSetupParams[]) {}

  async setup(): Promise<void> {
    const setupOne = (paramSetup: ParameterSetupParams): Promise<void> => {
      const putParams: PutParameterRequest = {
        Name: `${paramSetup.path}/${paramSetup.varName}`,
        Value: paramSetup.value,
        Type: paramSetup.type,
        Overwrite: true,
      }

      return this.ssm
        .putParameter(putParams)
        .promise()
        .then(() => this.paramsToTeardown.push(paramSetup))
        .then(() => logger.info(`Parameter added`, {name: putParams.Name, value: putParams.Value}))
        .catch((err) => {
            logger.info(`Error creating parameter`, {name: putParams.Name, error: err})
            throw err
          }
        )
    }
    await promises.map(this.parametersToSetup, setupOne);
    return
  }


  async tearDown(): Promise<void> {
    logger.debug("Calling ParameterStore teardown", {params: this.paramsToTeardown})

    const tearDownOne = (param: ParameterSetupParams): Promise<void> => {
      const deleteParams = {
        Name: `${param.path}/${param.varName}`,
      }
      return new Promise<void>((resolve, reject) => {
        this.ssm.deleteParameter(deleteParams, (err, data: SSM.Types.DeleteParameterResult) => {
          if (err) {
            // logger.warn({ err }, `Error deleting Parameter named ${deleteParams.Name} removed`)
            if (err.code !== "ParameterNotFound") return reject(err)
          }
          logger.info(`Parameter named ${deleteParams.Name} removed`)
          resolve()
        })
      })
    }
    await promises.forEach(this.paramsToTeardown, tearDownOne)
    return
  }


}

// Fixture

const createDefaultVarNames = () => [
  someFixture.someUniqueString("varName"),
  someFixture.someUniqueString("varName"),
  someFixture.someUniqueString("varName"),
]

export const createSomeParamStoreSetups = (varNames: string[] = createDefaultVarNames()): ParameterSetupParams[] => {
  const path = `/some/path/to/${someFixture.someUniqueString("uniquePlace")}`

  return varNames.map((varName) => {
    const newVar: ParameterSetupParams = {
      path: path,
      type: "SecureString",
      varName: varName,
      value: `${varName}-value`,
    }
    return newVar
  })
}
