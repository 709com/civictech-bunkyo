"""確認表（tools/committee_regression_cases.json）の事例を、中間ファイルで全部確かめる（戻り防止）。

使い方: py -3 tools/committee_regression_check.py
結果は画面に出し、data/今期分/確認表の結果.csv にも書く（人名は書かない）。
"""
import csv
import glob
import json
import os
import re

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
DIRS = {"trial": [os.path.join(ROOT, "data", "委員会試し"), os.path.join(ROOT, "data", "委員会試し", "追加")],
        "term": [os.path.join(ROOT, "data", "今期分")]}
REP_LEFT = re.compile(r"(代表取締役|取締役|執行役員|支店長|本店長|支社長|代表社員|代表理事|理事長|本社代表)、?(?!［)([一-龥]{2,5})(?=でございます|です|で、|。)")


def find(set_, prefix):
    for d in DIRS[set_]:
        fs = sorted(f for f in glob.glob(os.path.join(d, prefix + "*.json")) if not os.path.basename(f).startswith("_"))
        if fs:
            return fs[0]
    return None


def load(path):
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def para(r, q):
    return next((p for p in r["raw_paragraphs"] if p["para"] == q), None)


def check_case(c, cache):
    if c["set"] == "all":
        return None
    f = find(c["set"], c["file"])
    if not f:
        return False, "ファイルが見つからない"
    r = cache.setdefault(f, load(f))
    k = c["check"]
    if k == "para_masks":
        p = para(r, c["para"])
        t = (p or {}).get("text") or ""
        n = t.count("［非公開：代表者の氏名］")
        left = REP_LEFT.findall(t)
        ok = n >= c["min"] and not left and all(w in t for w in c.get("keep", []))
        return ok, f"隠した数 {n}（期待 {c['min']} 以上）・隠し漏れの形 {len(left)}"
    if k == "para_with_text_masks":
        ps = [p for p in r["raw_paragraphs"] if p["text"] and c["contains"] in p["text"]]
        n = sum(p["text"].count("［非公開：代表者の氏名］") for p in ps)
        left = sum(len(REP_LEFT.findall(p["text"])) for p in ps)
        return (bool(ps) and n >= c["min"] and not left), f"該当段落 {len(ps)}・隠した数 {n}・隠し漏れの形 {left}"
    if k == "para_withheld":
        bad = [q for q in c["paras"] if not para(r, q) or para(r, q)["text"] is not None]
        return not bad, f"非公開でない段落 {bad}"
    if k == "para_not_withheld":
        bad = [q for q in c["paras"] if not para(r, q) or para(r, q)["text"] is None or "［非公開" in para(r, q)["text"]]
        return not bad, f"非公開になっている段落 {bad}"
    if k == "para_keep":
        p = para(r, c["para"])
        t = (p or {}).get("text") or ""
        miss = [w for w in c.get("keep", []) if w not in t]
        masked = c.get("nomask") and ("［非公開：代表者の氏名］" in t or "［非公開：公の機関" in t)
        return (bool(t) and not miss and not masked), f"残っていない語 {miss}・代表者の印 {bool(masked)}"
    if k == "table_cell":
        ps = [p for p in r["raw_paragraphs"] if p.get("in_table") == c["cell"]]
        w = any(p["text"] is None for p in ps)
        return (bool(ps) and w == c["withheld"]), f"マス {c['cell']} 非公開={w}"
    if k == "section_not_kind_at":
        s = [x for x in r["sections"] if x["start_seq"] == c["seq"] and x["kind"] == c["kind"]]
        return not s, f"発言{c['seq']}で始まる「{c['kind']}」の区切り {len(s)}"
    if k == "section_kind_at":
        s = [x for x in r["sections"] if x["start_seq"] == c["seq"]]
        return (bool(s) and s[0]["kind"] == c["kind"]), f"発言{c['seq']}の区切り {[x['kind'] for x in s]}"
    if k == "section_budget":
        s = [x for x in r["sections"] if x["id"] == c["id_"]]
        b = (s[0].get("budget_scope") if s else None) or {}
        return (bool(b) and b.get("is_range") == c["is_range"]), f"is_range={b.get('is_range')}"
    if k == "gq":
        g = r["general_question"]
        ok = g.get("found") and all(g.get(a) == c[b] for a, b in (("start_seq", "start"), ("end_seq", "end")) if b in c)
        if "items" in c:
            ok = ok and len(g.get("items", [])) == c["items"]
        return bool(ok), f"範囲 {g.get('start_seq')}〜{g.get('end_seq')}・項目 {len(g.get('items', []))}"
    if k == "gq_none":
        return not r["general_question"].get("found"), f"found={r['general_question'].get('found')}"
    if k == "gq_end_not_closing":
        g = r["general_question"]
        ok = g.get("found") and "範囲の外" in (g.get("end_marker") or "")
        return bool(ok), f"終わりの目印 {g.get('end_marker')}"
    if k == "dedupe":
        d = r.get("dedupe", {})
        return d.get("is_representative") == c["is_rep"], f"代表={d.get('is_representative')}"
    if k == "meeting":
        mt = r["meeting"]
        ok = True
        if "key_endswith" in c:
            ok = ok and mt["meeting_id"].endswith(c["key_endswith"])
        if "date" in c:
            ok = ok and mt["date_iso"] == c["date"]
        if "is_rep" in c:
            ok = ok and r.get("dedupe", {}).get("is_representative") == c["is_rep"]
        return ok, f"鍵 {mt['meeting_id']}・代表 {r.get('dedupe', {}).get('is_representative')}"
    if k == "speech_text_nonempty":
        s = [x for x in r["speeches"] if x["seq"] == c["seq"]]
        return (bool(s) and bool(s[0]["text"].strip())), f"本文の長さ {len(s[0]['text']) if s else None}"
    if k == "gq_item_answers":
        it = next((x for x in r["general_question"].get("items", []) if x["no"] == c["item"]), None)
        got = sorted(a["seq"] for a in it["answers"]) if it else None
        return got == sorted(c["answers"]), f"項目{c['item']}の答弁 {got}"
    if k == "span_at":
        s = [x for x in r["sections"] if (x.get("starts_mid_speech") or {}).get("seq") == c["seq"]]
        ok = bool(s) and s[0]["starts_mid_speech"]["sentence_index"] == c["sentence_index"] and (
            "kind" not in c or s[0]["kind"] == c["kind"])
        return ok, f"発言{c['seq']}の途中の区切り {[(x['kind'], x['starts_mid_speech']['sentence_index']) for x in s]}"
    if k == "section_budget_detail":
        s = [x for x in r["sections"] if x["id"] == c["id_"]]
        b = (s[0].get("budget_scope") if s else None) or {}
        ok = bool(s)
        if "start_seq" in c:
            ok = ok and s[0]["start_seq"] == c["start_seq"]
        if "kind" in c:
            ok = ok and s[0]["kind"] == c["kind"]
        if "accounts" in c:
            ok = ok and b.get("accounts") == c["accounts"]
        if "sides" in c:
            ok = ok and b.get("sides") == c["sides"]
        if "inherited" in c:
            ok = ok and all(x in (b.get("inherited_from_same_speech") or []) for x in c["inherited"])
        if "kan" in c:
            ok = ok and all(x in (b.get("kan") or []) for x in c["kan"])
        return ok, f"区切り{c['id_']} 始まり{s[0]['start_seq'] if s else None} 会計{b.get('accounts')} 款{b.get('kan')}"
    if k == "para_range_withheld":
        bad = [q for q in range(c["from"], c["to"] + 1) if para(r, q) and para(r, q)["text"] is not None and para(r, q)["text"].strip()]
        return not bad, f"非公開でない（空でない）段落 {bad[:10]}"
    if k == "table_withheld_cells":
        ps = [p for p in r["raw_paragraphs"] if p.get("in_table") and p["text"] is None]
        cells = sorted({tuple(p["in_table"]) for p in ps})
        return cells == [tuple(x) for x in c["cells"]], f"非公開のマス {cells}"
    if k == "speaker_at":
        s = next((x for x in r["speeches"] if x["seq"] == c["seq"]), None)
        if not s:
            return False, "発言が無い"
        ok = bool(s["speaker"]["full_name"]) == c["identified"] and c.get("how_contains", "") in (s["speaker"].get("how") or "")
        return ok, f"表記 {s['label']}・特定={bool(s['speaker']['full_name'])}・{s['speaker'].get('how')}"
    if k == "stats":
        bad = {a: (r["stats"].get(a), v) for a, v in c["expect"].items() if r["stats"].get(a) != v}
        return not bad, f"違う数 {bad}"
    if k == "speeches_same_para":
        ss = [x for x in r["speeches"] if x["seq"] in c["seqs"]]
        ok = len(ss) == len(c["seqs"]) and len({x["para_start"] for x in ss}) == 1 and all(x["text"].strip() for x in ss)
        ok = ok and all(ss[i]["line_end"] < ss[i + 1]["line_start"] for i in range(len(ss) - 1))
        ok = ok and (r.get("verify_rebuild") or {}).get("ok", True)
        return ok, f"段落 {[x['para_start'] for x in ss]}・行 {[(x['line_start'], x['line_end']) for x in ss]}"
    if k == "disorder_at":
        ds = [d for d in r["disorder_words"] if d.get("seq") == c["seq"] or (d.get("where") == "ト書き" and d.get("after_seq") == c["seq"])]
        ok = bool(ds) and all(d["category"] == c["category"] for d in ds)
        return ok, f"発言{c['seq']}の印 {[(d['word'], d['category']) for d in ds]}"
    if k == "name_kept_after":
        p = para(r, c["para"])
        t = (p or {}).get("text") or ""
        m = re.search(re.escape(c["anchor"]) + r"、?([^、。\s　［]{2,6})(?=でございます|です)", t)
        return bool(m) and "［非公開" not in t, f"「{c['anchor']}」のあとの名前 {'残っている（' + str(len(m.group(1))) + '文字）' if m else '見つからない'}"
    return False, f"知らない確かめ方 {k}"


def check_all_files(c):
    if c["check"] == "disorder_csv_excludes_nonrep":
        # 重複の代表でないファイルが、議事の言葉の一覧に入っていない
        bad = []
        for ds in DIRS.values():
            for d in ds:
                nonrep = [os.path.basename(f)[:-5] for f in glob.glob(os.path.join(d, "*.json"))
                          if not os.path.basename(f).startswith("_") and load(f).get("dedupe", {}).get("is_representative") is False]
                csvp = os.path.join(d, "議事の言葉の印の一覧.csv")
                if nonrep and os.path.exists(csvp):
                    txt = open(csvp, encoding="utf-8-sig").read()
                    bad += [n for n in nonrep if n in txt]
        return not bad, f"一覧に入っている代表でないファイル {bad}"
    files = []
    for ds in DIRS.values():
        for d in ds:
            files += [f for f in glob.glob(os.path.join(d, "*.json")) if not os.path.basename(f).startswith("_")]
    bad = []
    for f in files:
        r = load(f)
        if c["check"] == "verify_rebuild":
            v = r.get("verify_rebuild")
            if v is not None and not v.get("ok"):
                bad.append(os.path.basename(f))
        elif c["check"] == "no_unmasked_rep":
            for p in r["raw_paragraphs"]:
                t = p["text"] or ""
                if re.search(r"相手方|構成員|代表者", t):
                    for m in REP_LEFT.finditer(t):
                        ctx = t[max(0, m.start() - 40):m.start()]
                        if not re.search(r"区長|市長|局長|知事|千代田区|国土交通省|省|庁", ctx + m.group(1)):
                            bad.append(f"{os.path.basename(f)}:段落{p['para']}")
        elif c["check"] == "disorder_csv_excludes_nonrep":
            pass
        elif c["check"] == "parties_no_mask_in_company":
            for x in r.get("contract_parties", []):
                if "［" in (x.get("company") or "") or "［" in (x.get("address") or ""):
                    bad.append(f"{os.path.basename(f)}:段落{x['para']}")
    return not bad, f"対象 {len(files)} 件・問題 {len(bad)} {bad[:5]}"


def main():
    cases = load(os.path.join(os.path.dirname(__file__), "committee_regression_cases.json"))["cases"]
    cache, rows = {}, []
    for c in cases:
        ok, why = check_all_files(c) if c["set"] == "all" else check_case(c, cache)
        rows.append([c["id"], c["set"], c.get("file", "（全件）"), c["check"], "合格" if ok else "不合格", why, c.get("why", "")])
        print(("OK " if ok else "NG ") + c["id"], c.get("file", ""), why)
    out = os.path.join(ROOT, "data", "今期分", "確認表の結果.csv")
    with open(out, "w", encoding="utf-8-sig", newline="") as f:
        w = csv.writer(f)
        w.writerow(["番号", "組", "会議（ファイル名の頭）", "確かめ方", "結果", "中身", "なぜ"])
        w.writerows(rows)
    n_ok = sum(1 for x in rows if x[4] == "合格")
    print(f"合格 {n_ok}/{len(rows)}")


if __name__ == "__main__":
    main()
