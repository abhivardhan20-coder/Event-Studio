import { z } from "zod";

export const eventTypes = ["Wedding", "Birthday", "Community"] as const;
export type EventType = (typeof eventTypes)[number];
export type Tab =
  "Overview" | "Budget" | "Timeline" | "Vendors" | "Guest list" | "Inspiration";
export const categories = [
  "Venue",
  "Food & drinks",
  "Decor & flowers",
  "Photography",
  "Entertainment",
  "Other",
] as const;
export const taskCategories = [
  ...categories,
  "Guests",
  "Vendors",
  "Celebration",
] as const;
export const LIMITS = {
  events: 100,
  tasks: 300,
  expenses: 500,
  vendors: 200,
  guests: 10000,
  ideas: 100,
  backupBytes: 5 * 1024 * 1024,
} as const;
export const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a valid date.")
  .refine((value) => {
    const timestamp = Date.parse(`${value}T00:00:00Z`);
    return (
      Number.isFinite(timestamp) &&
      new Date(timestamp).toISOString().slice(0, 10) === value
    );
  }, "Choose a valid date.");
export const amountSchema = z
  .number()
  .finite()
  .min(0)
  .max(100_000_000)
  .refine(
    (value) => Math.abs(value * 100 - Math.round(value * 100)) < 0.00001,
    "Use no more than two decimal places.",
  );
const idSchema = z.string().trim().min(1).max(100);
export const eventInputSchema = z.object({
  name: z.string().trim().min(2, "Give your event a name.").max(100),
  type: z.enum(eventTypes),
  date: isoDateSchema,
  location: z.string().trim().min(2).max(120),
  budget: amountSchema.refine(
    (value) => value >= 100,
    "Your budget must be at least ₹100.",
  ),
  guestCount: z.number().int().min(1).max(100_000),
  vibe: z.string().trim().max(300),
});
export type EventInput = z.infer<typeof eventInputSchema>;
export const taskSchema = z.object({
  id: idSchema,
  title: z.string().trim().min(1).max(200),
  category: z.enum(taskCategories),
  date: eventInputSchema.shape.date,
  done: z.boolean(),
});
export const expenseSchema = z.object({
  id: idSchema,
  name: z.string().trim().min(1).max(120),
  category: z.enum(categories),
  amount: amountSchema,
  paid: z.boolean(),
});
export const vendorSchema = z.object({
  id: idSchema,
  name: z.string().trim().min(1, "Enter a vendor name.").max(120),
  category: z.enum(categories),
  contact: z.string().max(200),
  quote: amountSchema,
  status: z.enum(["To contact", "Contacted", "Shortlisted", "Booked"]),
  checklist: z.array(z.boolean()).length(4),
});
export const guestSchema = z.object({
  id: idSchema,
  name: z.string().trim().min(1, "Enter a guest name.").max(100),
  email: z.union([
    z.literal(""),
    z.string().trim().email("Enter a valid email address.").max(200),
  ]),
  rsvp: z.enum(["Pending", "Confirmed", "Declined"]),
  group: z.string().max(60),
  dietary: z.string().max(200),
});
export const ideaSchema = z.object({
  id: idSchema,
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().min(1).max(1500),
  tag: z.string().max(40),
  image: z.enum([
    "/images/wedding.jpg",
    "/images/tablescape.jpg",
    "/images/flowers.jpg",
    "/images/birthday.jpg",
    "/images/community.jpg",
  ]),
  saved: z.boolean(),
});
export type Task = z.infer<typeof taskSchema>;
export type Expense = z.infer<typeof expenseSchema>;
export type Vendor = z.infer<typeof vendorSchema>;
export type Guest = z.infer<typeof guestSchema>;
export type Idea = z.infer<typeof ideaSchema>;
export const eventSchema = eventInputSchema
  .extend({
    id: idSchema,
    tasks: z.array(taskSchema).max(LIMITS.tasks),
    expenses: z.array(expenseSchema).max(LIMITS.expenses),
    vendors: z.array(vendorSchema).max(LIMITS.vendors),
    guests: z.array(guestSchema).max(LIMITS.guests),
    ideas: z.array(ideaSchema).max(LIMITS.ideas),
    summary: z.string().max(3000),
    source: z.enum(["built-in", "gemini", "sample"]),
    createdAt: z.string().datetime(),
  })
  .superRefine((event, context) => {
    for (const key of [
      "tasks",
      "expenses",
      "vendors",
      "guests",
      "ideas",
    ] as const) {
      const ids = event[key].map((item) => item.id);
      if (new Set(ids).size !== ids.length)
        context.addIssue({
          code: "custom",
          path: [key],
          message: "Each record must have a unique ID.",
        });
    }
  });
export type Celebration = z.infer<typeof eventSchema>;
export const storeSchema = z
  .object({
    version: z.literal(1),
    events: z.array(eventSchema).min(1).max(LIMITS.events),
    activeId: idSchema,
    profile: z.string().trim().min(1).max(40),
  })
  .superRefine((store, context) => {
    if (
      new Set(store.events.map((event) => event.id)).size !==
      store.events.length
    )
      context.addIssue({
        code: "custom",
        path: ["events"],
        message: "Each event must have a unique ID.",
      });
  });
export type PlannerStore = z.infer<typeof storeSchema>;
export const colors = [
  "#bd765e",
  "#819781",
  "#d8b686",
  "#b5a4bb",
  "#9eafb9",
  "#e1d8ca",
];
export const images = {
  wedding: "/images/wedding.jpg",
  table: "/images/tablescape.jpg",
  flowers: "/images/flowers.jpg",
  birthday: "/images/birthday.jpg",
  community: "/images/community.jpg",
} as const;
export type ItemKind = "task" | "expense" | "vendor" | "guest";
export interface PlannerItems {
  task: Task;
  expense: Expense;
  vendor: Vendor;
  guest: Guest;
}
export type PlannerItem = PlannerItems[ItemKind];
export type ItemSelection = {
  [Kind in ItemKind]: { kind: Kind; item: PlannerItems[Kind] };
}[ItemKind];
export const itemSchemas = {
  task: taskSchema,
  expense: expenseSchema,
  vendor: vendorSchema,
  guest: guestSchema,
} as const;
