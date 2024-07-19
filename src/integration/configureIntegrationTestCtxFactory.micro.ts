import http from "http"
import { assertThat, match } from "mismatched"
import { Thespian, TMocked } from "thespian"
import { someFixture } from "../fixture/someFixture"
import { MockHttpServer } from "./mockHttpServer/MockHttpServer"
import { EnvVars } from "./IntegrationTestCtx"
import {
  ApiMaker,
  configureIntegrationTestCtxProvider,
  EnvSetup,
  Given,
  IntegrationTestCtxProvider,
  WhenDeltaConfig,
} from "./configureIntegrationTestCtxFactory"
import { ClientAndServer, ClientAndServerProvider } from "./defaultClientAndServerProvider"
import { RestClient } from "typed-rest-client"

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
  let envSetupMock: TMocked<EnvSetup<SomeEnvKeys>>
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
    envSetupMock = mocks.mock("envSetupMock")

    givenMocks = [mocks.mock("beforeMock1"), mocks.mock("beforeMock2"), mocks.mock("beforeMock3")]

    clientAndServerProviderStub = (env: EnvVars<SomeEnvKeys>) => Promise.resolve(clientAndServerMock.object)
  })

  afterEach(() => {
    mocks.verify()
  })

  describe("api.client", () => {
    it("when no API config", async () => {
      const expectedEnv = {
        EnvKey1: "HttpMockEnvKey1Value",
        EnvKey2: "HttpMockEnvKey2Value",
        EnvKey3: "HttpMockEnvKey3Value",
        EnvKey4: "OriginalEnvKey4Value",
      }

      envSetupMock.setup((x) => x.teardown())
      envSetupMock.setup((x) => x.setup(expectedEnv))
      httpMockkServerMocks.forEach((x, index) =>
        x
          .setup((x) => x.getEnvEntries())
          .returns(() => httpMockServerVarEntries[index])
          .timesAtLeast(0),
      )

      testCtxFactory = configureIntegrationTestCtxProvider(
        defaultEnv,
        envSetupMock.object,
        someFixture.someObjectOfType<WhenDeltaConfig<SomeWhenDelta>>(),
        httpMockkServerMocks.map((x) => x.object),
      )

      // when
      const ctx = await testCtxFactory()

      // then`

      assertThat(ctx).is({
        api: { client: match.any() },
        all: match.any(),
        each: match.any(),
        when: match.any(),
        httpMock: match.any(),
        env: expectedEnv,
      })

      try {
        await ctx.api.client()
        fail("Should never get here")
      } catch (e: any) {
        assertThat(e.message).is("Please configure ClientAndServerProvider to use API.client")
      }
    })
    it("when API Config", async () => {
      const expectedEnv = {
        EnvKey1: "HttpMockEnvKey1Value",
        EnvKey2: "HttpMockEnvKey2Value",
        EnvKey3: "HttpMockEnvKey3Value",
        EnvKey4: "OriginalEnvKey4Value",
      }

      envSetupMock.setup((x) => x.teardown())
      envSetupMock.setup((x) => x.setup(expectedEnv))

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
        envSetupMock.object,
        someFixture.someObjectOfType<WhenDeltaConfig<SomeWhenDelta>>(),
        httpMockkServerMocks.map((x) => x.object),
        clientAndServerProviderStub,
      )

      // when
      const ctx = await testCtxFactory()

      // then`
      assertThat(ctx).is({
        api: { client: match.any() },
        all: match.any(),
        each: match.any(),
        when: match.any(),
        httpMock: match.any(),
        env: expectedEnv,
      })

      const restClient = await ctx.api.client()
      assertThat(restClient).is(expectedRestClient)
    })
  })

  describe("env", () => {
    it("when no mockServers", async () => {
      envSetupMock.setup((x) => x.teardown())
      envSetupMock.setup((x) => x.setup(defaultEnv))

      testCtxFactory = configureIntegrationTestCtxProvider(
        defaultEnv,
        envSetupMock.object,
        someFixture.someObjectOfType<WhenDeltaConfig<SomeWhenDelta>>(),
      )

      // when
      const ctx = await testCtxFactory()

      // then`
      assertThat(ctx).is({
        api: { client: match.any() },
        all: match.any(),
        each: match.any(),
        when: match.any(),
        httpMock: match.any(),
        env: defaultEnv,
      })
    })
    it("when mockServers", async () => {
      const expectedEnv = {
        EnvKey1: "HttpMockEnvKey1Value",
        EnvKey2: "HttpMockEnvKey2Value",
        EnvKey3: "HttpMockEnvKey3Value",
        EnvKey4: "OriginalEnvKey4Value",
      }
      envSetupMock.setup((x) => x.teardown())
      envSetupMock.setup((x) => x.setup(expectedEnv))

      httpMockkServerMocks.forEach((x, index) =>
        x
          .setup((x) => x.getEnvEntries())
          .returns(() => httpMockServerVarEntries[index])
          .timesAtLeast(0),
      )

      testCtxFactory = configureIntegrationTestCtxProvider(
        defaultEnv,
        envSetupMock.object,
        someFixture.someObjectOfType<WhenDeltaConfig<SomeWhenDelta>>(),
        httpMockkServerMocks.map((x) => x.object),
      )

      // when
      const ctx = await testCtxFactory()

      // then`
      assertThat(ctx).is({
        api: { client: match.any() },
        all: match.any(),
        each: match.any(),
        when: match.any(),
        httpMock: match.any(),
        env: expectedEnv,
      })
    })
  })

  describe("each", () => {
    describe("before", () => {
      it("when givens and mockservers", async () => {
        const expectedEnv = {
          EnvKey1: "HttpMockEnvKey1Value",
          EnvKey2: "HttpMockEnvKey2Value",
          EnvKey3: "HttpMockEnvKey3Value",
          EnvKey4: "OriginalEnvKey4Value",
        };

        envSetupMock.setup((x) => x.teardown())
        envSetupMock.setup((x) => x.setup(expectedEnv))

        httpMockkServerMocks.forEach((x, index) =>
          x.setup((x) => x.getEnvEntries()).returns(() => httpMockServerVarEntries[index]),
        )

        givenMocks.forEach((mock, index) => mock.setup((x) => x.teardown()).returns(() => Promise.resolve(mock.object)))
        givenMocks.forEach((mock, index) => mock.setup((x) => x.setup()))

        const testCtxFactory = await configureIntegrationTestCtxProvider<
          SomeEnvKeys,
          SomeMockServerNames,
          SomeWhenDelta
        >(
          defaultEnv,
          envSetupMock.object,
          someFixture.someObjectOfType<WhenDeltaConfig<SomeWhenDelta>>(),
          httpMockkServerMocks.map((x) => x.object),
          clientAndServerProviderStub,
          [],
          givenMocks.map((x) => x.object),
        )

        // when
        const ctx = await testCtxFactory()
        await ctx.each.before()
      })
      it("when no givens or mockservers", async () => {


        envSetupMock.setup((x) => x.teardown())
        envSetupMock.setup((x) => x.setup(defaultEnv))

        testCtxFactory = configureIntegrationTestCtxProvider(
          defaultEnv,
          envSetupMock.object,
          someFixture.someObjectOfType<WhenDeltaConfig<SomeWhenDelta>>(),
        )

        // when
        const ctx = await testCtxFactory()
        await ctx.each.before()
      })
    })
    describe("after", () => {
      it("when givens and mockservers", async () => {

        const expectedEnv = {
          EnvKey1: "HttpMockEnvKey1Value",
          EnvKey2: "HttpMockEnvKey2Value",
          EnvKey3: "HttpMockEnvKey3Value",
          EnvKey4: "OriginalEnvKey4Value",
        };

        envSetupMock.setup((x) => x.teardown())
        envSetupMock.setup((x) => x.setup(expectedEnv))

        httpMockkServerMocks.forEach((x, index) =>
          x.setup((x) => x.getEnvEntries()).returns(() => httpMockServerVarEntries[index]),
        )
        httpMockkServerMocks.forEach((x) => x.setup((x) => x.verify()).returns(() => Promise.resolve()))

        const testCtxFactory = await configureIntegrationTestCtxProvider<
          SomeEnvKeys,
          SomeMockServerNames,
          SomeWhenDelta
        >(
          defaultEnv,
          envSetupMock.object,
          someFixture.someObjectOfType<WhenDeltaConfig<SomeWhenDelta>>(),
          httpMockkServerMocks.map((x) => x.object),
          clientAndServerProviderStub,
          [],
          givenMocks.map((x) => x.object),
        )

        // when
        const ctx = await testCtxFactory()
        await ctx.each.after()
      })
      it("when no givens and no mock servers", async () => {
        envSetupMock.setup((x) => x.teardown())
        envSetupMock.setup((x) => x.setup(defaultEnv))
        testCtxFactory = configureIntegrationTestCtxProvider(
          defaultEnv,
          envSetupMock.object,
          someFixture.someObjectOfType<WhenDeltaConfig<SomeWhenDelta>>(),
        )

        // when
        const ctx = await testCtxFactory()
        await ctx.each.after()
      })
    })
  })

  describe("all", () => {
    describe("before", () => {
      it("when givens and mockservers", async () => {

        const expectedEnv = {
          EnvKey1: "HttpMockEnvKey1Value",
          EnvKey2: "HttpMockEnvKey2Value",
          EnvKey3: "HttpMockEnvKey3Value",
          EnvKey4: "OriginalEnvKey4Value",
        };

        envSetupMock.setup((x) => x.teardown())
        envSetupMock.setup((x) => x.setup(expectedEnv))

        httpMockkServerMocks.forEach((x, index) =>
          x.setup((x) => x.getEnvEntries()).returns(() => httpMockServerVarEntries[index]),
        )
        httpMockkServerMocks.forEach((x) => x.setup((x) => x.listen()).returns(() => Promise.resolve()))

        givenMocks.forEach((mock) =>
          mock.setup((given) => given.teardown()).returns(() => Promise.resolve(mock.object)),
        )
        givenMocks.forEach((mock) => mock.setup((given) => given.setup()).returns(() => Promise.resolve(mock.object)))

        testCtxFactory = await configureIntegrationTestCtxProvider<SomeEnvKeys, SomeMockServerNames, SomeWhenDelta>(
          defaultEnv,
          envSetupMock.object,
          someFixture.someObjectOfType<WhenDeltaConfig<SomeWhenDelta>>(),
          httpMockkServerMocks.map((x) => x.object),
          clientAndServerProviderStub,
          givenMocks.map((x) => x.object),
          [],
        )

        // when
        const ctx = await testCtxFactory()
        await ctx.all.before()
      })
      it("when no givens and no mockservers", async () => {

        envSetupMock.setup((x) => x.teardown())
        envSetupMock.setup((x) => x.setup(defaultEnv))

        testCtxFactory = configureIntegrationTestCtxProvider(
          defaultEnv,
          envSetupMock.object,
          someFixture.someObjectOfType<WhenDeltaConfig<SomeWhenDelta>>(),
        )

        // when
        const ctx = await testCtxFactory()
        await ctx.all.before()
      })
    })
    describe("after", () => {
      it("when api config and givens and mockservers", async () => {

        const expectedEnv = {
          EnvKey1: "HttpMockEnvKey1Value",
          EnvKey2: "HttpMockEnvKey2Value",
          EnvKey3: "HttpMockEnvKey3Value",
          EnvKey4: "OriginalEnvKey4Value",
        };

        envSetupMock.setup((x) => x.teardown())
        envSetupMock.setup((x) => x.setup(expectedEnv))

        httpMockkServerMocks.forEach((x, index) =>
          x.setup((x) => x.getEnvEntries()).returns(() => httpMockServerVarEntries[index]),
        )
        clientAndServerMock.setup((clientandServer) => clientandServer.close()).returns(() => Promise.resolve())
        httpMockkServerMocks.forEach((x) => x.setup((x) => x.close()).returns(() => Promise.resolve()))

        testCtxFactory = await configureIntegrationTestCtxProvider<SomeEnvKeys, SomeMockServerNames, SomeWhenDelta>(
          defaultEnv,
          envSetupMock.object,
          someFixture.someObjectOfType<WhenDeltaConfig<SomeWhenDelta>>(),
          httpMockkServerMocks.map((x) => x.object),
          clientAndServerProviderStub,
          givenMocks.map((x) => x.object),
          givenMocks.map((x) => x.object),
        )

        // when
        const ctx = await testCtxFactory()
        await ctx.all.after()
      })
      it("when no api config or givens or mockservers", async () => {


        envSetupMock.setup((x) => x.teardown())
        envSetupMock.setup((x) => x.setup(defaultEnv))

        testCtxFactory = configureIntegrationTestCtxProvider(
          defaultEnv,
          envSetupMock.object,
          someFixture.someObjectOfType<WhenDeltaConfig<SomeWhenDelta>>(),
        )

        // when
        const ctx = await testCtxFactory()
        await ctx.all.after()
      })
    })
  })

  describe("when", () => {
    it("with no error", async () => {
      const whenDeltaConfigMock: TMocked<WhenDeltaConfig<SomeWhenDelta>> = mocks.mock("whenDeltaConfigMock")
      const firstSnapshot = someFixture.someObjectOfType<SomeWhenDelta>()
      const expectedDelta = someFixture.someObjectOfType<SomeWhenDelta>()

      const expectedEnv = {
        EnvKey1: "HttpMockEnvKey1Value",
        EnvKey2: "HttpMockEnvKey2Value",
        EnvKey3: "HttpMockEnvKey3Value",
        EnvKey4: "OriginalEnvKey4Value",
      };

      envSetupMock.setup((x) => x.teardown())
      envSetupMock.setup((x) => x.setup(expectedEnv))

      whenDeltaConfigMock.setup((x) => x.snapshot()).returns(() => Promise.resolve(firstSnapshot))
      whenDeltaConfigMock.setup((x) => x.diff(firstSnapshot)).returns(() => Promise.resolve(expectedDelta))

      httpMockkServerMocks.forEach((x, index) =>
        x.setup((x) => x.getEnvEntries()).returns(() => httpMockServerVarEntries[index]),
      )

      const testCtxFactory = await configureIntegrationTestCtxProvider<SomeEnvKeys, SomeMockServerNames, SomeWhenDelta>(
        defaultEnv,
        envSetupMock.object,
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

      const expectedEnv = {
        EnvKey1: "HttpMockEnvKey1Value",
        EnvKey2: "HttpMockEnvKey2Value",
        EnvKey3: "HttpMockEnvKey3Value",
        EnvKey4: "OriginalEnvKey4Value",
      };

      envSetupMock.setup((x) => x.teardown())
      envSetupMock.setup((x) => x.setup(expectedEnv))

      httpMockkServerMocks.forEach((x, index) =>
        x.setup((x) => x.getEnvEntries()).returns(() => httpMockServerVarEntries[index]),
      )

      const testCtxFactory = await configureIntegrationTestCtxProvider<SomeEnvKeys, SomeMockServerNames, SomeWhenDelta>(
        defaultEnv,
        envSetupMock.object,
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
