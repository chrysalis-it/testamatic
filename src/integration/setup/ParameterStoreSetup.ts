import * as aws from "aws-sdk"
import { SSM } from "aws-sdk"
import { PutParameterRequest } from "aws-sdk/clients/ssm"
import { promises } from "promises-arrow"
import { someFixture } from "../../fixture/someFixture"
import { logger } from "../../logger/Logger"

export type ParameterSetupParams = {
  path: string
  varName: string
  value: string
  type: "String" | "SecureString"
}

export class ParamStoreSetup {
  private paramsToTeardown: ParameterSetupParams[] = []

  constructor(public ssm: aws.SSM) {}

  public setupMany(many: ParameterSetupParams[]): Promise<ParameterSetupParams[]> {
    return promises.map(many, (param) => this.setup(param))
  }

  public async setup(paramSetup: ParameterSetupParams): Promise<ParameterSetupParams> {
    const putParams: PutParameterRequest = {
      Name: `${paramSetup.path}/${paramSetup.varName}`,
      Value: paramSetup.value,
      Type: paramSetup.type,
      Overwrite: true,
    }

    try {
      await this.ssm
        .putParameter(putParams)
        .promise()
        .then(() => this.paramsToTeardown.push(paramSetup))
        .then(() => logger.info(`Parameter added`, { name: putParams.Name, value: putParams.Value }))
      return paramSetup
    } catch (err) {
      logger.info(`Error creating parameter`, { name: putParams.Name, error: err })
      logger.info(`Error creating parameter`, { name: putParams.Name, error: err })
      throw err
    }
  }

  public tearDown(): Promise<SSM.Types.DeleteParameterResult[]> {
    logger.debug("Calling ParameterStore teardown", { params: this.paramsToTeardown })

    this.paramsToTeardown.forEach((param) => logger.debug(`Tearing down param ${param.varName}`))

    return promises.forEach(this.paramsToTeardown, (param) => this.tearDownOne(param))
  }

  private tearDownOne(param: ParameterSetupParams): Promise<SSM.Types.DeleteParameterResult> {
    const deleteParams = {
      Name: `${param.path}/${param.varName}`,
    }

    return new Promise<SSM.Types.DeleteParameterResult>((resolve, reject) => {
      this.ssm.deleteParameter(deleteParams, (err, data: SSM.Types.DeleteParameterResult) => {
        if (err) {
          // logger.warn({ err }, `Error deleting Parameter named ${deleteParams.Name} removed`)
          if (err.code !== "ParameterNotFound") return reject(err)
        }

        logger.info(`Parameter named ${deleteParams.Name} removed`)
        resolve(data)
      })
    })
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
