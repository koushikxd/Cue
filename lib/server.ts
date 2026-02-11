import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const serverEnv = createEnv({
  server: {
    NODE_ENV: z.enum(["development", "production", "test"]),
    CLERK_SECRET_KEY: z.string().min(1, "CLERK_SECRET_KEY is required"),
    GOOGLE_CLIENT_ID: z.string().optional(),
    GOOGLE_CLIENT_SECRET: z.string().optional(),
  },
  experimental__runtimeEnv: process.env,
});
