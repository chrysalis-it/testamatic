import { EnvSetup } from "../../integration/configureIntegrationTestCtxFactory"
import { EnvVars } from "../../integration/IntegrationTestCtx"
import * as process from "process";
import {logger} from "../../logger/Logger";

export class LocalEnvSetup<ENVKEYS extends string> implements EnvSetup<ENVKEYS> {
  private envToTeardown: EnvVars<ENVKEYS> | undefined

  constructor() {}

  public async setup(env: EnvVars<ENVKEYS>): Promise<void> {
    return Promise.resolve().then(() => {
      Object.assign(process.env, env)
      logger.info("Process Env Setup complete", process.env)
      this.envToTeardown = env
    })
  }

  public async teardown(): Promise<void> {
    return Promise.resolve().then(() => {
      Object.entries<string>(this.envToTeardown ?? {}).forEach((entry) => {
        delete process.env[entry[0]]
      })
      this.envToTeardown = undefined
    })
  }
}
