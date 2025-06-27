/* eslint-disable @typescript-eslint/no-unused-vars */
// admin-jwt.strategy.ts
import { ExtractJwt, Strategy } from "passport-jwt"
import { PassportStrategy } from "@nestjs/passport"
import { Injectable } from "@nestjs/common"
import { ConfigService } from "@nestjs/config"
import { AdminService } from "../providers/admin.service"

@Injectable()
export class AdminJwtStrategy extends PassportStrategy(Strategy, "admin-jwt") {
  constructor(
    private configService: ConfigService,
    private adminService: AdminService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>("JWT_SECRET") || "fallback_secret_key",
    })
  }

  async validate(payload: any) {
    const admin = await this.adminService.findOneById(payload.sub)
    // Filter out sensitive data
    const { password, refreshToken, resetToken, ...result } = admin
    return result
  }
}
