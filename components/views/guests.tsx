"use client";
import { type Celebration, type Guest } from "@/lib/planner";
import {
  CheckCheck,
  Heart,
  Mail,
  MoreHorizontal,
  Plus,
  Search,
  Users,
} from "lucide-react";
import { useState } from "react";
import { EmptyState } from "../ui";
import type { OpenItem, Update } from "./types";

export function GuestsView({
  event,
  update,
  openItem,
}: {
  event: Celebration;
  update: Update;
  openItem: OpenItem;
}) {
  const [query, setQuery] = useState(""),
    [filter, setFilter] = useState("All guests");
  const filtered = event.guests.filter(
    (g) =>
      (filter === "All guests" || g.rsvp === filter) &&
      `${g.name} ${g.group} ${g.email}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  return (
    <>
      <div className="guest-stats">
        {[
          {
            label: "On your guest list",
            value: event.guests.length,
            icon: Users,
          },
          {
            label: "Ready to celebrate",
            value: event.guests.filter((g) => g.rsvp === "Confirmed").length,
            icon: CheckCheck,
          },
          {
            label: "Waiting to hear back",
            value: event.guests.filter((g) => g.rsvp === "Pending").length,
            icon: Mail,
          },
        ].map((s) => (
          <div className="panel guest-stat" key={s.label}>
            <span className="stat-icon sage">
              <s.icon size={22} />
            </span>
            <div>
              <strong>{s.value}</strong>
              <span>{s.label}</span>
            </div>
          </div>
        ))}
      </div>
      <section className="panel">
        <div className="view-toolbar">
          <div className="search-box">
            <Search size={16} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Find a familiar face…"
              aria-label="Search guests"
            />
          </div>
          <div className="toolbar-buttons">
            <select
              aria-label="Filter guests by RSVP"
              className="filter-select"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            >
              {["All guests", "Confirmed", "Pending", "Declined"].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
            <button
              className="button primary small"
              onClick={() => openItem("guest")}
            >
              <Plus size={16} />
              Add guest
            </button>
          </div>
        </div>
        {filtered.length ? (
          <div
            className="table-scroll"
            tabIndex={0}
            role="region"
            aria-label="Scrollable planning table"
          >
            <table>
              <caption className="sr-only">
                {event.name} planning records
              </caption>
              <thead>
                <tr>
                  <th scope="col">Your people</th>
                  <th scope="col">Group</th>
                  <th scope="col">RSVP</th>
                  <th scope="col">A little to remember</th>
                  <th scope="col">
                    <span className="sr-only">Edit guest</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((g) => (
                  <tr key={g.id}>
                    <td>
                      <div className="guest-name">
                        <span className="guest-avatar">
                          {g.name
                            .split(" ")
                            .map((n) => n[0])
                            .slice(0, 2)
                            .join("")}
                        </span>
                        <span>
                          <strong>{g.name}</strong>
                          <small>{g.email || "No email added"}</small>
                        </span>
                      </div>
                    </td>
                    <td>{g.group}</td>
                    <td>
                      <select
                        className={`rsvp-select ${g.rsvp.toLowerCase()}`}
                        value={g.rsvp}
                        aria-label={`RSVP for ${g.name}`}
                        onChange={(ev) =>
                          update((e) => ({
                            ...e,
                            guests: e.guests.map((x) =>
                              x.id === g.id
                                ? {
                                    ...x,
                                    rsvp: ev.target.value as Guest["rsvp"],
                                  }
                                : x,
                            ),
                          }))
                        }
                      >
                        {["Pending", "Confirmed", "Declined"].map((s) => (
                          <option key={s}>{s}</option>
                        ))}
                      </select>
                    </td>
                    <td>{g.dietary || "—"}</td>
                    <td>
                      <button
                        className="icon-button"
                        aria-label={`Edit ${g.name}`}
                        onClick={() => openItem("guest", g)}
                      >
                        <MoreHorizontal size={19} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            icon={<Users />}
            title={
              query
                ? "No familiar faces found."
                : "Make room for your favorite people."
            }
            description={
              query
                ? "Try another name or change your RSVP filter."
                : "Add guests, track RSVPs and remember the details that matter."
            }
            action={() => openItem("guest")}
            label="Add a guest"
          />
        )}
      </section>
      <div className="note muted-note">
        <Heart size={18} />
        <p>
          Your guest list stays in this browser. Contact details are never sent
          to the AI assistant.
        </p>
      </div>
    </>
  );
}
