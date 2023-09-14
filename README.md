# Testamatic

Configurabe, light weight, integration testing context that can be used to support writing integrations with the test
runner of your choice.

## Configuration

There are a few key types that must be provided before configuring the test context for a particular project

#### ENVKEYS

A string type representing all the env keys that the system relies on.

```typescript
export type MyEnvKeys = "Key1" | "Key2" | "Key3"

```

#### MOCKSERVERNAMES

Names fo all the mock servers that are to be created.

```typescript
export type MyEnvKeys = "jwksServer" | "oauthServer" | "someOtherServer"

```

#### WHENDELTA

Any object structure that will be calculated and returned every time the test context when is called

```typescript
export type MyDelta = { eventSourceTableRows: { event: object } }

```

```typescript
export const makeIntegrationTestContextFactory = <ENVKEYS extends string, MOCKSERVERNAMES extends string, WHENDELTA>(
  defaultEnv: EnvVars<ENVKEYS>,
  mockHttpServers: MockHttpServer<MOCKSERVERNAMES, any>[],
  whenDeltaConfig: WhenDeltaConfig<WHENDELTA>,
  apiConfig?: ApiConfig
): (() => IntegrationTestContext<ENVKEYS, MOCKSERVERNAMES, WHENDELTA>)

```

## Provided context

```typescript
export interface IntegrationTestContext<ENVKEYS extends string, MOCKSERVERNAMES extends string, WHENDELTA> {
  env: EnvVars<ENVKEYS>
  before: {
    all: () => Promise<void>
    each: () => Promise<void>
  }
  after: {
    all: () => Promise<void>
    each: () => Promise<void>
  }
  httpMock: { expect: (name: MOCKSERVERNAMES, expectation: MockHttpExpectation) => void }
  when: <RES>(isExecuted: IsExecuted<RES>) => Promise<{ response: RES; delta: WHENDELTA }>
  api: { client?: RestClient }
}
```

## Currently supports

### Http Mocks

Simple servers that can be configured to expect input and return responses in a similar way that we can
use mocks in unit testing except http mocks test everything because they actually receive TCP requests and return TCP
responses. Expected behaviours are set up via the httpMock.expect method supplied by the test context.

```typescript
 httpMock: {
  expect: (name: MOCKSERVERNAMES, expectation: MockHttpExpectation) => void
}
```

#### Config

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

````

### Delta

The when method provided by the test context can return a delta, which is the change of anything of interest. For
example the change in a table might be of interesting to assert against. Once configured this snaphot is calculated
every time when is called and returned along with the response from what was executed.

```typescript
 when: <RES>(isExecuted: IsExecuted<RES>) => Promise<{ response: RES; delta: WHENDELTA }>
```

#### Config

The following interface controls how a snapshot is taken before and
after running a 'when' and how the delta between them is calculated.

```typescript
 export type WhenDeltaConfig<WHENDELTA> = {
  snapshot: () => Promise<WHENDELTA>
  diff: (first: WHENDELTA, second: WHENDELTA) => Promise<WHENDELTA>
}
```

### RestApi (TODO)

If configured the test context can start an api on a designated localhost port and return a rest client that is
configured to make calls to that api. The api client is made available by the test context calling api.client on the testcontext

```typescript
  api: {
  client ? : RestClient
}
```

#### Config

If an ApiConfig is provided when configuring your test context the api server will be started, and stopped and an api
clent will be returned to be used in the testing of the api

```typescript
export type ApiMaker = () => Promise<http.Server>

export type ApiConfig = {
port: number
makeApi: ApiMaker
}
```

## TODO

-- Setups (and teardown)

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