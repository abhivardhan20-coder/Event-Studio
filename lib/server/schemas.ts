import { z } from "zod";
import {
  eventInputSchema,
  isoDateSchema,
  categories,
  taskCategories,
} from "../model.ts";

const messageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  text: z.string().trim().min(1).max(2000),
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
    spending: z.number().finite().min(0).max(1e10).default(0),
    tasks: z
      .array(
        z.object({
          title: z.string().trim().min(1).max(200),
          date: isoDateSchema,
        }),
      )
      .max(8)
      .default([]),
    messages: z.array(messageSchema).min(1).max(8),
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
export const planJsonSchema = {
  type: "object",
  properties: {
    summary: { type: "string", minLength: 1, maxLength: 3000 },
    tasks: {
      type: "array",
      minItems: 8,
      maxItems: 20,
      items: {
        type: "object",
        properties: {
          title: { type: "string", minLength: 1, maxLength: 200 },
          category: { type: "string", enum: taskCategories },
          daysBefore: { type: "integer", minimum: 0, maximum: 365 },
        },
        required: ["title", "category", "daysBefore"],
      },
    },
    ideas: {
      type: "array",
      minItems: 3,
      maxItems: 6,
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          description: { type: "string" },
          tag: { type: "string" },
        },
        required: ["title", "description", "tag"],
      },
    },
    vendors: {
      type: "array",
      minItems: 3,
      maxItems: 8,
      items: {
        type: "object",
        properties: {
          name: { type: "string", minLength: 1, maxLength: 120 },
          category: { type: "string", enum: categories },
        },
        required: ["name", "category"],
      },
    },
  },
  required: ["summary", "tasks", "ideas", "vendors"],
};

export type PlannerRequest = z.infer<typeof requestSchema>;
export type ChatRequest = Extract<PlannerRequest, { action: "chat" }>;
