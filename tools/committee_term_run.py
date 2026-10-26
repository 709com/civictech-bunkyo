"""今期分（会議の日付が 2023-05-01 以降）の会議録を、委員会・本会議とも分解して中間ファイルを作る。

使い方: py -3 tools/committee_term_run.py
- 原本（ドライブ）は読むだけ。写しを data/今期分/原本コピー/ に置いて、そこから分解する。
- データベースには入れない。AI は使わない。
- 出力：data/今期分/ の JSON（1件ごと）、目録.csv、まとめ.md、委員会の一般質問一覧（内部用）.csv、
  議事の言葉の印の一覧.csv、契約の相手方の一覧.csv、重複・分冊の一覧.csv、
  要確認_契約の文の人名候補.csv（ほかの個人情報の残りの候補も同じ表に種類別に）、要確認_本文の照合.csv、_進み具合.log
"""
import csv
import hashlib
import json
import os
import re
import shutil
import sys
import time
import traceback
from collections import Counter

sys.path.insert(0, os.path.dirname(__file__))
from committee_term_files import list_term_files  # noqa: E402
from committee_trial_run import (corpus_duplicates, run_one, write_gq_csv, write_set)  # noqa: E402
from split_committee_minutes import COMPANY_RE, DOT_LINE_RE, REP_CONTEXT, SEP_LINE_RE, parse_time  # noqa: E402

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
OUT = os.environ.get("TERM_OUT") or os.path.join(ROOT, "data", "今期分")
COPY = os.path.join(ROOT, "data", "今期分", "原本コピー")
SP = "　"


def short_name(r):
    top = r["rel"].split(os.sep)[0]
    tag = "本会議" if r["tree"] == "★会議録本会議" else re.sub(r"^\d+\s*|^\d+_", "", top).replace(" ", "")
    base = os.path.basename(r["rel"]).replace("　", "").replace(" ", "")
    return f"{r['date']}_{tag}_{base}"


def verify_rebuild(res):
    """発言の本文を、原文の層の段落から作り直せるか（非公開・表の印の行は除いて比べる）。"""
    raw = {p["para"]: p for p in res["raw_paragraphs"]}
    stage = {}
    for s in res["stage_directions"]:
        stage.setdefault(s["para"], set()).add(s["text"])
    bad = []
    for sp in res["speeches"]:
        lines = []
        for q in range(sp["para_start"], sp["para_end"] + 1):
            p = raw.get(q)
            if not p or p["text"] is None or p.get("in_table"):
                continue
            for li, ln in enumerate(p["text"].split("\n")):
                if (q, li) < (sp["para_start"], sp.get("line_start", 0)) or (q, li) > (sp["para_end"], sp.get("line_end", 10 ** 6)):
                    continue  # 1つの段落に複数の発言があるとき、この発言の行だけ
                st = ln.strip(SP + " \t")
                if not st or st in stage.get(q, set()) or SEP_LINE_RE.match(ln) or DOT_LINE_RE.match(ln) or parse_time(st):
                    continue
                lines.append(st)
        if lines:
            m = re.match(r"^○[\s　]*([^\s　]+)[\s　]+(.*)$", lines[0])
            if m:
                lines[0] = m.group(2).strip(SP + " ")
            elif lines[0].startswith("○"):
                lines[0] = lines[0][1 + len(sp["label"]):].strip(SP + " ")
            lines = [x for x in lines if x]
        mine = "\n".join(x for x in sp["text"].split("\n") if not x.startswith("［"))
        if "\n".join(lines) != mine:
            bad.append(sp["seq"])
    return bad


CAND_RULES = [
    ("契約の文の人名候補", re.compile(r"(?<![一-龥])([一-龥]{2,4})(氏|様)(?![一-龥])")),
    ("契約の文の人名候補", re.compile(r"(?:代表|社長|会長|理事|所長|部長|店長|役員|パートナー|支配人|責任者|取締役)[、\s　]*"
                                     r"((?!［)[一-龥々][一-龥々ぁ-ん\s　]{1,6}?)(?=でございます|です|。|、|$)")),
]


def candidates(res, name):
    """隠し漏れの候補を機械で拾う（目で確かめるための一覧）。"""
    rows = []
    sp_of = {}
    for sp in res["speeches"]:
        for q in range(sp["para_start"], sp["para_end"] + 1):
            sp_of.setdefault(q, sp["seq"])

    def add(kind, p, m):
        t = p["text"]
        a, b = max(0, m.start() - 25), min(len(t), m.end() + 25)
        rows.append([kind, name, p["para"], sp_of.get(p["para"], ""), m.group(0), t[a:b].replace("\n", " ")])

    for p in res["raw_paragraphs"]:
        t = p["text"]
        if not t:
            continue
        if re.search(REP_CONTEXT, t):
            for kind, rx in CAND_RULES:
                for m in rx.finditer(t):
                    g = m.group(1)
                    if re.match(r"^[\s　]*○[^\s　]*$", t[:m.start()].split("\n")[-1] + t[m.start():m.end(0) - len(g)].strip()):
                        continue  # 「○竹田総務部長　次に、…」の発言者の表記のあと
                    if re.search(r"区長|課長|部長|委員|議員|会計|担当|事務|議長|教育長", g) or re.match(
                            r"^(者|取締役|社長|会長|支店長|本店長|所長|我々|私|当|本|今|各)", g.strip()):
                        continue
                    add(kind, p, m)
        if re.search(r"請願者|陳情者", t) and re.search(r"丁目|番地|[0-9０-９]－[0-9０-９]|[0-9０-９]番[0-9０-９]号", t):
            for m in re.finditer(r"(請願者|陳情者).{0,40}", t):
                add("請願者の欄の残りの候補", p, m)
        for m in re.finditer(r"(昭和|平成|令和)[^。\n]{0,8}年[^。\n]{0,6}月[\s　]+[^。\n]{2,40}(卒業|入社|入庁|就任|退職|現在に至る)|生年月日|現住所", t):
            add("人事案件の残りの候補", p, m)
        if re.search(r"相手方", t):
            for m in re.finditer(r"相手方[^。\n]{0,10}?[、は：:\s　]+([^。\n]{0,30}(丁目|番地|番[0-9０-９〇一二三四五六七八九十]+号))", t):
                if COMPANY_RE.search(t[m.end():m.end() + 40]):
                    continue  # 契約の相手方の企業の所在地（残してよい）
                add("専決処分の相手方の残りの候補", p, m)
    return rows


def lighten(res):
    """まとめを作るのに要る所だけ残す（全文はファイルに書いてあるので、手元では持たない）。"""
    r = dict(res)
    r["_text_sha"] = hashlib.sha256("\n".join((p["text"] or "") for p in res["raw_paragraphs"]).encode("utf-8")).hexdigest()
    r["raw_paragraphs"] = []
    r["speeches"] = [{k: v for k, v in sp.items() if k != "text"} for sp in res["speeches"]]
    for sp in r["speeches"]:
        sp["text"] = ""
    return r


def main():
    t0 = time.time()
    os.makedirs(COPY, exist_ok=True)
    log = open(os.path.join(OUT, "_進み具合.log"), "a", encoding="utf-8")
    rows = [r for r in list_term_files() if r["in_term"]]
    rows.sort(key=lambda r: (r["date"], r["tree"], r["rel"]))
    if os.environ.get("TERM_LIMIT"):
        step = max(1, len(rows) // int(os.environ["TERM_LIMIT"]))
        rows = rows[::step][: int(os.environ["TERM_LIMIT"])]  # 試しに少しだけ（全体からまんべんなく）
    log.write(f"開始 {time.strftime('%Y-%m-%d %H:%M:%S')} 対象 {len(rows)} 件\n")
    log.flush()
    light, cand_rows, verify_rows, fail_rows, party_rows = [], [], [], [], []
    for i, r in enumerate(rows, 1):
        name = short_name(r)
        try:
            dst = os.path.join(COPY, name)
            if not os.path.exists(dst):
                shutil.copy2(r["path"], dst)
            res, m = run_one(name, r["path"], f"今期分（{r['date_rule']}）", copy_dir=COPY, date_hint=r["date"])
            res["file"]["date_from_name"] = r["date"]
            bad = verify_rebuild(res)
            res["verify_rebuild"] = {"ok": not bad, "mismatch_seqs": bad}
            if bad:
                verify_rows.append([name, len(res["speeches"]), len(bad), " ".join(map(str, bad[:20]))])
            cand_rows += candidates(res, name)
            for x in res["contract_parties"]:
                party_rows.append([name, res["meeting"]["date_iso"], x["company"], x["address"],
                                   "個人の相手方（住所・氏名を隠した）" if x.get("individual") else ("隠した" if x.get("representative_title") else "名前なし"),
                                   x.get("representative_title") or "", x["bill_nearby"] or "", x["seq"] or "", x["para"], x.get("note", "")])
            stem = os.path.splitext(name)[0]
            with open(os.path.join(OUT, f"{stem}.json"), "w", encoding="utf-8") as f:
                json.dump(res, f, ensure_ascii=False, indent=1)
            light.append(lighten(res))
            del res, m
        except Exception as e:  # 1件の失敗で全体を止めない。失敗の一覧に残す
            fail_rows.append([name, r["path"], repr(e)[:300]])
            log.write(f"失敗 {name}: {e}\n{traceback.format_exc()[-800:]}\n")
        if i % 10 == 0 or i == len(rows):
            log.write(f"{i}/{len(rows)} 件 済み（{int(time.time() - t0)} 秒）\n")
            log.flush()
    # 全体のまとめ（JSON は書き直さない）
    dups = [d for d in corpus_duplicates() if re.search(r"R[5-8]|令和[5-8]|\(1\)", d[1])]
    write_set(light, OUT, f"今期分（2023-05-01以降）{len(light)}件", dups, write_json=False)
    with open(os.path.join(OUT, "重複・分冊の一覧.csv"), "w", encoding="utf-8-sig", newline="") as f:
        w = csv.writer(f)
        w.writerow(["種類", "フォルダ", "ファイル・件数"])
        w.writerows(dups)
        w.writerow([])
        w.writerow(["会議の鍵が同じもの（重複の代表の判定）", "代表", "代表でないもの・本文が同じか"])
        groups = {}
        for x in light:
            groups.setdefault(x["dedupe"]["meeting_key"], []).append(x)
        for k, xs in groups.items():
            if len(xs) > 1:
                rep = next(x for x in xs if x["dedupe"]["is_representative"])
                others = [f"{x['file']['trial_name']}（{'同じ' if x['dedupe']['same_text_as_representative'] else '違う・要確認'}）"
                          for x in xs if not x["dedupe"]["is_representative"]]
                w.writerow([k, rep["file"]["trial_name"], "／".join(others)])
    # 重複の判定を各 JSON にも書き込む
    for x in light:
        stem = os.path.splitext(x["file"]["trial_name"])[0]
        pth = os.path.join(OUT, f"{stem}.json")
        with open(pth, encoding="utf-8") as f:
            full = json.load(f)
        full["dedupe"] = x["dedupe"]
        full["file"]["duplicate_check"] = x["file"].get("duplicate_check")
        with open(pth, "w", encoding="utf-8") as f:
            json.dump(full, f, ensure_ascii=False, indent=1)
    n, c = write_gq_csv(light, os.path.join(OUT, "委員会の一般質問一覧（内部用）.csv"))
    with open(os.path.join(OUT, "契約の相手方の一覧.csv"), "w", encoding="utf-8-sig", newline="") as f:
        w = csv.writer(f)
        w.writerow(["ファイル", "日付", "企業名", "所在地", "代表者の氏名", "代表者の肩書", "近くの議案", "発言番号", "段落", "メモ"])
        w.writerows(party_rows)
    with open(os.path.join(OUT, "要確認_契約の文の人名候補.csv"), "w", encoding="utf-8-sig", newline="") as f:
        w = csv.writer(f)
        w.writerow(["種類", "ファイル", "段落", "発言番号", "一致した文字", "前後の文"])
        w.writerows(cand_rows)
    with open(os.path.join(OUT, "要確認_本文の照合.csv"), "w", encoding="utf-8-sig", newline="") as f:
        w = csv.writer(f)
        w.writerow(["ファイル", "発言数", "作り直せなかった発言の数", "発言番号（先頭20）"])
        w.writerows(verify_rows)
        w.writerow([])
        w.writerow(["分解に失敗したファイル", "元の場所", "理由"])
        w.writerows(fail_rows)
    log.write(f"終了 {time.strftime('%Y-%m-%d %H:%M:%S')} 成功 {len(light)} 失敗 {len(fail_rows)} 照合の不一致 {len(verify_rows)} "
              f"一般質問の項目 {n}（要確認 {c}） 人名などの候補 {len(cand_rows)} 経過 {int(time.time() - t0)} 秒\n")
    log.close()
    print("done", len(light), len(fail_rows), len(verify_rows), n, c, len(cand_rows), Counter(r[0] for r in cand_rows))
    # 戻り防止：確認表の事例を全部確かめる（結果は data/今期分/確認表の結果.csv）
    import committee_regression_check
    committee_regression_check.main()


if __name__ == "__main__":
    main()
