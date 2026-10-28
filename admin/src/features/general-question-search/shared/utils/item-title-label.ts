import type { ItemTitleSource } from "../types";

/** 委員会の一般質問の項目名を、出どころの印つきで表示する文字にする */
export function itemTitleText(title: string | null): string {
  return title && title.trim().length > 0 ? title : "（項目名なし）";
}

/** 項目名の出どころの説明（null は空欄＝見つからなかった） */
export function itemTitleSourceLabel(source: ItemTitleSource): string {
  switch (source) {
    case "質問":
      return "質問者の名乗りから";
    case "答弁":
      return "答弁の前置きから";
    case "言葉から推定":
      return "推定：本文の言葉から分野を推定（AI は使っていない）";
    default:
      return "項目名は見つからなかった";
  }
}
