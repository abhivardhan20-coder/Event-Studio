import { env } from "cloudflare:workers";
import { createGemini } from "@/lib/server/gemini";
import { createPlannerApi } from "@/lib/server/planner-api";
import {
  DatabaseRateLimiter,
  MemoryRateLimiter,
} from "@/lib/server/rate-limit";

export const dynamic = "force-dynamic";
const configuration = () => ({
  key: env.GEMINI_API_KEY || process.env.GEMINI_API_KEY,
  model:
    env.GEMINI_MODEL || process.env.GEMINI_MODEL || "gemini-3.5-flash-lite",
});
const memoryLimiter = new MemoryRateLimiter();
const generate = createGemini(configuration);
function api() {
  return createPlannerApi({
    configuration,
    generate,
    limiter: memoryLimiter,
    paidLimiter: env.DB ? new DatabaseRateLimiter(env.DB) : undefined,
    development: import.meta.env.DEV,
  });
}
export function GET(request: Request) {
  return api().GET(request);
}
export function POST(request: Request) {
  return api().POST(request);
}
