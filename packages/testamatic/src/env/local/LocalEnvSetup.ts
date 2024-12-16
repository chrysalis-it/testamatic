import { EnvSetup } from "../../configureIntegrationTestCtxFactory"
import { EnvVars } from "../../IntegrationTestCtx"
import * as process from "process"
import { StructuredLogger } from "../../logger/StructuredLogger"

export class LocalEnvSetup<ENVKEYS extends string> implements EnvSetup<ENVKEYS> {
  private envToTeardown: EnvVars<ENVKEYS> | undefined

  constructor(private logger: StructuredLogger) {}

  public async setup(env: EnvVars<ENVKEYS>): Promise<void> {
    return Promise.resolve().then(() => {
      Object.assign(process.env, env)
      this.logger.info("Process Env Setup complete", process.env)
      this.envToTeardown = env
    })
  }

  public async teardown(): Promise<void> {
    return Promise.resolve().then(() => {
      Object.entries<string>(this.envToTeardown ?? {}).forEach((entry) => {
        delete process.env[entry[0]]
      })
      this.envToTeardown = undefined
      this.logger.info("Process Env Teardown complete", process.env)
    })
  }
}
