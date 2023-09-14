import { exportJWK, JSONWebKeySet, JWK } from "jose"
import { cert } from "./certificateFixture"
import { createPublicKey } from "crypto"

export const jsonKeySetFixture = async (jwtKey: typeof cert.server = cert.server): Promise<JSONWebKeySet> => {
  const jwk = await makejwk(jwtKey)
  return { keys: [jwk] }
}

const makejwk = async (jwtKey: typeof cert.server = cert.server): Promise<JWK> => {
  const pem = Buffer.from(jwtKey.publicKey)
  const publicKey = createPublicKey(pem)
  const jwk1: JWK = await exportJWK(publicKey)

  return {
    use: "sig",
    alg: "RS256",
    x5t: jwtKey.kid,
    ...jwk1,
    kid: jwtKey.kid,
  }
}
