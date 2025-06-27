import { registerAs } from "@nestjs/config"

export default registerAs("jwt", () => ({
  secret: process.env.JWT_SECRET || "your_default_secret",
  audience: process.env.JWT_TOKEN_AUDIENCE || "your_audience",
  issuer: process.env.JWT_TOKEN_ISSUER || "your_issuer",
  expiresIn: Number.parseInt(process.env.JWT_EXPIRATION ?? "3600", 10),
  refreshExpiresIn: Number.parseInt(process.env.JWT_REFRESH_TOKEN_TTL ?? "7776000", 10),
  googleClient_id: process.env.GOOGLE_OAUTH_CLIENT_ID,
  googleClient_secret: process.env.GOOGLE_OAUTH_CLIENT_SECRET,
}))
