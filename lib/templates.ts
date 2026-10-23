import {
  images,
  type EventInput,
  type EventType,
  type Idea,
  type Celebration,
  type Task,
  type Vendor,
} from "./model.ts";
import { uid, money, todayISO, dateOffset } from "./format.ts";

const taskTemplates: Record<EventType, [string, Task["category"], number][]> = {
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
  const items: Record<EventType, [string, string, string, Idea["image"]][]> = {
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
  const vendorRoles: [string, Vendor["category"]][] =
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
      date:
        dateOffset(input.date, -days) < todayISO()
          ? todayISO()
          : dateOffset(input.date, -days),
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
