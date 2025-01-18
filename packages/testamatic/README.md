# Testamatic

Configurabe, light weight, integration testing context that can be used to support writing integrations with the test
runner of your choice.


```typescript

export const configureIntegrationTestCtxProvider = <
  ENVKEYS extends string = string,
  MOCKSERVERNAMES extends string = string,
  WHENDELTA extends object = object,
  APICLIENT extends object = RestClient,
>(
  clientAndServerProvider: ClientAndServerProvider<ENVKEYS, APICLIENT>,
  logger: TestamaticLogger,
  envConfig: EnvConfig<ENVKEYS> = nullEnvConfig,
  whenDeltaConfig?: WhenDeltaConfig<WHENDELTA>,
  mockHttpServers: MockHttpServer<MOCKSERVERNAMES, ENVKEYS>[] = [],
  beforeAll: Given[] = [],
  beforeEach: Given[] = [],
): IntegrationTestCtxProvider<ENVKEYS, MOCKSERVERNAMES, WHENDELTA, APICLIENT>

```

```typescript
export type IntegrationTestCtx<
  ENVKEYS extends string,
  MOCKSERVERNAMES extends string,
  WHENDELTA extends object,
  APICLIENT extends object,
> = {
  each: BeforeAndAfter
  all: BeforeAndAfter
  httpMock: MockServerExpecter<MOCKSERVERNAMES, ENVKEYS>
  when: WHEN<WHENDELTA>
  api: API<APICLIENT>
  env: EnvVars<ENVKEYS>
}
```


## Configuration Types

There are a few key types that must be provided before configuring the test context for a particular project

#### ENVKEYS

A string type representing all the env keys that the system relies on.

```typescript
export type MyEnvKeys = "Key1" | "Key2" | "Key3"

```

#### MOCKSERVERNAMES

Names fo all the mock servers that are to be created.

```typescript
export type MyMockServerNames = "jwksServer" | "oauthServer" | "someOtherServer"

```

#### WHENDELTA

Any object structure that will be calculated and returned every time the test context when is called

```typescript
export type MyDelta = { eventSourceTableRows: { event: object } }

```


## Configuration parameters

### Client And Server
Simple interface used to create the app and a corresponding client to be used to call the app

```typescript
export type ClientAndServerProvider<ENVKEYS extends string, CLIENT extends object = RestClient> = (
env: EnvVars<ENVKEYS>,
) => Promise<ClientAndServer<CLIENT>>

export type ClientAndServer<APICLIENT extends object = RestClient> = { client: APICLIENT; close: () => Promise<void> }
```


### Logger
Simple interface used to log output from testamatic

```typescript
export interface TestamaticLogger {
  fatal(message: string, data?: object): void

  error(message: string, error: unknown): void

  warn(message: string, data?: object): void

  info(message: string, data?: object): void

  debug(message: string, data?: object): void

  trace(message: string, data?: object): void

  child(name: string, data?: object): TestamaticLogger
}
```

### Env Config 
Simple interface that creates the environment in the correct location ie local env, parameterstore .... This interface is
called once all the mocks have been created and thier urls are known. 
```typescript
export type EnvSetup<ENVKEYS extends string> = {
  setup: (env: EnvVars<ENVKEYS>) => Promise<void>
  teardown: () => Promise<void>
}
```
### When Delta

The when method provided by the test context can return a delta, which is the change of anything of interest. For
example the change in a table might be of interesting to assert against. Once configured this snaphot is calculated
every time when is called and returned along with the response from what was executed.

```typescript
 when: <RES>(isExecuted: IsExecuted<RES>) => Promise<{ response: RES; delta: WHENDELTA }>
```

The following interface controls how a snapshot is taken before and
after running a 'when' and how the delta between them is calculated.

```typescript
 export type WhenDeltaConfig<WHENDELTA> = {
  snapshot: () => Promise<WHENDELTA>
  diff: (first: WHENDELTA, second: WHENDELTA) => Promise<WHENDELTA>
}
```

### Mock Http Servers

Simple servers that can be configured to expect input and return responses in a similar way that we can
use mocks in unit testing except http mocks test everything because they actually receive TCP requests and return TCP
responses. Expected behaviours are set up via the httpMock.expect method supplied by the test context.

```typescript
 httpMock: {
  expect: (name: MOCKSERVERNAMES, expectation: MockHttpExpectation) => void
}
```

A list of http mocks can be provided in the makeIntegrationTestContextFactory configuration call above.

```typescript
export class MockHttpServer<MOCKSERVERNAMES extends string, ENVKEYS extends string> {
  constructor(
    public name: MOCKSERVERNAMES,
    private urlEnvKey: ENVKEYS,
    host: string = "localhost",
    private protocol: "http" | "https" = "http",
    private listenerFactory: MockTcpListenerFactory
  ) {
  }
}
```

### Before All

Setups that are called once at the beginning of a test run, and once at the end to teardown  

```typescript
  export interface Given {
  teardown(): Promise<void>
  setup(): Promise<void>
}
```

### Before Each

Setups that are called twice before each test. Once to teardown and then  to setup. This means that state 
remains once a test is run so it can be used to debug or trouble shoot. 
```typescript
 export interface Given {
  teardown(): Promise<void>
  setup(): Promise<void>
}
```

## EXAMPLES
Are found in integrationtesting package in the form of running integration tests. 


## TODO
Curently calls clientAndServerProvider once at the beginning of the test run. May be a need to call create every time to avoid issues 
around caching etc


## Dev Info

### Project file structure
- .devcontainer -> all docker related config
- src -> all typescript src code

### Prerequisites (TODO)
- Docker
- Bash
- npm

### Setup

Now you can run the rest of the commands.

### NPM Scripts

#### Naming convention

Any npm script prefixed with 'docker:' is designed to be run on the host machine
```bash
nom run docker:dev:connect
```

Any npm script not prefixed with 'docker:' is designed to be run inside a container
- compile -> code compilation,
t need to get inside a container by running:

```bash
npm run compile
npm run test:micro
```

### Getting started

#### Run tests

```bash
npm run docker:dev:connect
npm i
npm run build
npm run test:micro
npm run test:integration
```

### Useful .bashrc entries

#### alias docker_rm_all='docker rm -f $(docker ps -aq)'
A useful way to clobber all docker containers running on your machine. Unlock docker:down it can be run from anywhere
and it will clobber all running containers regardless of what created them.