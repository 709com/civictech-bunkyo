import "server-only";
import {
  searchBills,
  searchGeneralQuestions,
  searchBudgets,
} from "../repositories/search-repository";
import { siteConfig } from "@/config/site.config";
import type { SearchResults } from "../../shared/types/search-types";

export async function loadSearchResults(query: string): Promise<SearchResults> {
  // 一般質問以外の機能を隠しているあいだは、一般質問だけを探す
  const showOther = siteConfig.features.showOtherSections;
  const [bills, questions, budgets] = await Promise.all([
    showOther ? searchBills(query) : Promise.resolve([]),
    searchGeneralQuestions(query),
    showOther ? searchBudgets(query) : Promise.resolve([]),
  ]);
  return { bills, questions, budgets };
}
