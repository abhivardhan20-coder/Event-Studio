import { categories, type PlannerStore } from "./model.ts";
import { uid, dateOffset, todayISO } from "./format.ts";
import { createPlan } from "./templates.ts";

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
