import { z } from "zod";

export const eventTypes = ["Wedding", "Birthday", "Community"] as const;
export type EventType = (typeof eventTypes)[number];
export type Tab =
  "Overview" | "Budget" | "Timeline" | "Vendors" | "Guest list" | "Inspiration";
export const eventInputSchema = z.object({
  name: z.string().trim().min(2, "Give your event a name.").max(100),
  type: z.enum(eventTypes),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .refine((s) => {
      const date = new Date(s + "T12:00:00");
      return (
        !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === s
      );
    }, "Choose a valid date."),
  location: z.string().trim().min(2).max(120),
  budget: z.number().finite().min(100).max(100_000_000),
  guestCount: z.number().int().min(1).max(100_000),
  vibe: z.string().trim().max(300),
});
export type EventInput = z.infer<typeof eventInputSchema>;
export const taskSchema = z.object({
  id: z.string(),
  title: z.string().trim().min(1).max(200),
  category: z.string().max(50),
  date: eventInputSchema.shape.date,
  done: z.boolean(),
});
export const expenseSchema = z.object({
  id: z.string(),
  name: z.string().trim().min(1).max(120),
  category: z.enum([
    "Venue",
    "Food & drinks",
    "Decor & flowers",
    "Photography",
    "Entertainment",
    "Other",
  ]),
  amount: z.number().finite().min(0).max(100000000),
  paid: z.boolean(),
});
export const vendorSchema = z.object({
  id: z.string(),
  name: z.string().max(120),
  category: z.string().max(50),
  contact: z.string().max(200),
  quote: z.number().finite().min(0),
  status: z.enum(["To contact", "Contacted", "Shortlisted", "Booked"]),
  checklist: z.array(z.boolean()).length(4),
});
export const guestSchema = z.object({
  id: z.string(),
  name: z.string().max(100),
  email: z.string().max(200),
  rsvp: z.enum(["Pending", "Confirmed", "Declined"]),
  group: z.string().max(60),
  dietary: z.string().max(200),
});
export const ideaSchema = z.object({
  id: z.string(),
  title: z.string().max(120),
  description: z.string().max(1500),
  tag: z.string().max(40),
  image: z.string(),
  saved: z.boolean(),
});
export type Task = z.infer<typeof taskSchema>;
export type Expense = z.infer<typeof expenseSchema>;
export type Vendor = z.infer<typeof vendorSchema>;
export type Guest = z.infer<typeof guestSchema>;
export type Idea = z.infer<typeof ideaSchema>;
export const eventSchema = eventInputSchema.extend({
  id: z.string(),
  tasks: z.array(taskSchema).max(300),
  expenses: z.array(expenseSchema).max(500),
  vendors: z.array(vendorSchema).max(200),
  guests: z.array(guestSchema).max(10000),
  ideas: z.array(ideaSchema).max(100),
  summary: z.string().max(3000),
  source: z.enum(["built-in", "gemini", "sample"]),
  createdAt: z.string(),
});
export type Celebration = z.infer<typeof eventSchema>;
export const storeSchema = z.object({
  version: z.literal(1),
  events: z.array(eventSchema).max(100),
  activeId: z.string(),
  profile: z.string().max(40),
});
export type PlannerStore = z.infer<typeof storeSchema>;
export const categories = [
  "Venue",
  "Food & drinks",
  "Decor & flowers",
  "Photography",
  "Entertainment",
  "Other",
];
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
};
export function uid() {
  return crypto.randomUUID();
}
export function money(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}
export function dateLabel(value: string, short = false) {
  return new Date(value + "T12:00:00").toLocaleDateString("en-IN", {
    day: "numeric",
    month: short ? "short" : "long",
    ...(short ? {} : { year: "numeric" }),
  });
}
export function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
export function daysUntil(date: string) {
  return Math.ceil(
    (new Date(date + "T00:00:00").getTime() -
      new Date(todayISO() + "T00:00:00").getTime()) /
      86400000,
  );
}
export function relativeDate(date: string) {
  const days = daysUntil(date);
  return days === 0
    ? "Today"
    : days === 1
      ? "Tomorrow"
      : days === -1
        ? "Yesterday"
        : days < 0
          ? `${Math.abs(days)} days overdue`
          : dateLabel(date, true);
}
export function dateOffset(date: string, days: number) {
  const d = new Date(date + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

const taskTemplates: Record<EventType, [string, string, number][]> = {
  Wedding: [
    ["Find your dream venue", "Venue", 90],
    ["Shortlist your photographer", "Photography", 75],
    ["Book the caterer & plan your menu", "Food & drinks", 60],
    ["Send a little save-the-date", "Guests", 50],
    ["Choose flowers & your color story", "Decor & flowers", 40],
    ["Schedule your menu tasting", "Food & drinks", 30],
    ["Finalize the guest list", "Guests", 21],
    ["Confirm your vendors & timings", "Vendors", 14],
    ["Make a seating plan", "Guests", 7],
    ["Pack the little emergency kit", "Other", 2],
    ["Celebrate your big day", "Celebration", 0],
  ],
  Birthday: [
    ["Pick the perfect party spot", "Venue", 45],
    ["Choose your party theme", "Decor & flowers", 35],
    ["Send out the invitations", "Guests", 28],
    ["Order the birthday cake", "Food & drinks", 21],
    ["Book music & activities", "Entertainment", 18],
    ["Plan food for every dietary need", "Food & drinks", 14],
    ["Pick up decorations & party favors", "Decor & flowers", 10],
    ["Check the RSVPs", "Guests", 7],
    ["Confirm deliveries & setup", "Vendors", 3],
    ["Make a wish & celebrate", "Celebration", 0],
  ],
  Community: [
    ["Define the purpose & organizing team", "Other", 60],
    ["Reserve an accessible venue & check permits", "Venue", 45],
    ["Invite local partners & volunteers", "Vendors", 35],
    ["Publish your event invitation", "Guests", 28],
    ["Plan food, water & waste stations", "Food & drinks", 21],
    ["Organize activities & entertainment", "Entertainment", 18],
    ["Confirm accessibility & first-aid arrangements", "Other", 14],
    ["Brief volunteers & assign roles", "Vendors", 7],
    ["Check the weather & backup plan", "Venue", 3],
    ["Bring your community together", "Celebration", 0],
  ],
};
export function baseIdeas(input: EventInput): Idea[] {
  const items: Record<EventType, [string, string, string, string][]> = {
    Wedding: [
      [
        "A table worth gathering around",
        `Layer seasonal flowers, soft linens and handwritten place cards for an intimate ${input.vibe || "romantic"} celebration in ${input.location}. Keep centerpieces low so your ${input.guestCount} guests can connect. Ask your florist about renting bud vases to make the most of your budget.`,
        "The little details",
        images.table,
      ],
      [
        "Let love bloom",
        `Bring your ${input.vibe || "garden"} vision to life with locally grown flowers. Repurpose ceremony arrangements for the reception, use potted herbs as favors, and choose a small palette of two or three colors.`,
        "Florals & decor",
        images.flowers,
      ],
      [
        "A golden-hour kind of love",
        `Set aside 20 minutes before sunset for photos, followed by a relaxed welcome drink. Share a simple photo list with your photographer so you can get back to enjoying your people.`,
        "Moments that matter",
        images.wedding,
      ],
    ],
    Birthday: [
      [
        "A party with a little personality",
        `Turn your ${input.vibe || "joyful"} theme into three simple focal points: a welcoming entrance, a cake table, and a photo corner. Use reusable decorations and personal photos for a celebration that feels like you.`,
        "Party styling",
        images.birthday,
      ],
      [
        "Sweet little moments",
        `Create a dessert tasting table with the birthday person's favorites. For ${input.guestCount} guests, offer smaller portions and label ingredients clearly so everyone can join in.`,
        "Food & fun",
        images.table,
      ],
      [
        "Make memories, take them home",
        `Set up a memory station where friends can write wishes, record a voice note or add a photo. Turn everything into a digital keepsake after your ${input.location} celebration.`,
        "Personal touches",
        images.flowers,
      ],
    ],
    Community: [
      [
        "Good neighbors, great memories",
        `Build your ${input.location} event around a shared table. Invite local makers to contribute, clearly mark accessible routes, and offer a quiet corner alongside your ${input.vibe || "welcoming"} activities.`,
        "Together is better",
        images.community,
      ],
      [
        "A little local flavor",
        `Invite local food makers to a tasting corner. Keep water free, label dietary options, and plan staggered serving for ${input.guestCount} attendees to avoid queues.`,
        "Food & community",
        images.table,
      ],
      [
        "Leave a little good behind",
        `Make your gathering meaningful with a seed swap, donation station or community art wall. Ask volunteers to manage reusable plates and clearly labeled recycling bins.`,
        "Thoughtful touches",
        images.flowers,
      ],
    ],
  };
  return items[input.type].map(([title, description, tag, image]) => ({
    id: uid(),
    title,
    description,
    tag,
    image,
    saved: false,
  }));
}
export function createPlan(input: EventInput): Celebration {
  const vendorRoles =
    input.type === "Wedding"
      ? [
          ["Venue to visit", "Venue"],
          ["Caterer to shortlist", "Food & drinks"],
          ["Florist to discover", "Decor & flowers"],
          ["Photographer to meet", "Photography"],
        ]
      : input.type === "Birthday"
        ? [
            ["Party venue to visit", "Venue"],
            ["Cake maker to shortlist", "Food & drinks"],
            ["Entertainment to explore", "Entertainment"],
          ]
        : [
            ["Community venue to reserve", "Venue"],
            ["Local food partner to contact", "Food & drinks"],
            ["Activity partner to invite", "Entertainment"],
          ];
  return {
    ...input,
    id: uid(),
    createdAt: new Date().toISOString(),
    source: "built-in",
    summary: `A ${input.vibe || "thoughtful, memorable"} ${input.type.toLowerCase()} in ${input.location} for ${input.guestCount} guests, thoughtfully planned around ${money(input.budget)}. Start with your venue and guest list, keep 10% aside for the unexpected, and enjoy the little moments along the way.`,
    tasks: taskTemplates[input.type].map(([title, category, days]) => ({
      id: uid(),
      title,
      category,
      date: [todayISO(), dateOffset(input.date, -days)].sort().at(-1)!,
      done: false,
    })),
    expenses: [],
    vendors: vendorRoles.map(([name, category]) => ({
      id: uid(),
      name,
      category,
      contact: "",
      quote: 0,
      status: "To contact",
      checklist: [false, false, false, false],
    })),
    guests: [],
    ideas: baseIdeas(input),
  };
}
export function budgetAllocations(
  event: Pick<Celebration, "type" | "budget" | "expenses">,
) {
  const ratios =
    event.type === "Wedding"
      ? [0.3, 0.3, 0.14, 0.1, 0.06, 0.1]
      : event.type === "Birthday"
        ? [0.2, 0.3, 0.18, 0.07, 0.15, 0.1]
        : [0.25, 0.25, 0.1, 0.05, 0.15, 0.2];
  const plannedAmounts = ratios.map((ratio, index) =>
    index < 5 ? Math.round(event.budget * ratio) : 0,
  );
  plannedAmounts[5] =
    event.budget -
    plannedAmounts.slice(0, 5).reduce((sum, amount) => sum + amount, 0);
  return categories.map((category, i) => ({
    category,
    planned: plannedAmounts[i],
    spent: event.expenses
      .filter((e) => e.category === category)
      .reduce((s, e) => s + e.amount, 0),
    color: colors[i],
  }));
}
export function seedStore(): PlannerStore {
  const event = createPlan({
    name: "Maya & Arjun’s wedding",
    type: "Wedding",
    date: dateOffset(todayISO(), 74),
    location: "The Glasshouse, Bengaluru",
    budget: 800000,
    guestCount: 150,
    vibe: "Intimate garden wedding, earthy tones & a touch of magic",
  });
  event.source = "sample";
  event.tasks = [
    ...[
      "Finalize the wedding venue",
      "Book your photographer",
      "Set the guest list",
      "Choose a color palette",
      "Send save-the-dates",
    ].map((title, i) => ({
      id: uid(),
      title,
      category: categories[i],
      date: dateOffset(todayISO(), -12 + i * 2),
      done: true,
    })),
    {
      id: uid(),
      title: "Shortlist your dream florist",
      category: "Decor & flowers",
      date: todayISO(),
      done: false,
    },
    {
      id: uid(),
      title: "Schedule a menu tasting",
      category: "Food & drinks",
      date: dateOffset(todayISO(), 2),
      done: false,
    },
    {
      id: uid(),
      title: "Find the perfect wedding playlist",
      category: "Entertainment",
      date: dateOffset(todayISO(), 4),
      done: false,
    },
    {
      id: uid(),
      title: "Confirm the final guest count",
      category: "Guests",
      date: dateOffset(event.date, -14),
      done: false,
    },
    {
      id: uid(),
      title: "Create the seating plan",
      category: "Guests",
      date: dateOffset(event.date, -7),
      done: false,
    },
    {
      id: uid(),
      title: "Reconfirm all vendor arrivals",
      category: "Vendors",
      date: dateOffset(event.date, -3),
      done: false,
    },
    {
      id: uid(),
      title: "Pack a wedding-day essentials kit",
      category: "Other",
      date: dateOffset(event.date, -1),
      done: false,
    },
  ];
  event.expenses = [
    {
      id: uid(),
      name: "Glasshouse venue deposit",
      category: "Venue",
      amount: 180000,
      paid: true,
    },
    {
      id: uid(),
      name: "Catering reservation",
      category: "Food & drinks",
      amount: 80000,
      paid: true,
    },
    {
      id: uid(),
      name: "Photography package",
      category: "Photography",
      amount: 40000,
      paid: false,
    },
    {
      id: uid(),
      name: "Save-the-date stationery",
      category: "Other",
      amount: 24000,
      paid: true,
    },
  ];
  event.vendors = [
    {
      id: uid(),
      name: "The Glasshouse",
      category: "Venue",
      contact: "Add contact details",
      quote: 240000,
      status: "Booked",
      checklist: [true, true, true, true],
    },
    {
      id: uid(),
      name: "Your photography studio",
      category: "Photography",
      contact: "Add contact details",
      quote: 80000,
      status: "Booked",
      checklist: [true, true, true, false],
    },
    {
      id: uid(),
      name: "Your dream florist",
      category: "Decor & flowers",
      contact: "Add contact details",
      quote: 0,
      status: "To contact",
      checklist: [false, false, false, false],
    },
  ];
  event.guests = [
    {
      id: uid(),
      name: "Ananya Sharma",
      email: "",
      rsvp: "Confirmed",
      group: "Family",
      dietary: "Vegetarian",
    },
    {
      id: uid(),
      name: "Rohan Mehta",
      email: "",
      rsvp: "Confirmed",
      group: "Friends",
      dietary: "",
    },
    {
      id: uid(),
      name: "Priya Kapoor",
      email: "",
      rsvp: "Pending",
      group: "Family",
      dietary: "",
    },
    {
      id: uid(),
      name: "Ishaan Patel",
      email: "",
      rsvp: "Pending",
      group: "Friends",
      dietary: "Vegan",
    },
  ];
  return { version: 1, events: [event], activeId: event.id, profile: "Abhi" };
}
export function exportPlan(event: Celebration) {
  const total = event.expenses.reduce((sum, e) => sum + e.amount, 0);
  return [
    `GATHER · YOUR CELEBRATION PLAN`,
    event.name,
    `${event.type} · ${dateLabel(event.date)} · ${event.location}`,
    `${event.guestCount} expected guests · Budget: ${money(event.budget)}`,
    "",
    event.summary,
    "",
    "BUDGET",
    `Recorded: ${money(total)} · Remaining: ${money(event.budget - total)}`,
    ...event.expenses.map(
      (e) =>
        `- ${e.name}: ${money(e.amount)} (${e.category}, ${e.paid ? "Paid" : "Unpaid"})`,
    ),
    "",
    "TIMELINE",
    ...event.tasks
      .slice()
      .sort((a, b) => a.date.localeCompare(b.date))
      .map(
        (t) =>
          `${t.done ? "[x]" : "[ ]"} ${dateLabel(t.date, true)} · ${t.title}`,
      ),
    "",
    "VENDORS",
    ...event.vendors.map(
      (v) =>
        `- ${v.name} · ${v.category} · ${v.status} · ${money(v.quote)} · ${v.contact}`,
    ),
    "",
    "GUESTS",
    ...event.guests.map(
      (g) => `- ${g.name} · ${g.rsvp}${g.dietary ? ` · ${g.dietary}` : ""}`,
    ),
    "",
    "IDEAS",
    ...event.ideas.map((i) => `${i.title}\n${i.description}`),
  ].join("\n");
}
