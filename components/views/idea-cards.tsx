"use client";
import { type Idea } from "@/lib/planner";
import { ArrowUpRight, Bookmark } from "lucide-react";
import Image from "next/image";

export function IdeaCards({
  ideas,
  saveIdea,
  openIdea,
}: {
  ideas: Idea[];
  saveIdea: (id: string) => void;
  openIdea: (idea: Idea) => void;
}) {
  return (
    <div className="ideas-grid">
      {ideas.map((idea, i) => (
        <article className="idea-card" key={idea.id}>
          <div className="idea-image-wrap">
            <button
              className="idea-image-button"
              onClick={() => openIdea(idea)}
              aria-label={`Explore ${idea.title}`}
            >
              <Image
                width={1200}
                height={800}
                unoptimized
                src={idea.image}
                alt={idea.title}
                loading="lazy"
                style={{ objectPosition: i === 1 ? "50% 58%" : "center" }}
              />
            </button>
            <button
              className={`bookmark-button ${idea.saved ? "saved" : ""}`}
              onClick={() => saveIdea(idea.id)}
              aria-label={
                idea.saved ? `Unsave ${idea.title}` : `Save ${idea.title}`
              }
              aria-pressed={idea.saved}
            >
              <Bookmark
                size={17}
                strokeWidth={1.6}
                fill={idea.saved ? "currentColor" : "none"}
              />
            </button>
            <span className="idea-tag">{idea.tag}</span>
          </div>
          <button className="idea-card-body" onClick={() => openIdea(idea)}>
            <h3>{idea.title}</h3>
            <span>
              A little inspiration for your celebration
              <ArrowUpRight size={16} />
            </span>
          </button>
        </article>
      ))}
    </div>
  );
}
