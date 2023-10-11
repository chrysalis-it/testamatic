import http from "http"
import { assertThat, match } from "mismatched"
import { Thespian, TMocked } from "thespian"
import { someFixture } from "../fixture/someFixture"
import { MockHttpServer } from "./mockHttpServer/MockHttpServer"
import {EnvVars} from "./IntegrationTestCtx";
import {ApiMaker, configureIntegrationTestContext, WhenDeltaConfig} from "./configureIntegrationTestCtxFactory";

type SomeEnvKeys = "Key1" | "Key2" | "Key3" | "Key4"
type SomeEnvVars = { [key in SomeEnvKeys]: string }
const envEntries: Partial<SomeEnvVars>[] = [
  { Key1: "HttpMockEnvKey1Value" },
  { Key2: "HttpMockEnvKey2Value" },
  { Key3: "HttpMockEnvKey3Value" },
]

const someEnv: EnvVars<SomeEnvKeys> = {
  Key1: "OriginalEnvKey1Value",
  Key2: "OriginalEnvKey2Value",
  Key3: "OriginalEnvKey3Value",
  Key4: "OriginalEnvKey4Value",
}

type SomeMockServerNames = "HttpMockServer1" | "HttpMockServer2" | "HttpMockServer3"

class SomeWhenDelta {
  list: Array<string>
}

describe("IntegrationTestCtx.micro", () => {
  let mocks: Thespian
  let httpMockkServerMocks: TMocked<MockHttpServer<any, any>>[]
  let httpMockkServers: MockHttpServer<any, any>[]
  let apiMakerMock: TMocked<ApiMaker>
  let apiMock: TMocked<http.Server>

  beforeEach(() => {
    mocks = new Thespian()

    httpMockkServerMocks = [
      mocks.mock("HttpMockkServer1"),
      mocks.mock("HttpMockkServer2"),
      mocks.mock("HttpMockkServer3"),
    ]

    httpMockkServers = httpMockkServerMocks.map((x) => x.object)

    apiMakerMock = mocks.mock("apiMakerMock")
    apiMock = mocks.mock("apiMock")
  })

  afterEach(() => {
    mocks.verify()
  })

  describe("with no APi Config", () => {
    it("is created correctly", () => {
      httpMockkServerMocks.forEach((x, index) => x.setup((x) => x.getEnvEntries()).returns(() => envEntries[index]))

      const testCtxFactory = configureIntegrationTestContext<SomeEnvKeys, SomeMockServerNames, SomeWhenDelta>(
        someEnv,
        httpMockkServers,
        someFixture.someObjectOfType<WhenDeltaConfig<SomeWhenDelta>>()
      )

      // when
      const ctx = testCtxFactory()

      // then`
      assertThat(ctx).is(
        match.obj.has({
          api: { client: undefined },
          env: {
            Key1: "HttpMockEnvKey1Value",
            Key2: "HttpMockEnvKey2Value",
            Key3: "HttpMockEnvKey3Value",
            Key4: "OriginalEnvKey4Value",
          },
        })
      )
    })

    it("beforeAll", async () => {
      httpMockkServerMocks.forEach((x, index) => x.setup((x) => x.getEnvEntries()).returns(() => envEntries[index]))
      httpMockkServerMocks.forEach((x) => x.setup((x) => x.listen()).returns(() => Promise.resolve()))

      const testCtxFactory = configureIntegrationTestContext<SomeEnvKeys, SomeMockServerNames, SomeWhenDelta>(
        someEnv,
        httpMockkServers,
        someFixture.someObjectOfType<WhenDeltaConfig<SomeWhenDelta>>()
      )

      // when
      const ctx = testCtxFactory()
      await ctx.before.all()
    })

    it("beforeEach", async () => {
      httpMockkServerMocks.forEach((x, index) => x.setup((x) => x.getEnvEntries()).returns(() => envEntries[index]))

      const testCtxFactory = configureIntegrationTestContext<SomeEnvKeys, SomeMockServerNames, SomeWhenDelta>(
        someEnv,
        httpMockkServers,
        someFixture.someObjectOfType<WhenDeltaConfig<SomeWhenDelta>>()
      )

      // when
      const ctx = testCtxFactory()
      await ctx.before.each()
    })

    it("afterAll", async () => {
      httpMockkServerMocks.forEach((x, index) => x.setup((x) => x.getEnvEntries()).returns(() => envEntries[index]))
      httpMockkServerMocks.forEach((x) => x.setup((x) => x.close()).returns(() => Promise.resolve()))

      const testCtxFactory = configureIntegrationTestContext<SomeEnvKeys, SomeMockServerNames, SomeWhenDelta>(
        someEnv,
        httpMockkServers,
        someFixture.someObjectOfType<WhenDeltaConfig<SomeWhenDelta>>()
      )

      // when
      const ctx = testCtxFactory()
      await ctx.after.all()
    })

    it("afterEach", async () => {
      httpMockkServerMocks.forEach((x, index) => x.setup((x) => x.getEnvEntries()).returns(() => envEntries[index]))
      httpMockkServerMocks.forEach((x) => x.setup((x) => x.verify()).returns(() => Promise.resolve()))

      const testCtxFactory = configureIntegrationTestContext<SomeEnvKeys, SomeMockServerNames, SomeWhenDelta>(
        someEnv,
        httpMockkServers,
        someFixture.someObjectOfType<WhenDeltaConfig<SomeWhenDelta>>()
      )

      // when
      const ctx = testCtxFactory()
      await ctx.after.each()
    })
  })
  describe("with APi Config", () => {
    const port = someFixture.someUniqueNumber()

    it("is created correctly", () => {
      httpMockkServerMocks.forEach((x, index) => x.setup((x) => x.getEnvEntries()).returns(() => envEntries[index]))

      const testCtxFactory = configureIntegrationTestContext<SomeEnvKeys, SomeMockServerNames, SomeWhenDelta>(
        someEnv,
        httpMockkServers,
        someFixture.someObjectOfType<WhenDeltaConfig<SomeWhenDelta>>(),
        { port: someFixture.someUniqueNumber(), makeApi: apiMakerMock.object }
      )

      // when
      const ctx = testCtxFactory()

      // then`
      assertThat(ctx).is(
        match.obj.has({
          api: { client: match.any() },
          env: {
            Key1: "HttpMockEnvKey1Value",
            Key2: "HttpMockEnvKey2Value",
            Key3: "HttpMockEnvKey3Value",
            Key4: "OriginalEnvKey4Value",
          },
        })
      )
    })

    it.skip("beforeAll", async () => {
      httpMockkServerMocks.forEach((x, index) => x.setup((x) => x.getEnvEntries()).returns(() => envEntries[index]))
      httpMockkServerMocks.forEach((x) => x.setup((x) => x.listen()).returns(() => Promise.resolve()))

      apiMock.setup((x) => x.listen({ port, exclusive: false }, match.any()))
      apiMakerMock.setup((x) => x(match.any())).returns(() => Promise.resolve(apiMock.object))

      const testCtxFactory = configureIntegrationTestContext<SomeEnvKeys, SomeMockServerNames, SomeWhenDelta>(
        someEnv,
        httpMockkServers,
        someFixture.someObjectOfType<WhenDeltaConfig<SomeWhenDelta>>(),
        { port, makeApi: apiMakerMock.object }
      )

      // when
      const ctx = testCtxFactory()
      await ctx.before.all()
    })

    it("beforeEach", async () => {
      httpMockkServerMocks.forEach((x, index) => x.setup((x) => x.getEnvEntries()).returns(() => envEntries[index]))

      const testCtxFactory = configureIntegrationTestContext<SomeEnvKeys, SomeMockServerNames, SomeWhenDelta>(
        someEnv,
        httpMockkServers,
        someFixture.someObjectOfType<WhenDeltaConfig<SomeWhenDelta>>(),
        { port, makeApi: apiMakerMock.object }
      )

      // when
      const ctx = testCtxFactory()
      await ctx.before.each()
    })

    it("afterAll", async () => {
      httpMockkServerMocks.forEach((x, index) => x.setup((x) => x.getEnvEntries()).returns(() => envEntries[index]))
      httpMockkServerMocks.forEach((x) => x.setup((x) => x.close()).returns(() => Promise.resolve()))

      const testCtxFactory = configureIntegrationTestContext<SomeEnvKeys, SomeMockServerNames, SomeWhenDelta>(
        someEnv,
        httpMockkServers,
        someFixture.someObjectOfType<WhenDeltaConfig<SomeWhenDelta>>(),
        { port, makeApi: apiMakerMock.object }
      )

      // when
      const ctx = testCtxFactory()
      await ctx.after.all()
    })

    it("afterEach", async () => {
      httpMockkServerMocks.forEach((x, index) => x.setup((x) => x.getEnvEntries()).returns(() => envEntries[index]))
      httpMockkServerMocks.forEach((x) => x.setup((x) => x.verify()).returns(() => Promise.resolve()))

      const testCtxFactory = configureIntegrationTestContext<SomeEnvKeys, SomeMockServerNames, SomeWhenDelta>(
        someEnv,
        httpMockkServers,
        someFixture.someObjectOfType<WhenDeltaConfig<SomeWhenDelta>>(),
        { port, makeApi: apiMakerMock.object }
      )

      // when
      const ctx = testCtxFactory()
      await ctx.after.each()
    })

    describe("when", () => {
      it("with no error", async () => {
        const whenDeltaConfigMock: TMocked<WhenDeltaConfig<SomeWhenDelta>> = mocks.mock("whenDeltaConfigMock")
        const firstSnapshot = someFixture.someObjectOfType<SomeWhenDelta>()
        const secondSnapshot = someFixture.someObjectOfType<SomeWhenDelta>()
        const expectedDelta = someFixture.someObjectOfType<SomeWhenDelta>()

        whenDeltaConfigMock.setup((x) => x.snapshot()).returns(() => Promise.resolve(firstSnapshot))
        whenDeltaConfigMock.setup((x) => x.snapshot()).returns(() => Promise.resolve(secondSnapshot))
        whenDeltaConfigMock
          .setup((x) => x.diff(firstSnapshot, secondSnapshot))
          .returns(() => Promise.resolve(expectedDelta))

        httpMockkServerMocks.forEach((x, index) => x.setup((x) => x.getEnvEntries()).returns(() => envEntries[index]))

        const testCtxFactory = configureIntegrationTestContext<SomeEnvKeys, SomeMockServerNames, SomeWhenDelta>(
          someEnv,
          httpMockkServers,
          whenDeltaConfigMock.object,
          { port, makeApi: apiMakerMock.object }
        )

        // when
        const ctx = testCtxFactory()

        type executionResult = { someData: string }
        const expectedResponse: executionResult = { someData: "Hey dude!" }

        const result = await ctx.when<executionResult>(() => Promise.resolve(expectedResponse))
        assertThat(result).is({
          response: expectedResponse,
          delta: expectedDelta,
        })
      })
    })
  })
})
