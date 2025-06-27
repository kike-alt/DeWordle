import "reflect-metadata"
import { DataSource } from "typeorm"
import * as dotenv from "dotenv"

dotenv.config()

import { User } from "./users/entities/user.entity"
import { Result } from "./games/dewordle/result/entities/result.entity"
import { Leaderboard } from "./games/dewordle/leaderboard/entities/leaderboard.entity"
import { Admin } from "./admin/entities/admin.entity"
import { SubAdmin } from "./sub-admin/entities/sub-admin-entity"

export const AppDataSource = new DataSource({
  type: "postgres",
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT) || 5432,
  username: process.env.DB_USERNAME,
  password: String(process.env.DB_PASSWORD),
  database: process.env.DB_NAME,
  entities: [User, Result, Leaderboard, Admin, SubAdmin],
  migrations: ["src/migrations/*.ts"],
  synchronize: false,
  logging: process.env.NODE_ENV === "development",
  ssl:
    process.env.DB_SSL === "true"
      ? {
          rejectUnauthorized: false,
        }
      : false,
  extra:
    process.env.DB_SSL === "true"
      ? {
          ssl: {
            rejectUnauthorized: false,
          },
        }
      : {},
})
