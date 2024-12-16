import { promises } from "promises-arrow"
import { EnvSetup } from "../../configureIntegrationTestCtxFactory"
import { EnvVars } from "../../IntegrationTestCtx"
import { PutParameterRequest, SSM } from "@aws-sdk/client-ssm"
import { StructuredLogger } from "../../logger/StructuredLogger"

export class ParamStoreEnvSetup<ENVKEYS extends string> implements EnvSetup<ENVKEYS> {
  private paramsToTeardown: PutParameterRequest[] = []

  constructor(
    private pstorePath: string,
    private ssm: SSM,
    private logger: StructuredLogger,
  ) {}

  public async setup(env: EnvVars<ENVKEYS>): Promise<void> {
    this.logger.debug("Calling ParamStoreEnvSetup.setup", { env })
    const pstorePutRequests: PutParameterRequest[] = Object.entries(env).map((envVar) => ({
      Name: `${this.pstorePath}/${envVar[0]}`,
      Value: envVar[1] as string, // TODO remove casting
      Type: "String", // TODO do we need to handle encrypted
      Overwrite: true,
    }))
    await promises.map(pstorePutRequests, this.setupOne)
  }

  public async teardown(): Promise<void> {
    await promises.forEach(this.paramsToTeardown, this.tearDownOne)
  }

  setupOne = (pstorePutRequest: PutParameterRequest): Promise<void> => {
    return this.ssm
      .putParameter(pstorePutRequest)
      .then(() => this.paramsToTeardown.push(pstorePutRequest))
      .then(() => this.logger.info(`Parameter added`, { name: pstorePutRequest.Name, value: pstorePutRequest.Value }))
      .catch((err) => {
        this.logger.info(`Error creating parameter`, { name: pstorePutRequest.Name, error: err })
        throw err
      })
  }

  tearDownOne = (param: PutParameterRequest): Promise<void> => {
    const deleteParams = {
      Name: param.Name,
    }
    return new Promise<void>((resolve, reject) => {
      this.ssm.deleteParameter(deleteParams, (err) => {
        if (err) {
          // logger.warn({ err }, `Error deleting Parameter named ${deleteParams.Name} removed`)
          if (err.code !== "ParameterNotFound") return reject(err)
        }
        this.logger.info(`Parameter named ${deleteParams.Name} removed`)
        resolve()
      })
    })
  }
}
