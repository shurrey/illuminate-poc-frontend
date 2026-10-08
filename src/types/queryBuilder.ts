import type { QueryContract } from "./semantic";

export interface SavedQuery {
  id: string;
  name: string;
  prompt: string;
  contract: QueryContract;
  description: string;
  createdAt: string;
  lastUsedAt: string;
}
