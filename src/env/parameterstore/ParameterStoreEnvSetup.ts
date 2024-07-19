import * as aws from "aws-sdk"
import {SSM} from "aws-sdk"
import {PutParameterRequest} from "aws-sdk/clients/ssm"
import {promises} from "promises-arrow"
import {logger} from "../../logger/Logger"
import {EnvSetup} from "../../integration/configureIntegrationTestCtxFactory"
import {EnvVars} from "../../integration/IntegrationTestCtx"

export class ParamStoreEnvSetup<ENVKEYS extends string> implements EnvSetup<ENVKEYS> {
  private paramsToTeardown: PutParameterRequest[] = []

  constructor(
    private pstorePath: string,
    private ssm: aws.SSM,
  ) {
  }

  public async setup(env: EnvVars<ENVKEYS>): Promise<EnvSetup<ENVKEYS>> {
    logger.debug("Calling ParamStoreEnvSetup.setup", {env})
    const pstorePutRequests: PutParameterRequest[] = Object.entries(env).map((envVar) =>
      ({
        Name: `${this.pstorePath}/${envVar[0]}`,
        Value: envVar[1] as string, // TODO remove casting
        Type: "String", // TODO do we need to handle encrypted
        Overwrite: true,
      })
    )
    await promises.map(pstorePutRequests, this.setupOne)
    return this
  }

  public async teardown(): Promise<EnvSetup<ENVKEYS>> {
    await promises.forEach(this.paramsToTeardown, this.tearDownOne)
    return this
  }

  setupOne = (pstorePutRequest: PutParameterRequest): Promise<void> => {
    return this.ssm
      .putParameter(pstorePutRequest)
      .promise()
      .then(() => this.paramsToTeardown.push(pstorePutRequest))
      .then(() => logger.info(`Parameter added`, {name: pstorePutRequest.Name, value: pstorePutRequest.Value}))
      .catch((err) => {
        logger.info(`Error creating parameter`, {name: pstorePutRequest.Name, error: err})
        throw err
      })
  }

  tearDownOne = (param: PutParameterRequest): Promise<void> => {
    const deleteParams = {
      Name: param.Name,
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
}
