"use client";
import { money, type Celebration, type Vendor } from "@/lib/planner";
import { Leaf, MoreHorizontal, Plus, Sparkles, Store } from "lucide-react";
import { useState } from "react";
import { EmptyState } from "../ui";
import type { OpenItem, Update } from "./types";

export function VendorsView({
  event,
  update,
  openItem,
}: {
  event: Celebration;
  update: Update;
  openItem: OpenItem;
}) {
  const [filter, setFilter] = useState("All vendors");
  const filtered = event.vendors.filter(
    (v) => filter === "All vendors" || v.status === filter,
  );
  const checklistLabels = [
    "Request a detailed quote",
    "Review portfolio & references",
    "Confirm scope & contract",
    "Pay deposit & confirm booking",
  ];
  return (
    <>
      <div className="note">
        <Leaf size={22} />
        <p>
          <strong>Good people make great celebrations.</strong> Add your own
          vendors, compare quotes, and keep every conversation moving.{" "}
          {event.source === "sample" &&
            "The vendors below are sample planning entries."}
        </p>
      </div>
      <div className="view-toolbar standalone">
        <div className="filter-tabs">
          {["All vendors", "To contact", "Shortlisted", "Booked"].map((f) => (
            <button
              key={f}
              className={filter === f ? "selected" : ""}
              aria-pressed={filter === f}
              onClick={() => setFilter(f)}
            >
              {f}
            </button>
          ))}
        </div>
        <button
          className="button primary small"
          onClick={() => openItem("vendor")}
        >
          <Plus size={16} />
          Add vendor
        </button>
      </div>
      {filtered.length ? (
        <div className="vendor-grid">
          {filtered.map((v) => (
            <article className="panel vendor-card" key={v.id}>
              <div className="vendor-card-top">
                <span className="vendor-icon">
                  <Store size={23} strokeWidth={1.4} />
                </span>
                <button
                  className="icon-button"
                  aria-label={`Edit ${v.name}`}
                  onClick={() => openItem("vendor", v)}
                >
                  <MoreHorizontal size={20} />
                </button>
              </div>
              <span className="eyebrow">{v.category}</span>
              <h2>{v.name}</h2>
              <p className="vendor-contact">
                {v.contact || "No contact details yet"}
              </p>
              <div className="vendor-quote">
                <span>Quoted amount</span>
                <strong>{v.quote ? money(v.quote) : "Awaiting quote"}</strong>
              </div>
              <label className="vendor-status-label">
                <span>Booking status</span>
                <select
                  aria-label={`${v.name} booking status`}
                  value={v.status}
                  onChange={(ev) =>
                    update((e) => ({
                      ...e,
                      vendors: e.vendors.map((x) =>
                        x.id === v.id
                          ? {
                              ...x,
                              status: ev.target.value as Vendor["status"],
                            }
                          : x,
                      ),
                    }))
                  }
                >
                  {["To contact", "Contacted", "Shortlisted", "Booked"].map(
                    (s) => (
                      <option key={s}>{s}</option>
                    ),
                  )}
                </select>
              </label>
              <div className="vendor-checklist">
                {checklistLabels.map((label, i) => (
                  <label key={label}>
                    <input
                      type="checkbox"
                      aria-label={`${label} for ${v.name}`}
                      checked={v.checklist[i]}
                      onChange={() =>
                        update((e) => ({
                          ...e,
                          vendors: e.vendors.map((x) =>
                            x.id === v.id
                              ? {
                                  ...x,
                                  checklist: x.checklist.map((checked, j) =>
                                    j === i ? !checked : checked,
                                  ),
                                }
                              : x,
                          ),
                        }))
                      }
                    />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="panel">
          <EmptyState
            icon={<Store />}
            title="Your dream team starts here."
            description="Add a vendor and keep quotes, contacts and booking details together."
            action={() => openItem("vendor")}
            label="Add your first vendor"
          />
        </div>
      )}
      <div className="note muted-note">
        <Sparkles size={18} />
        <p>
          Vendor quotes are estimates. Record confirmed expenses in Budget to
          include them in your spending totals.
        </p>
      </div>
    </>
  );
}
