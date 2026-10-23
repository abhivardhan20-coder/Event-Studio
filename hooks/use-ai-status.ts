"use client";
import { useEffect, useState } from "react";
import {
  aiStatusSchema,
  readApiResponse,
  type AIStatus,
} from "@/lib/api-client";
export function useAIStatus() {
  const [status, setStatus] = useState<AIStatus>({
    configured: false,
    provider: "gemini",
    requiresSignIn: false,
  });
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/plan", { signal: controller.signal })
      .then(readApiResponse)
      .then((data) => {
        if (!controller.signal.aborted) setStatus(aiStatusSchema.parse(data));
      })
      .catch(() => {
        /* Offline planning remains available; a submitted request reports any connection error. */
      });
    return () => controller.abort();
  }, []);
  return status;
}
