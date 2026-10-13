import "server-only";

import type { SearchOptions } from "../../shared/types";
import { findSearchOptions } from "../repositories/general-question-search-repository";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toNamedList(value: unknown): { id: string; name: string }[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) =>
    isRecord(item) &&
    typeof item.id === "string" &&
    typeof item.name === "string"
      ? [{ id: item.id, name: item.name }]
      : []
  );
}

function toStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

export async function loadSearchOptions(): Promise<SearchOptions> {
  const data = await findSearchOptions();
  const options = isRecord(data) ? data : {};

  return {
    sessions: toNamedList(options.sessions),
    members: toNamedList(options.members),
    factions: toStringList(options.factions),
    answererRoles: toStringList(options.answerer_roles),
  };
}
