import http from "http"
import {assertThat, match} from "mismatched"
import {Thespian, TMocked} from "thespian"
import {someFixture} from "../fixture/someFixture"
import {MockHttpServer} from "./mockHttpServer/MockHttpServer"
import {EnvVars} from "./IntegrationTestCtx"
import {
  configureIntegrationTestCtxProvider,
  EnvSetup,
  Given,
  IntegrationTestCtxProvider,
  ClientAndServerProvider,
  WhenDeltaConfig, ClientAndServer,
} from "./configureIntegrationTestCtxFactory"
import {TcpListener} from "../tcp/tcp.types";
import {MockHttpServerExpectation} from "./mockHttpServer/MockHttpExpectation";

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
  let apiMock: TMocked<http.Server>
  let clientAndServerMock: TMocked<ClientAndServer>
  let envSetupMock: TMocked<EnvSetup<SomeEnvKeys>>
  let testCtxFactory: IntegrationTestCtxProvider<SomeEnvKeys, SomeMockServerNames, SomeWhenDelta>
  let clientAndServerProviderMock: TMocked<ClientAndServerProvider<SomeEnvKeys>>

  let givenMocks: TMocked<Given>[]

  beforeEach(async () => {
    mocks = new Thespian()

    httpMockkServerMocks = [
      mocks.mock("HttpMockkServer1"),
      mocks.mock("HttpMockkServer2"),
      mocks.mock("HttpMockkServer3"),
    ]
    apiMock = mocks.mock("apiMock")
    clientAndServerMock = mocks.mock("clientAndServerMock")
    envSetupMock = mocks.mock("envSetupMock")

    givenMocks = [mocks.mock("beforeMock1"), mocks.mock("beforeMock2"), mocks.mock("beforeMock3")]

    clientAndServerProviderMock = mocks.mock("clientAndServerProviderMock")
  })

  afterEach(() => {
    mocks.verify()
  })

  describe("configureIntegrationTestCtxProvider()", () => {
    it("configureIntegrationTestCtxProvider doesnt call anything", () => {
      testCtxFactory = configureIntegrationTestCtxProvider(
        clientAndServerProviderMock.object,
        {
          defaultEnv,
          envSetup: envSetupMock.object,
        },
        someFixture.someObjectOfType<WhenDeltaConfig<SomeWhenDelta>>(),
        httpMockkServerMocks.map((x) => x.object),

      )
    })
  })

  describe("integrationTestCtxProvider()", () => {
    it("no mock servers", async () => {
      testCtxFactory = configureIntegrationTestCtxProvider(
        clientAndServerProviderMock.object,
        {
          defaultEnv,
          envSetup: envSetupMock.object,
        },
        someFixture.someObjectOfType<WhenDeltaConfig<SomeWhenDelta>>(),
      )

      envSetupMock.setup((x) => x.teardown())
      clientAndServerProviderMock.setup(x => x(defaultEnv)).returns(() => Promise.resolve(clientAndServerMock.object))
      envSetupMock.setup((x) => x.setup(defaultEnv))

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
      clientAndServerProviderMock.setup(x => x(expectedEnv)).returns(() => Promise.resolve(clientAndServerMock.object))

      httpMockkServerMocks.forEach((x, index) =>
        x
          .setup((x) => x.getEnvEntries())
          .returns(() => httpMockServerVarEntries[index])
          .timesAtLeast(0),
      )

      testCtxFactory = configureIntegrationTestCtxProvider(
        clientAndServerProviderMock.object,
        {
          defaultEnv,
          envSetup: envSetupMock.object,
        },
        someFixture.someObjectOfType<WhenDeltaConfig<SomeWhenDelta>>(),
        httpMockkServerMocks.map((x) => x.object)
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
        clientAndServerProviderMock.setup(x => x(expectedEnv)).returns(() => Promise.resolve(clientAndServerMock.object))


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
          clientAndServerProviderMock.object,
          {
            defaultEnv,
            envSetup: envSetupMock.object,
          },
          someFixture.someObjectOfType<WhenDeltaConfig<SomeWhenDelta>>(),
          httpMockkServerMocks.map((x) => x.object),
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
        clientAndServerProviderMock.setup(x => x(defaultEnv)).returns(() => Promise.resolve(clientAndServerMock.object))

        testCtxFactory = configureIntegrationTestCtxProvider(
          clientAndServerProviderMock.object,
          {
            defaultEnv,
            envSetup: envSetupMock.object,
          },
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
        clientAndServerProviderMock.setup(x => x(expectedEnv)).returns(() => Promise.resolve(clientAndServerMock.object))


        httpMockkServerMocks.forEach((x, index) =>
          x.setup((x) => x.getEnvEntries()).returns(() => httpMockServerVarEntries[index]),
        )
        httpMockkServerMocks.forEach((x) => x.setup((x) => x.verify()).returns(() => Promise.resolve()))

        const testCtxFactory = await configureIntegrationTestCtxProvider<
          SomeEnvKeys,
          SomeMockServerNames,
          SomeWhenDelta
        >(
          clientAndServerProviderMock.object,
          {
            defaultEnv,
            envSetup: envSetupMock.object,
          },
          someFixture.someObjectOfType<WhenDeltaConfig<SomeWhenDelta>>(),
          httpMockkServerMocks.map((x) => x.object),
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
        clientAndServerProviderMock.setup(x => x(defaultEnv)).returns(() => Promise.resolve(clientAndServerMock.object))


        testCtxFactory = configureIntegrationTestCtxProvider(
          clientAndServerProviderMock.object,
          {
            defaultEnv,
            envSetup: envSetupMock.object,
          },
          someFixture.someObjectOfType<WhenDeltaConfig<SomeWhenDelta>>(),
        )

        // when
        const ctx = await testCtxFactory()
        await ctx.each.after()
      })
    })
  })

  describe("mock.setup", () => {
      it.skip("when mockserver exists", async () => {
        const mockServerName = "HttpMockServer1";

        const expectedEnv = {
          EnvKey1: "HttpMockEnvKey1Value",
          EnvKey2: "OriginalEnvKey2Value",
          EnvKey3: "OriginalEnvKey3Value",
          EnvKey4: "OriginalEnvKey4Value",
        };

        envSetupMock.setup((x) => x.teardown())
        envSetupMock.setup((x) => x.setup(expectedEnv))
        clientAndServerProviderMock.setup(x => x(expectedEnv)).returns(() => Promise.resolve(clientAndServerMock.object))
        httpMockkServerMocks[0].setup((x) => x.getEnvEntries()).returns(() => httpMockServerVarEntries[0])

        testCtxFactory = await configureIntegrationTestCtxProvider<SomeEnvKeys, SomeMockServerNames, SomeWhenDelta>(
          clientAndServerProviderMock.object,
          {
            defaultEnv,
            envSetup: envSetupMock.object,
          },
          someFixture.someObjectOfType<WhenDeltaConfig<SomeWhenDelta>>(),
          [httpMockkServerMocks[0].object],
          [],
          [],
        )
        const ctx = await testCtxFactory()
        mocks.verify()

        const mockHttpServerExpectation = someFixture.someObjectOfType<MockHttpServerExpectation>();
        httpMockkServerMocks[0].setup(x => x.name).returns(() => mockServerName).timesAtLeast(0)
        httpMockkServerMocks[0].setup(x => x.expect(mockHttpServerExpectation))

        // // when
        ctx.httpMock.expect(mockServerName, mockHttpServerExpectation)

      })
      it("when no mockservers", async () => {

        envSetupMock.setup((x) => x.teardown())
        envSetupMock.setup((x) => x.setup(defaultEnv))
        clientAndServerProviderMock.setup(x => x(defaultEnv)).returns(() => Promise.resolve(clientAndServerMock.object))

        testCtxFactory = configureIntegrationTestCtxProvider(
          clientAndServerProviderMock.object,
          {
            defaultEnv,
            envSetup: envSetupMock.object,
          },
          someFixture.someObjectOfType<WhenDeltaConfig<SomeWhenDelta>>(),
        )

        // when
        const ctx = await testCtxFactory()

        const mockHttpServerExpectation = someFixture.someObjectOfType<MockHttpServerExpectation>();

        try {
        ctx.httpMock.expect("HttpMockServer1", mockHttpServerExpectation)
          fail('Should never get here')
        } catch (e) {
          assertThat(e.message).is("Can not find mock server using name HttpMockServer1");
        }
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
        clientAndServerProviderMock.setup(x => x(expectedEnv)).returns(() => Promise.resolve(clientAndServerMock.object))


        httpMockkServerMocks.forEach((x, index) =>
          x.setup((x) => x.getEnvEntries()).returns(() => httpMockServerVarEntries[index]),
        )
        httpMockkServerMocks.forEach((x) => x.setup((x) => x.listen()).returns(() => Promise.resolve()))

        givenMocks.forEach((mock) =>
          mock.setup((given) => given.teardown()).returns(() => Promise.resolve(mock.object)),
        )
        givenMocks.forEach((mock) => mock.setup((given) => given.setup()).returns(() => Promise.resolve(mock.object)))

        testCtxFactory = await configureIntegrationTestCtxProvider<SomeEnvKeys, SomeMockServerNames, SomeWhenDelta>(
          clientAndServerProviderMock.object,
          {
            defaultEnv,
            envSetup: envSetupMock.object,
          },
          someFixture.someObjectOfType<WhenDeltaConfig<SomeWhenDelta>>(),
          httpMockkServerMocks.map((x) => x.object),
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
        clientAndServerProviderMock.setup(x => x(defaultEnv)).returns(() => Promise.resolve(clientAndServerMock.object))

        testCtxFactory = configureIntegrationTestCtxProvider(
          clientAndServerProviderMock.object,
          {
            defaultEnv,
            envSetup: envSetupMock.object,
          },
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
        clientAndServerProviderMock.setup(x => x(expectedEnv)).returns(() => Promise.resolve(clientAndServerMock.object))



        httpMockkServerMocks.forEach((x, index) =>
          x.setup((x) => x.getEnvEntries()).returns(() => httpMockServerVarEntries[index]),
        )
        clientAndServerMock.setup((clientandServer) => clientandServer.close()).returns(() => Promise.resolve())
        httpMockkServerMocks.forEach((x) => x.setup((x) => x.close()).returns(() => Promise.resolve()))

        testCtxFactory = await configureIntegrationTestCtxProvider<SomeEnvKeys, SomeMockServerNames, SomeWhenDelta>(
          clientAndServerProviderMock.object,
          {
            defaultEnv,
            envSetup: envSetupMock.object,
          },
          someFixture.someObjectOfType<WhenDeltaConfig<SomeWhenDelta>>(),
          httpMockkServerMocks.map((x) => x.object),
          givenMocks.map((x) => x.object),
          givenMocks.map((x) => x.object),
        )

        // when
        const ctx = await testCtxFactory()
        await ctx.all.after()
      })
      it("when givens or mockservers", async () => {


        envSetupMock.setup((x) => x.teardown())
        envSetupMock.setup((x) => x.setup(defaultEnv))
        clientAndServerProviderMock.setup(x => x(defaultEnv)).returns(() => Promise.resolve(clientAndServerMock.object))
        clientAndServerMock.setup(x => x.close).returns(x => () => Promise.resolve())


        testCtxFactory = configureIntegrationTestCtxProvider(
          clientAndServerProviderMock.object,
          {
            defaultEnv,
            envSetup: envSetupMock.object,
          },
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
      clientAndServerProviderMock.setup(x => x(expectedEnv)).returns(() => Promise.resolve(clientAndServerMock.object))


      whenDeltaConfigMock.setup((x) => x.snapshot()).returns(() => Promise.resolve(firstSnapshot))
      whenDeltaConfigMock.setup((x) => x.diff(firstSnapshot)).returns(() => Promise.resolve(expectedDelta))

      httpMockkServerMocks.forEach((x, index) =>
        x.setup((x) => x.getEnvEntries()).returns(() => httpMockServerVarEntries[index]),
      )

      httpMockkServerMocks.forEach((x) => x.setup((x) => x.verify()).returns(() => Promise.resolve()))


      const testCtxFactory = await configureIntegrationTestCtxProvider<SomeEnvKeys, SomeMockServerNames, SomeWhenDelta>(
        clientAndServerProviderMock.object,
        {
          defaultEnv,
          envSetup: envSetupMock.object,
        },
        whenDeltaConfigMock.object,
        httpMockkServerMocks.map((x) => x.object),
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
      clientAndServerProviderMock.setup(x => x(expectedEnv)).returns(() => Promise.resolve(clientAndServerMock.object))


      httpMockkServerMocks.forEach((x, index) =>
        x.setup((x) => x.getEnvEntries()).returns(() => httpMockServerVarEntries[index]),
      )
      httpMockkServerMocks.forEach((x) => x.setup((x) => x.verify()).returns(() => Promise.resolve()))


      const testCtxFactory = await configureIntegrationTestCtxProvider<SomeEnvKeys, SomeMockServerNames, SomeWhenDelta>(
        clientAndServerProviderMock.object,
        {
          defaultEnv,
          envSetup: envSetupMock.object,
        },
        whenDeltaConfigMock.object,
        httpMockkServerMocks.map((x) => x.object),
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
