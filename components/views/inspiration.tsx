"use client";
import { type Celebration, type Idea } from "@/lib/planner";
import { ArrowRight, Bookmark, Leaf, Sparkles } from "lucide-react";
import { EmptyState } from "../ui";
import { IdeaCards } from "./idea-cards";

export function InspirationView({
  event,
  savedOnly,
  setSavedOnly,
  saveIdea,
  openIdea,
  ask,
}: {
  event: Celebration;
  savedOnly: boolean;
  setSavedOnly: (value: boolean) => void;
  saveIdea: (id: string) => void;
  openIdea: (idea: Idea) => void;
  ask: (prompt: string) => void;
}) {
  const ideas = event.ideas.filter((i) => !savedOnly || i.saved);
  return (
    <>
      <div className="inspiration-intro">
        <span className="inspiration-icon">
          <Sparkles size={29} strokeWidth={1.3} />
        </span>
        <div>
          <span className="eyebrow">INSPIRED BY YOUR KIND OF CELEBRATION</span>
          <h2>{event.vibe || "Thoughtful moments. Beautiful memories."}</h2>
          <p>
            {event.source === "gemini"
              ? "Personalized with Gemini"
              : "A thoughtful starting point, made for your event"}{" "}
            · {event.type} · {event.location}
          </p>
        </div>
        <button
          className="button secondary"
          onClick={() =>
            ask(
              "Give me three fresh personalized ideas for my celebration, with practical steps and estimated costs",
            )
          }
        >
          Find more ideas
          <Sparkles size={16} />
        </button>
      </div>
      <div className="view-toolbar standalone">
        <div className="filter-tabs">
          <button
            className={!savedOnly ? "selected" : ""}
            aria-pressed={!savedOnly}
            onClick={() => setSavedOnly(false)}
          >
            All inspiration
          </button>
          <button
            className={savedOnly ? "selected" : ""}
            aria-pressed={savedOnly}
            onClick={() => setSavedOnly(true)}
          >
            Saved ideas <span>{event.ideas.filter((i) => i.saved).length}</span>
          </button>
        </div>
        <span className="subtle-text">
          A few thoughtful touches go a long way.
        </span>
      </div>
      {ideas.length ? (
        <IdeaCards ideas={ideas} saveIdea={saveIdea} openIdea={openIdea} />
      ) : (
        <div className="panel">
          <EmptyState
            icon={<Bookmark />}
            title="Keep the ideas that make you smile."
            description="Tap the bookmark on any idea and it will be waiting here."
            action={() => setSavedOnly(false)}
            label="Explore inspiration"
          />
        </div>
      )}
      <div className="thoughtful-banner">
        <span className="thoughtful-icon">
          <Leaf size={25} />
        </span>
        <div>
          <h3>Make it personal. Make it meaningful.</h3>
          <p>The best little details tell your story.</p>
        </div>
        <button
          onClick={() =>
            ask("Help me create a unique, budget-conscious theme for my event")
          }
        >
          Dream up a theme
          <ArrowRight size={16} />
        </button>
      </div>
    </>
  );
}
