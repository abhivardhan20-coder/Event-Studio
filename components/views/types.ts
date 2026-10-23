import type { Celebration, ItemKind, PlannerItem } from "@/lib/model";
export type OpenItem = (kind: ItemKind, item?: PlannerItem) => void;
export type Update = (updater: (event: Celebration) => Celebration) => void;
