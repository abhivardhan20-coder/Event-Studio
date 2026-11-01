import { z } from "zod";
import {
  MAX_CHAT_MESSAGES,
  MAX_CHAT_MESSAGE_CHARS,
  MAX_CHAT_TASKS,
} from "../request-limits.ts";
import {
  eventInputSchema,
  isoDateSchema,
  categories,
  taskCategories,
  recordedSpendingSchema,
} from "../model.ts";

const messageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  text: z.string().trim().min(1).max(MAX_CHAT_MESSAGE_CHARS),
});
export const requestSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("plan"),
    event: eventInputSchema,
    mode: z.enum(["auto", "built-in"]).default("auto"),
  }),
  z.object({
    action: z.literal("chat"),
    mode: z.enum(["auto", "built-in"]).default("auto"),
    event: eventInputSchema,
    spending: recordedSpendingSchema.default(0),
    tasks: z
      .array(
        z.object({
          title: z.string().trim().min(1).max(200),
          date: isoDateSchema,
        }),
      )
      .max(MAX_CHAT_TASKS)
      .default([]),
    messages: z.array(messageSchema).min(1).max(MAX_CHAT_MESSAGES),
  }),
]);
export const generatedSchema = z.object({
  summary: z.string().trim().min(1).max(3000),
  tasks: z
    .array(
      z.object({
        title: z.string().trim().min(1).max(200),
        category: z.enum(taskCategories),
        daysBefore: z.number().int().min(0).max(365),
      }),
    )
    .min(8)
    .max(20),
  ideas: z
    .array(
      z.object({
        title: z.string().trim().min(1).max(120),
        description: z.string().trim().min(1).max(1500),
        tag: z.string().max(40),
      }),
    )
    .min(3)
    .max(6),
  vendors: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(120),
        category: z.enum(categories),
      }),
    )
    .min(3)
    .max(8),
});
// The provider contract and runtime parser share the same field bounds.
export const planJsonSchema = z.toJSONSchema(generatedSchema, {
  target: "openapi-3.0",
});

export type PlannerRequest = z.infer<typeof requestSchema>;
export type ChatRequest = Extract<PlannerRequest, { action: "chat" }>;
