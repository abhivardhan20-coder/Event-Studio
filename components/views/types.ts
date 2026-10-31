import type { Celebration } from "@/lib/model";
export type { OpenItem } from "@/lib/workspace";
export type Update = (updater: (event: Celebration) => Celebration) => boolean;
