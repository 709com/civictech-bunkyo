import "server-only";

import type { SearchOptions } from "../../shared/types";
import {
  findCommitteeSearchOptions,
  findSearchOptions,
} from "../repositories/general-question-search-repository";

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
  const [data, committeeData] = await Promise.all([
    findSearchOptions(),
    findCommitteeSearchOptions(),
  ]);
  const options = isRecord(data) ? data : {};
  const committee = isRecord(committeeData) ? committeeData : {};

  // 議員は、本会議の一般質問で質問した議員（今までの並びのまま）のあとに、
  // 委員会でだけ発言した議員を足す（同じ議員は1つ）
  const members = new Map<string, { id: string; name: string }>();
  for (const member of [
    ...toNamedList(options.members),
    ...toNamedList(committee.members),
  ]) {
    if (!members.has(member.id)) members.set(member.id, member);
  }

  return {
    sessions: toNamedList(options.sessions),
    members: [...members.values()],
    bodies: toNamedList(committee.bodies),
    factions: toStringList(options.factions),
    answererRoles: toStringList(options.answerer_roles),
  };
}
