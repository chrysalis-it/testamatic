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

Packages and their versions are managed by npm and lerna:
- [Npm workspaces](https://docs.npmjs.com/cli/v7/using-npm/workspaces)
- [See Runing Lerna Tasks](https://lerna.js.org/docs/features/run-tasks)

## Getting Started

### Initialise the mono repo
```bash
npm i
npm run compile
```

### Run tests

```bash
npm run docker:dev:connect
npm ci
npm run test:micro
npm run test:integration
```

## Prerequisites (TODO)

- Docker
- Bash
- npm