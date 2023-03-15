import { config } from "dotenv";

import { z } from "zod";

if (process.env.NODE_ENV === "test") {
  config({
    path: ".env.test",
  });
} else {
  config();
}

export const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().nonempty(),
  DATABASE_CLIENT: z.enum(["sqlite", "pg"]),
  PORT: z.coerce.number().default(3333),
});

const _env = envSchema.safeParse(process.env);

if (_env.success === false) {
  throw new Error(
    `Invalid environment variables. ${JSON.stringify(_env.error.format())}`
  );
}

export const env = _env.data;
