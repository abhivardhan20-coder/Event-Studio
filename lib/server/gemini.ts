import { z } from "zod";
import { planJsonSchema } from "./schemas.ts";

export interface AIConfiguration {
  key?: string;
  model: string;
}
export interface Content {
  role: "user" | "model";
  parts: { text: string }[];
}
export type Generate = (
  system: string,
  contents: Content[],
  structured?: boolean,
  signal?: AbortSignal,
) => Promise<string>;
export class ProviderError extends Error {
  constructor(public status: number) {
    super("The AI provider could not complete this request.");
    this.name = "ProviderError";
  }
}
const providerResponse = z.object({
  candidates: z
    .array(
      z.object({
        content: z
          .object({
            parts: z.array(
              z.object({
                text: z.string().optional(),
                thought: z.boolean().optional(),
              }),
            ),
          })
          .optional(),
        finishReason: z.string().optional(),
      }),
    )
    .optional(),
});

export function createGemini(
  configuration: () => AIConfiguration,
  transport: typeof fetch = fetch,
): Generate {
  return async (system, contents, structured = false, signal) => {
    const { key, model } = configuration();
    if (!key || !/^[a-zA-Z0-9.-]+$/.test(model)) throw new ProviderError(503);
    const response = await transport(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": key },
        signal: signal
          ? AbortSignal.any([signal, AbortSignal.timeout(28000)])
          : AbortSignal.timeout(28000),
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system }] },
          contents,
          generationConfig: {
            maxOutputTokens: structured ? 4200 : 1200,
            ...(structured
              ? {
                  responseFormat: {
                    text: {
                      mimeType: "APPLICATION_JSON",
                      schema: planJsonSchema,
                    },
                  },
                }
              : {}),
          },
        }),
      },
    );
    if (!response.ok) throw new ProviderError(response.status);
    const data = providerResponse.safeParse(await response.json());
    if (!data.success) throw new ProviderError(502);
    const candidate = data.data.candidates?.[0];
    if (
      !candidate ||
      (candidate.finishReason && candidate.finishReason !== "STOP")
    )
      throw new ProviderError(502);
    const text = candidate.content?.parts
      .filter((part) => !part.thought)
      .map((part) => part.text ?? "")
      .join("");
    if (!text?.trim()) throw new ProviderError(502);
    return text;
  };
}
