import http from "http"
import { assertThat, match } from "mismatched"
import { Thespian, TMocked } from "thespian"
import { someFixture } from "../fixture/someFixture"
import { MockHttpServer } from "./mockHttpServer/MockHttpServer"
import { EnvVars } from "./IntegrationTestCtx"
import {
  ApiMaker,
  IntegrationTestCtxProvider,
  configureIntegrationTestCtxProvider,
  WhenDeltaConfig,
} from "./configureIntegrationTestCtxFactory"
import { ClientAndServer, ClientAndServerProvider } from "./defaultClientAndServerProvider"
import { RestClient } from "typed-rest-client"
import { Given } from "./given/Given"

type SomeEnvKeys = "EnvKey1" | "EnvKey2" | "EnvKey3" | "EnvKey4"
type SomeEnvVars = { [key in SomeEnvKeys]: string }

const defaultEnv: EnvVars<SomeEnvKeys> = {
  EnvKey1: "OriginalEnvKey1Value",
  EnvKey2: "OriginalEnvKey2Value",
  EnvKey3: "OriginalEnvKey3Value",
  EnvKey4: "OriginalEnvKey4Value",
}

const httpMockServerVarEntries: Partial<SomeEnvVars>[] = [
  { EnvKey1: "HttpMockEnvKey1Value" },
  { EnvKey2: "HttpMockEnvKey2Value" },
  { EnvKey3: "HttpMockEnvKey3Value" },
]

type SomeMockServerNames = "HttpMockServer1" | "HttpMockServer2" | "HttpMockServer3"

class SomeWhenDelta {
  list: Array<string>
}

describe("IntegrationTestCtx.micro", () => {
  let mocks: Thespian
  let httpMockkServerMocks: TMocked<MockHttpServer<any, any>>[]
  let apiMakerMock: TMocked<ApiMaker>
  let apiMock: TMocked<http.Server>
  let clientAndServerMock: TMocked<ClientAndServer>
  let testCtxFactory: IntegrationTestCtxProvider<SomeEnvKeys, SomeMockServerNames, SomeWhenDelta>
  let clientAndServerProviderStub: ClientAndServerProvider<SomeEnvKeys>

  let givenMocks: TMocked<Given>[]

  beforeEach(async () => {
    mocks = new Thespian()

    httpMockkServerMocks = [
      mocks.mock("HttpMockkServer1"),
      mocks.mock("HttpMockkServer2"),
      mocks.mock("HttpMockkServer3"),
    ]
    apiMakerMock = mocks.mock("apiMakerMock")
    apiMock = mocks.mock("apiMock")
    clientAndServerMock = mocks.mock("clientAndServerMock")

    givenMocks = [mocks.mock("beforeMock1"), mocks.mock("beforeMock2"), mocks.mock("beforeMock3")]

    clientAndServerProviderStub = (env: EnvVars<SomeEnvKeys>) => Promise.resolve(clientAndServerMock.object)
  })

  afterEach(() => {
    mocks.verify()
  })

  describe("api.client", () => {
    it("when no API config", async () => {
      httpMockkServerMocks.forEach((x, index) =>
        x
          .setup((x) => x.getEnvEntries())
          .returns(() => httpMockServerVarEntries[index])
          .timesAtLeast(0),
      )

      testCtxFactory = configureIntegrationTestCtxProvider(
        defaultEnv,
        someFixture.someObjectOfType<WhenDeltaConfig<SomeWhenDelta>>(),
        httpMockkServerMocks.map((x) => x.object),
      )

      // when
      const ctx = await testCtxFactory()

      // then`
      assertThat(ctx).is({
        api: { client: match.any() },
        before: match.any(),
        after: match.any(),
        when: match.any(),
        httpMock: match.any(),
        env: {
          EnvKey1: "HttpMockEnvKey1Value",
          EnvKey2: "HttpMockEnvKey2Value",
          EnvKey3: "HttpMockEnvKey3Value",
          EnvKey4: "OriginalEnvKey4Value",
        },
      })

      try {
        await ctx.api.client()
        fail("Should never get here")
      } catch (e: any) {
        assertThat(e.message).is("Please configure ClientAndServerProvider to use API.client")
      }
    })
    it("when API Config", async () => {
      httpMockkServerMocks.forEach((x, index) =>
        x
          .setup((x) => x.getEnvEntries())
          .returns(() => httpMockServerVarEntries[index])
          .timesAtLeast(0),
      )

      const expectedRestClient = someFixture.someObjectOfType<RestClient>()
      clientAndServerMock.setup((x) => x.client).returns(() => expectedRestClient)

      testCtxFactory = configureIntegrationTestCtxProvider(
        defaultEnv,
        someFixture.someObjectOfType<WhenDeltaConfig<SomeWhenDelta>>(),
        httpMockkServerMocks.map((x) => x.object),
        clientAndServerProviderStub,
      )

      // when
      const ctx = await testCtxFactory()

      // then`
      assertThat(ctx).is({
        api: { client: match.any() },
        before: match.any(),
        after: match.any(),
        when: match.any(),
        httpMock: match.any(),
        env: {
          EnvKey1: "HttpMockEnvKey1Value",
          EnvKey2: "HttpMockEnvKey2Value",
          EnvKey3: "HttpMockEnvKey3Value",
          EnvKey4: "OriginalEnvKey4Value",
        },
      })

      const restClient = await ctx.api.client()
      assertThat(restClient).is(expectedRestClient)
    })
  })

  describe("env", () => {
    it("when no mockServers", async () => {


      testCtxFactory = configureIntegrationTestCtxProvider(
        defaultEnv,
        someFixture.someObjectOfType<WhenDeltaConfig<SomeWhenDelta>>(),
      )

      // when
      const ctx = await testCtxFactory()

      // then`
      assertThat(ctx).is({
        api: { client: match.any() },
        before: match.any(),
        after: match.any(),
        when: match.any(),
        httpMock: match.any(),
        env: defaultEnv,
      })
    })
    it("when mockServers", async () => {
      httpMockkServerMocks.forEach((x, index) =>
        x
          .setup((x) => x.getEnvEntries())
          .returns(() => httpMockServerVarEntries[index])
          .timesAtLeast(0),
      )

      testCtxFactory = configureIntegrationTestCtxProvider(
        defaultEnv,
        someFixture.someObjectOfType<WhenDeltaConfig<SomeWhenDelta>>(),
        httpMockkServerMocks.map((x) => x.object),
      )

      // when
      const ctx = await testCtxFactory()

      // then`
      assertThat(ctx).is({
        api: { client: match.any() },
        before: match.any(),
        after: match.any(),
        when: match.any(),
        httpMock: match.any(),
        env: {
          EnvKey1: "HttpMockEnvKey1Value",
          EnvKey2: "HttpMockEnvKey2Value",
          EnvKey3: "HttpMockEnvKey3Value",
          EnvKey4: "OriginalEnvKey4Value",
        },
      })
    })
  })

  describe("beforeEach", () => {
    it("when givens and mockservers", async () => {
      httpMockkServerMocks.forEach((x, index) =>
        x.setup((x) => x.getEnvEntries()).returns(() => httpMockServerVarEntries[index]),
      )

      givenMocks.forEach((mock, index) => mock.setup((x) => x.setup()))

      const testCtxFactory = await configureIntegrationTestCtxProvider<SomeEnvKeys, SomeMockServerNames, SomeWhenDelta>(
        defaultEnv,
        someFixture.someObjectOfType<WhenDeltaConfig<SomeWhenDelta>>(),
        httpMockkServerMocks.map((x) => x.object),
        clientAndServerProviderStub,
        [],
        givenMocks.map((x) => x.object),
      )

      // when
      const ctx = await testCtxFactory()
      await ctx.before.each()
    })
    it("when no givens or mockservers", async () => {
      const testCtxFactory = await configureIntegrationTestCtxProvider<SomeEnvKeys, SomeMockServerNames, SomeWhenDelta>(
        defaultEnv,
        someFixture.someObjectOfType<WhenDeltaConfig<SomeWhenDelta>>(),
      )

      // when
      const ctx = await testCtxFactory()
      await ctx.before.each()
    })
  })

  describe("afterEach", () => {
    it("when givens and mockservers", async () => {
      httpMockkServerMocks.forEach((x, index) =>
        x.setup((x) => x.getEnvEntries()).returns(() => httpMockServerVarEntries[index]),
      )
      httpMockkServerMocks.forEach((x) => x.setup((x) => x.verify()).returns(() => Promise.resolve()))
      givenMocks.forEach((mock, index) => mock.setup((x) => x.tearDown()))

      const testCtxFactory = await configureIntegrationTestCtxProvider<SomeEnvKeys, SomeMockServerNames, SomeWhenDelta>(
        defaultEnv,
        someFixture.someObjectOfType<WhenDeltaConfig<SomeWhenDelta>>(),
        httpMockkServerMocks.map((x) => x.object),
        clientAndServerProviderStub,
        [],
        givenMocks.map((x) => x.object),
      )

      // when
      const ctx = await testCtxFactory()
      await ctx.after.each()
    })
    it("when no givens and no mock servers", async () => {
      const testCtxFactory = await configureIntegrationTestCtxProvider<SomeEnvKeys, SomeMockServerNames, SomeWhenDelta>(
        defaultEnv,
        someFixture.someObjectOfType<WhenDeltaConfig<SomeWhenDelta>>(),
      )

      // when
      const ctx = await testCtxFactory()
      await ctx.after.each()
    })
  })

  describe("beforeAll", () => {
    it("when givens and mockservers", async () => {
      httpMockkServerMocks.forEach((x, index) =>
        x.setup((x) => x.getEnvEntries()).returns(() => httpMockServerVarEntries[index]),
      )
      httpMockkServerMocks.forEach((x) => x.setup((x) => x.listen()).returns(() => Promise.resolve()))
      givenMocks.forEach((mock, index) => mock.setup((x) => x.setup()))

      const testCtxFactory = await configureIntegrationTestCtxProvider<SomeEnvKeys, SomeMockServerNames, SomeWhenDelta>(
        defaultEnv,
        someFixture.someObjectOfType<WhenDeltaConfig<SomeWhenDelta>>(),
        httpMockkServerMocks.map((x) => x.object),
        clientAndServerProviderStub,
        givenMocks.map((x) => x.object),
        [],
      )

      // when
      const ctx = await testCtxFactory()
      await ctx.before.all()
    })
    it("when no givens and no mockservers", async () => {

      const testCtxFactory = await configureIntegrationTestCtxProvider<SomeEnvKeys, SomeMockServerNames, SomeWhenDelta>(
        defaultEnv,
        someFixture.someObjectOfType<WhenDeltaConfig<SomeWhenDelta>>(),
      )
      // when
      const ctx = await testCtxFactory()
      await ctx.before.all()
    })
  })

  describe("afterAll", () => {
    it("when api config and givens and mockservers", async () => {
      httpMockkServerMocks.forEach((x, index) =>
        x.setup((x) => x.getEnvEntries()).returns(() => httpMockServerVarEntries[index]),
      )
      clientAndServerMock.setup((clientandServer) => clientandServer.close()).returns(() => Promise.resolve())
      httpMockkServerMocks.forEach((x) => x.setup((x) => x.close()).returns(() => Promise.resolve()))
      givenMocks.forEach((mock, index) => mock.setup((x) => x.tearDown()))

      const testCtxFactory = await configureIntegrationTestCtxProvider<SomeEnvKeys, SomeMockServerNames, SomeWhenDelta>(
        defaultEnv,
        someFixture.someObjectOfType<WhenDeltaConfig<SomeWhenDelta>>(),
        httpMockkServerMocks.map((x) => x.object),
        clientAndServerProviderStub,
        givenMocks.map((x) => x.object),
        givenMocks.map((x) => x.object),
      )

      // when
      const ctx = await testCtxFactory()
      await ctx.after.all()
    })
    it("when no api config or givens or mockservers", async () => {

      const testCtxFactory = await configureIntegrationTestCtxProvider<SomeEnvKeys, SomeMockServerNames, SomeWhenDelta>(
        defaultEnv,
        someFixture.someObjectOfType<WhenDeltaConfig<SomeWhenDelta>>(),
      )

      // when
      const ctx = await testCtxFactory()
      await ctx.after.all()
    })
  })

  describe("when", () => {
    it("with no error", async () => {
      const whenDeltaConfigMock: TMocked<WhenDeltaConfig<SomeWhenDelta>> = mocks.mock("whenDeltaConfigMock")
      const firstSnapshot = someFixture.someObjectOfType<SomeWhenDelta>()
      const expectedDelta = someFixture.someObjectOfType<SomeWhenDelta>()

      whenDeltaConfigMock.setup((x) => x.snapshot()).returns(() => Promise.resolve(firstSnapshot))
      whenDeltaConfigMock.setup((x) => x.diff(firstSnapshot)).returns(() => Promise.resolve(expectedDelta))

      httpMockkServerMocks.forEach((x, index) =>
        x.setup((x) => x.getEnvEntries()).returns(() => httpMockServerVarEntries[index]),
      )

      const testCtxFactory = await configureIntegrationTestCtxProvider<SomeEnvKeys, SomeMockServerNames, SomeWhenDelta>(
        defaultEnv,
        whenDeltaConfigMock.object,
        httpMockkServerMocks.map((x) => x.object),
        clientAndServerProviderStub,
        givenMocks.map((x) => x.object),
        [],
      )

      // when
      const ctx = await testCtxFactory()

      type executionResult = { someData: string }
      const expectedResponse: executionResult = { someData: "Hey dude!" }

      const result = await ctx.when<executionResult>(() => Promise.resolve(expectedResponse))
      assertThat(result).is({
        response: expectedResponse,
        delta: expectedDelta,
      })
    })
    it("with error", async () => {
      const whenDeltaConfigMock: TMocked<WhenDeltaConfig<SomeWhenDelta>> = mocks.mock("whenDeltaConfigMock")
      const firstSnapshot = someFixture.someObjectOfType<SomeWhenDelta>()

      whenDeltaConfigMock.setup((x) => x.snapshot()).returns(() => Promise.resolve(firstSnapshot))

      httpMockkServerMocks.forEach((x, index) =>
        x.setup((x) => x.getEnvEntries()).returns(() => httpMockServerVarEntries[index]),
      )

      const testCtxFactory = await configureIntegrationTestCtxProvider<SomeEnvKeys, SomeMockServerNames, SomeWhenDelta>(
        defaultEnv,
        whenDeltaConfigMock.object,
        httpMockkServerMocks.map((x) => x.object),
        clientAndServerProviderStub,
        givenMocks.map((x) => x.object),
        [],
      )

      // when
      const ctx = await testCtxFactory()

      type ExecutionResult = { someData: string }

      const expectedError = new Error("OOOps")
      const whenToExecute = () => {
        throw expectedError
      }
      try {
        const result = await ctx.when<ExecutionResult>(whenToExecute)
        fail("Should never get here")
      } catch (e: any) {
        assertThat(e).is(expectedError)
      }
    })
  })
})
