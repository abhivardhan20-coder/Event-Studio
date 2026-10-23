import { z } from "zod";
export const aiStatusSchema = z.object({
  configured: z.boolean(),
  provider: z.literal("gemini"),
  requiresSignIn: z.boolean().default(false),
});
export type AIStatus = z.infer<typeof aiStatusSchema>;
export const SIGN_IN_PATH = "/signin-with-chatgpt?return_to=%2F";
export const chatReplySchema = z.object({
  text: z.string().trim().min(1).max(20000),
  source: z.enum(["gemini", "built-in"]),
});
const errorSchema = z.object({
  error: z.string().max(500),
  code: z.string().optional(),
});
export async function readApiResponse(response: Response): Promise<unknown> {
  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new Error("We couldn’t read the server response. Please try again.");
  }
  if (!response.ok) {
    const parsed = errorSchema.safeParse(payload);
    throw new Error(
      parsed.success
        ? parsed.data.error
        : "The request could not be completed. Please try again.",
    );
  }
  return payload;
}
