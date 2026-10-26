"""委員会会議録の分解の試し（10件）を動かし、中間ファイルとまとめを作る。

使い方: py -3 tools/committee_trial_run.py
- 入力：data/委員会試し/原本コピー（ドライブの原本を写したもの）と 変換済み（.doc を Word で変換したもの）
- 出力：data/委員会試し/ の JSON（1件ごと）、目録、まとめ（Markdown）
- データベースには接続しない。AI は使わない。
"""
import csv
import json
import os
import re
import sys
from collections import Counter, defaultdict

sys.path.insert(0, os.path.dirname(__file__))
from split_committee_minutes import (TOOL_NAME, TOOL_VERSION, Meeting, fingerprint,  # noqa: E402
                                     kan2int, nospace, parse_wareki, sha256_file)

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
OUT = os.path.join(ROOT, "data", "委員会試し")
COPY = os.path.join(OUT, "原本コピー")
CONV = os.path.join(OUT, "変換済み")
DRIVE_C = r"G:\マイドライブ\2_会議録データ\★会議録委員会"
DRIVE_H = r"G:\マイドライブ\2_会議録データ\★会議録本会議"

# 選んだ10件（番号_名前, ドライブの元の場所, 選んだ理由）
FILES = [
    ("01_H23総務0224.doc", DRIVE_C + r"\01 総務区民委員会\H23 総務区民\総務0224.doc",
     "いちばん古い年代（平成23年）・.doc・常任委員会。一般質問の続きと議案・請願の審査がそろっている"),
    ("02_H26自治制度0911.doc", DRIVE_C + r"\07 自治制度・行財政システム調査特別委員会\H26 自治制度\0911自治制度.doc",
     "特別委員会（調査）・.doc の中間の年代。講師など名簿にない話し手がいる"),
    ("03_H29予特0310.doc", DRIVE_C + r"\10 予算審査特別委員会\H29 予算\0310予特.doc",
     "予算審査特別委員会（款別の質疑）・.doc"),
    ("04_R41004決算.docx", DRIVE_C + r"\11 決算審査特別委員会\R41004決算.docx",
     "決算審査特別委員会（款別の質疑）・.docx。フォルダに入っていない（直下に置かれた）ファイル"),
    ("05_R5議運0905.docx", DRIVE_C + r"\05 議会運営委員会\R5\0905議運.docx",
     "議会運営委員会。一般質問の時間がない種類の会議（ないことを正しく出せるか）"),
    ("06_R7文教0929①.docx", DRIVE_C + r"\04 文教委員会\R7\0929文教①.docx",
     "いちばん新しい年代（令和7年）・常任委員会・分冊①。議案・請願5件・報告・一般質問がそろう"),
    ("07_R7文教0929②.docx", DRIVE_C + r"\04 文教委員会\R7\0929文教②.docx",
     "分冊②（①と同じ日の続き。協議事項だけの短い会議録）"),
    ("08_R3厚生0726.docx", DRIVE_C + r"\02 厚生委員会\R3厚生\0726厚生.docx",
     "重複らしいファイルの組（0726厚生.docx と 0726厚生委員会.docx）の片方"),
    ("09_R3厚生委員会0726.docx", DRIVE_C + r"\02 厚生委員会\R3厚生\0726厚生委員会.docx",
     "重複らしいファイルの組のもう片方"),
    ("10_H23本会議0912.doc", DRIVE_H + r"\平成２３年\平成２３年第３回定例会\11.09.12　文京区平成23年第3回定例会（2日目）.doc",
     "本会議の1件（平成23年・.doc・一般質問の日）。委員会用の道具が本会議の書式でどこまで通るか"),
]


def session_from_name(drive_path, is_committee):
    """本会議：ファイル名から会議の種別（招集・定例・臨時）・回次・何日目を取る。委員会は会議録に書かれていない。"""
    base = os.path.basename(drive_path)
    if is_committee:
        return {"source": "委員会の会議録には会期の記載がない（空欄）", "kind": None, "number": None, "day": None}
    out = {"source": "ファイル名", "kind": None, "number": None, "day": None, "month": None}
    m = re.search(r"第([0-9０-９]+)回(定例会|臨時会)", base)
    if m:
        out["number"] = int(m.group(1).translate(str.maketrans("０１２３４５６７８９", "0123456789")))
        out["kind"] = {"定例会": "定例", "臨時会": "臨時"}[m.group(2)]
    m = re.search(r"([0-9]+)月(定例|臨時|招集)議会", base)
    if m:
        out["month"], out["kind"] = int(m.group(1)), m.group(2)
    m = re.search(r"（([0-9０-９]+)日目", base)
    if m:
        out["day"] = kan2int(m.group(1))
    elif "最終日" in base:
        out["day"] = "最終日"
    return out


def date_from_name(drive_path):
    base = os.path.basename(drive_path)
    m = re.match(r"^(\d\d)\.(\d\d)\.(\d\d)", base)
    if m:
        return f"20{m.group(1)}-{m.group(2)}-{m.group(3)}", "YY.MM.DD"
    m = re.match(r"^R(\d)(\d\d)(\d\d)", base)
    if m:
        return f"{2018 + int(m.group(1))}-{m.group(2)}-{m.group(3)}", "R年MMDD"
    m = re.search(r"(\d\d)(\d\d)", base)
    if m:
        return f"????-{m.group(1)}-{m.group(2)}", "MMDD（年はフォルダ名から）"
    return None, None


def contract_parties(m):
    """契約の相手方の企業名・所在地（代表者の氏名は隠したうえで）を、どの発言・どの議案かと一緒に残す。"""
    sp_of = {}
    for sp in m.speeches:
        for q in range(sp["para_start"], sp["para_end"] + 1):
            sp_of.setdefault(q, sp)
    sec = {s["id"]: s for s in m.sections}
    text_of = {p["para"]: p["text"] for p in m.paras}
    out = []
    for x in m.contract_parties:
        sp = sp_of.get(x["para"])
        # 同じ段落か、前の5段落のうちいちばん近い「議案第◯号」
        bill = None
        for q in range(x["para"], max(-1, x["para"] - 6), -1):
            refs = re.findall(r"議案第[\s　]*([0-9０-９〇一二三四五六七八九十百]+)号", text_of.get(q, ""))
            if refs:
                bill = "議案第" + str(kan2int(refs[-1]) if kan2int(refs[-1]) is not None else refs[-1]) + "号"
                break
        s = sec.get(sp.get("section_id")) if sp else None
        out.append({"company": x["company"], "address": x["address"], "representative_title": x["title"],
                    "representative_name": None if x.get("individual") else "［非公開：代表者の氏名］",
                    "individual": bool(x.get("individual")), "note": x.get("note", ""), "para": x["para"],
                    "seq": sp["seq"] if sp else None, "bill_nearby": bill,
                    "section_refs": s["refs"] if s else []})
    # 代表者の名前が出てこない相手方（共同企業体・指定管理者の団体など）も企業名を残す
    have = {(x["para"], x["company"]) for x in m.contract_parties}
    for p in m.paras:
        if not p["text"]:
            continue
        for mm in re.finditer(r"(?:契約の相手方は|相手方は|指定管理者に)、?([^。]{2,80}?)(?:でございます|です|を指定)", p["text"]):
            body = mm.group(1)
            if "［非公開" in body or not re.search(r"株式会社|有限会社|合同会社|共同企業体|共同事業体|法人|組合|協会|プロジェクト|センター|事業団", body):
                continue
            parts = [c.strip(SP if False else "　 ") for c in re.split(r"[、，]", body) if c.strip("　 ")]
            company = next((c for c in reversed(parts) if not re.search(r"(丁目|番地|号)$", c)), body)
            address = next((c for c in parts if re.search(r"(丁目|番地|番|号)", c) and c != company), "")
            if (p["para"], company) in have:
                continue
            have.add((p["para"], company))
            sp = sp_of.get(p["para"])
            bill = None
            for q in range(p["para"], max(-1, p["para"] - 6), -1):
                refs = re.findall(r"議案第[\s　]*([0-9０-９〇一二三四五六七八九十百]+)号", text_of.get(q, ""))
                if refs:
                    bill = "議案第" + str(kan2int(refs[-1]) if kan2int(refs[-1]) is not None else refs[-1]) + "号"
                    break
            s = sec.get(sp.get("section_id")) if sp else None
            out.append({"company": company, "address": address, "representative_title": None,
                        "representative_name": None, "para": p["para"], "seq": sp["seq"] if sp else None,
                        "bill_nearby": bill, "section_refs": s["refs"] if s else []})
    return out


def run_one(name, drive_path, reason, copy_dir=None, conv_dir=None, date_hint=None):
    copy_dir = copy_dir or COPY
    conv_dir = conv_dir or CONV
    src_copy = os.path.join(copy_dir, name)
    is_doc = name.endswith(".doc")
    docx_path = os.path.join(conv_dir, name[:-4] + ".docx") if is_doc else src_copy
    m = Meeting(docx_path, {})
    m.load()
    m.detect_body()
    m.parse_header()
    m.detect_personal()  # 先に非公開の段落を決め、発言の本文に入れない
    m.parse_body()
    m.resolve_speakers()
    m.mark_presiding()
    m.mark_sections()
    m.mark_references()
    m.general_question()
    m.mark_disorder()
    m.apply_withholding_to_items()

    date_iso = parse_wareki(m.date_text or "") if m.is_committee else None
    date_src = "本文の開会年月日"
    name_date, name_rule = date_from_name(drive_path)
    if not m.is_committee:
        for ln in m.lines[:6]:
            date_iso = parse_wareki(ln["text"])
            if date_iso:
                date_src = "本文の日付"
                m.date_text = nospace(ln["text"])
                break
    if not m.is_committee and not date_iso:
        md = re.match(r"^([〇一二三四五六七八九十]+)月([〇一二三四五六七八九十]+)日", m.title_raw)
        if md and name_date:
            date_iso = f"{name_date[:4]}-{kan2int(md.group(1)):02d}-{kan2int(md.group(2)):02d}"
            date_src = "本文の月日（年は書かれていない）＋ファイル名の年"
        m.date_text = m.title_raw
    date_check = None
    if date_iso and name_date:
        date_check = "一致" if date_iso[5:] == name_date[5:] and (name_date[:4] == "????" or name_date[:4] == date_iso[:4]) else f"食い違い（ファイル名 {name_date}）"
    if not date_iso:
        # 本文の日付が読めない（「令和９月１７日」のように年が抜けているなど）→ ファイル名・フォルダ名の日付で補い、要確認の印
        hint = date_hint or (name_date if name_date and "?" not in name_date else None)
        if hint:
            date_iso = hint
            date_src = "本文の日付が読めないため、ファイル名・フォルダ名の日付で補った（要確認）"
            date_check = "本文の日付なし（要確認）"
            m.issues.append(f"会議の日付：本文「{m.date_text}」から読めず、ファイル名などの日付 {hint} で補った（要確認）")
    # 分冊：会議録の題名に①②がなくても、ファイル名に①②があれば分冊として扱う（重複と取り違えない）
    vol_src = "会議録の題名" if m.volume else None
    if not m.volume:
        fv = re.search(r"[①②③④⑤]", os.path.basename(drive_path))
        if fv:
            m.volume = fv.group(0)
            vol_src = "ファイル名"

    body = "委員会" if m.is_committee else "本会議"
    meeting_id = f"{body}:{m.committee_name or '本会議'}:{date_iso}" + (f":{m.volume}" if m.volume else "")
    m.speech_keys(meeting_id)

    budget_kinds = [s["kind"] for s in m.sections if s["kind"] in ("総括質疑", "款別質疑", "態度表明", "採決")]
    result = {
        "tool": {"name": TOOL_NAME, "version": TOOL_VERSION, "ai_used": False},
        "file": {
            "trial_name": name, "drive_path": drive_path, "selected_because": reason,
            "format": "doc" if is_doc else "docx",
            "converted": is_doc,
            "conversion": "Word（WordOpenXML で中身を取り出し、flat_opc_to_docx.py で docx に組み立て）" if is_doc else None,
            "sha256_source": sha256_file(src_copy), "size_source": os.path.getsize(src_copy),
            "parsed_docx": os.path.relpath(docx_path, ROOT),
            "sha256_parsed_docx": sha256_file(docx_path),
        },
        "meeting": {
            "meeting_id": meeting_id, "body": body, "title_raw": m.title_raw,
            "committee_name": m.committee_name, "committee_type": m.committee_type(),
            "volume": m.volume, "volume_source": vol_src, "date_iso": date_iso, "date_text": m.date_text, "date_source": date_src,
            "date_in_filename": name_date, "date_filename_rule": name_rule, "date_check": date_check,
            "place": m.place, "session": session_from_name(drive_path, m.is_committee),
            "budget_review_parts": budget_kinds,
        },
        "roster": m.roster,
        "agenda_planned": m.agenda_planned,
        "times": m.times,
        "sections": m.sections,
        "markers": m.markers,
        "general_question": m.gq,
        "disorder_words": m.disorder,
        "tables": [it for it in m.items if it["kind"] == "表"],
        "references": m.references,
        "stage_directions": m.stage,
        "petition_documents": [it for it in m.items if it["kind"] == "請願文書表"],
        "appendix": [it for it in m.items if it["kind"] == "付属資料"],
        "personal_info_withheld": m.withheld + m.partial_withheld,
        "contract_parties": contract_parties(m),
        "format_issues": m.issues,
        "speeches": m.speeches,
        "raw_paragraphs": m.raw_layer(),
    }
    # 付属資料・発言者のいない段落の文字も、非公開の段落なら消す
    wh = {w["para"] for w in m.withheld}
    for it in result["appendix"]:
        if it["para"] in wh:
            it["text"] = None
            it["withheld"] = True
    # 数
    sps = m.speeches
    lab = Counter(sp["label"] for sp in sps)
    ok = [sp for sp in sps if sp["speaker"]["full_name"]]
    diff_p = [p for p in m.paras if p["pd_index"] is not None and p["text"] != p["ptext"]]
    result["stats"] = {
        "paragraphs_total": len(m.paras), "paragraphs_python_docx": m.n_pd, "tables": m.n_tbl,
        "table_paragraphs": sum(1 for p in m.paras if p["in_table"]),
        "ptext_diff_paragraphs": len(diff_p),
        "ptext_missing_chars": sum(len(p["text"]) - len(p["ptext"]) for p in diff_p),
        "table_chars": sum(len(p["text"]) for p in m.paras if p["in_table"]),
        "eq_fields": sum(len(p.get("notes", {}).get("eq", [])) for p in m.paras),
        "ruby": sum(len(p.get("notes", {}).get("ruby", [])) for p in m.paras),
        "speeches": len(sps), "distinct_labels": len(lab),
        "identified_speeches": len(ok),
        "identified_labels": len({sp["label"] for sp in ok}),
        "roster_people": len(m.roster),
        "stage_directions": len(m.stage), "times": len(m.times), "sections": len(m.sections),
        "references": len(m.references), "withheld_paragraphs": len(m.withheld),
        "gq_items": len(m.gq.get("items", [])),
        "gq_items_needs_check": sum(1 for i in m.gq.get("items", []) if i["needs_check_flag"]),
        "disorder_words": len(m.disorder),
        "spanning_speeches": sum(1 for sp in sps if sp.get("sections_spanned")),
        "jinji_fields": dict(m.jinji_fields or {}), "jinji_kept_paragraphs": len(m.jinji_kept or []),
    }
    return result, m


def corpus_duplicates():
    """ドライブの全ファイル名から、重複らしい組・分冊（①②）・「(1)」付きのフォルダを一覧にする（まとめない）。"""
    rows = []
    for top in (DRIVE_C, DRIVE_H):
        for dirpath, dirnames, filenames in os.walk(top):
            rel = os.path.relpath(dirpath, os.path.dirname(top))
            if re.search(r" \(1\)$", dirpath):
                rows.append(("「(1)」付きのフォルダ（同期の重複の可能性）", rel, len(filenames)))
            docs = [f for f in filenames if f.lower().endswith((".doc", ".docx"))]
            by_key = defaultdict(list)
            for f in docs:
                stem = os.path.splitext(f)[0]
                mm = re.match(r"^(R\d)?(\d{4})", stem) or re.match(r"^(\D*?)(\d{4})", stem)
                key = (mm.group(2) if mm else stem) + ("" if not re.search(r"[①②③④]", stem) else "")
                by_key[re.sub(r"[①②③④]", "", key)].append(f)
            for k, fs in by_key.items():
                vols = [f for f in fs if re.search(r"[①②③④]", f)]
                plain = [f for f in fs if not re.search(r"[①②③④]", f)]
                if len(plain) >= 2:
                    rows.append(("同じ日付のファイルが2つ以上（重複らしい）", rel, " / ".join(sorted(plain))))
                if vols:
                    rows.append(("分冊（①②）", rel, " / ".join(sorted(fs))))
    return rows


def key_simulation(results):
    """発言の鍵の試し。
    (1) #2 以降が要った発言の数
    (2) 発言を1つ消したとき変わる鍵の数（この案／通し番号の鍵）
    (3) 速報版で空欄だった話し手が正式版で特定されたとき変わる鍵の数（前の案＝フルネーム／この案＝原文の表記）
    (4) 話し手の表記の誤記が直されたとき変わる鍵の数（この案の弱い所。空欄の話し手の数を上限の目安に）
    """
    out = []
    for r in results:
        sps = r["speeches"]
        if not sps:
            continue
        dup = sum(1 for sp in sps if sp["key_parts"]["dup_no"] > 1)
        mid = len(sps) // 2
        kept = [sp for i, sp in enumerate(sps) if i != mid]
        seen = Counter()
        changed_fp = 0
        for sp in kept:
            base = f"{sp['key_parts']['meeting']}|{sp['key_parts']['speaker_label']}|{sp['key_parts']['head20_sha1']}"
            seen[base] += 1
            newkey = base + (f"#{seen[base]}" if seen[base] > 1 else "")
            if newkey != sp["key"]:
                changed_fp += 1
        changed_ord = len(sps) - 1 - mid
        blank = sum(1 for sp in sps if not sp["speaker"]["full_name"])
        out.append({"name": r["file"]["trial_name"], "speeches": len(sps), "dup_suffix_needed": dup,
                    "changed_if_one_deleted_fp": changed_fp, "changed_if_one_deleted_ordinal": changed_ord,
                    "changed_if_blank_speakers_identified_old_fullname_key": blank,
                    "changed_if_blank_speakers_identified_label_key": 0})
    return out


def write_set(results, out_dir, title, dups=None, write_json=True):
    os.makedirs(out_dir, exist_ok=True)
    with open(os.path.join(out_dir, "目録.csv"), "w", encoding="utf-8-sig", newline="") as f:
        w = csv.writer(f)
        w.writerow(["試しの名前", "元の場所", "形式", "変換", "sha256（元）", "会議", "委員会名", "委員会の種類",
                    "分冊", "日付", "日付の取り方", "ファイル名の日付と", "重複の判定", "選んだ理由"])
        sha = Counter(r["file"]["sha256_source"] for r in results)
        import hashlib
        texts = {r["file"]["trial_name"]: (r.get("_text_sha") or hashlib.sha256(
            "\n".join((p["text"] or "") for p in r["raw_paragraphs"]).encode("utf-8")).hexdigest()) for r in results}
        for r in results:
            fm, mt = r["file"], r["meeting"]
            same_text = [n for n, t in texts.items() if n != fm["trial_name"] and t == texts[fm["trial_name"]]]
            dup = ("ファイルが完全に同じ" if sha[fm["sha256_source"]] > 1 else
                   ("ファイルは別だが、本文（全段落の文字）が完全に同じ：" + "、".join(same_text)) if same_text else "重複なし（この組の中で）")
            r["file"]["duplicate_check"] = dup
            # 重複の代表：会議の鍵が同じものの中で、名前の順で最初の1件だけを代表にする（データベースには代表だけ入れる決まり）
            same_key = sorted(x["file"]["trial_name"] for x in results if x["meeting"]["meeting_id"] == mt["meeting_id"])
            rep = same_key[0]
            r["dedupe"] = {
                "meeting_key": mt["meeting_id"],
                "files_with_same_key": same_key,
                "is_representative": fm["trial_name"] == rep,
                "duplicate_of": None if fm["trial_name"] == rep else rep,
                "same_text_as_representative": texts[fm["trial_name"]] == texts[rep],
                "rule": "会議の鍵（会議の種類・委員会名・日付・分冊）が同じものは1件だけを代表にし、データベースには代表だけを入れる。"
                        "本文が代表と違うときは、自動で決めずに要確認",
            }
            if fm["trial_name"] != rep and texts[fm["trial_name"]] != texts[rep]:
                r["dedupe"]["needs_check"] = "会議の鍵が同じなのに本文が違う（どちらを代表にするか要確認）"
            w.writerow([fm["trial_name"], fm["drive_path"], fm["format"], "Word で変換" if fm["converted"] else "なし",
                        fm["sha256_source"], mt["body"], mt["committee_name"] or "", mt["committee_type"] or "",
                        mt["volume"] or "", mt["date_iso"], mt["date_source"], mt["date_check"], dup,
                        fm["selected_because"]])
    for r in results:
        if not write_json:
            continue
        stem = os.path.splitext(r["file"]["trial_name"])[0]
        with open(os.path.join(out_dir, f"{stem}.json"), "w", encoding="utf-8") as f:
            json.dump(r, f, ensure_ascii=False, indent=1)
    ks = key_simulation(results)
    with open(os.path.join(out_dir, "_集計.json"), "w", encoding="utf-8") as f:
        json.dump({"key_simulation": ks}, f, ensure_ascii=False, indent=1)
    write_summary(results, dups or [], ks, out_dir, title)
    write_disorder(results, out_dir)
    return ks


def write_disorder(results, out_dir):
    """議事の進行が乱れたときの言葉の一覧（文言と位置だけ。評価は付けない）。"""
    with open(os.path.join(out_dir, "議事の言葉の印の一覧.csv"), "w", encoding="utf-8-sig", newline="") as f:
        w = csv.writer(f)
        w.writerow(["区分", "試しの名前", "会議", "日付", "言葉", "場所", "発言番号", "段落", "話し手の表記",
                    "進行役の発言か", "手がかり", "文言"])
        rows = []
        for r in results:
            if r.get("dedupe") and not r["dedupe"]["is_representative"]:
                continue  # 重複の代表でないものは一覧に入れない（二重に数えない）
            mt = r["meeting"]
            for d in r["disorder_words"]:
                rows.append([d["category"], r["file"]["trial_name"], (mt["committee_name"] or "本会議") + (mt["volume"] or ""),
                             mt["date_iso"], d["word"], d["where"], d.get("seq", d.get("after_seq", "")),
                             d.get("para", ""), d.get("label", ""), "はい" if d.get("by_presider") else "",
                             "；".join(d.get("signals", [])), d["wording"]])
        rows.sort(key=lambda x: (x[0] != "乱れた場面の候補", x[1]))
        w.writerows(rows)


def write_gq_csv(all_results, path):
    """委員会の一般質問の一覧（内部用。公開しない。著作権法40条の但書の注意）。"""
    n_items = n_chk = 0
    with open(path, "w", encoding="utf-8-sig", newline="") as f:
        w = csv.writer(f)
        w.writerow(["日付", "委員会", "分冊", "項目番号", "質問者の表記", "質問者（名簿のフルネーム）", "関連質問",
                    "項目名", "項目名の取り方", "答弁者（フルネーム・肩書）", "質問の発言番号", "発言の範囲",
                    "段落の範囲", "要確認", "委員長の宣言との照合", "中間ファイル"])
        for r in all_results:
            mt = r["meeting"]
            if mt["body"] != "委員会":
                continue
            if r.get("dedupe") and not r["dedupe"]["is_representative"]:
                continue  # 重複の代表でないものは一覧に入れない
            sp = {s["seq"]: s for s in r["speeches"]}
            g = r["general_question"]
            dc = g.get("declared_check")
            decl = (f"宣言{dc['declared_items']}件" + (f"・{dc['declared_people']}人" if dc.get("declared_people") else "")
                    + f"／見つけた{dc['found_items']}件・{dc['found_people']}人" + ("（合わない・要確認）" if g.get("needs_check") else "（合う）")) if dc else "宣言なし"
            for it in g.get("items", []):
                seqs = it["question_seqs"] + [a["seq"] for a in it["answers"]]
                lo, hi = min(seqs), max(seqs)
                ans = "、".join(dict.fromkeys(f"{a['full_name'] or '（空欄）'}（{a['role']}）" for a in it["answers"]))
                w.writerow([mt["date_iso"], mt["committee_name"], mt["volume"] or "", it["no"], it["questioner_label"],
                            it["questioner_full_name"], "はい" if it["related_question"] else "", it["title"],
                            it.get("title_rule", ""), ans, " ".join(map(str, it["question_seqs"])), f"{lo}〜{hi}",
                            f"{sp[lo]['para_start']}〜{sp[hi]['para_end']}", "；".join(it["needs_check"]), decl,
                            r["file"]["trial_name"]])
                n_items += 1
                n_chk += 1 if (it["needs_check"] or g.get("needs_check")) else 0
    return n_items, n_chk


def compare_with_previous(results, prev_dir, path, title="前回と今回の違い", common=""):
    """前回の中間ファイルと比べて、変わった所を一覧にする。"""
    L = [f"# {title}\n", common + "\n"]
    for r in results:
        stem = os.path.splitext(r["file"]["trial_name"])[0]
        pp = os.path.join(prev_dir, f"{stem}.json")
        if not os.path.exists(pp):
            continue
        o = json.load(open(pp, encoding="utf-8"))
        L.append(f"## {r['file']['trial_name']}\n")
        diffs = []
        for k in ("speeches", "identified_speeches", "sections", "gq_items", "gq_items_needs_check",
                  "withheld_paragraphs", "references"):
            a, b = o["stats"].get(k), r["stats"].get(k)
            if a != b:
                diffs.append(f"- 数 {k}：{a} → {b}")
        ok = {s["seq"]: s for s in o["speeches"]}
        pc = Counter()
        for s in r["speeches"]:
            a = ok.get(s["seq"], {}).get("presiding_class")
            if a != s.get("presiding_class"):
                pc[f"{a}→{s.get('presiding_class')}"] += 1
        for k, v in pc.items():
            diffs.append(f"- 進行役の印の変化 {k}：{v}件")
        changed_text = sum(1 for s in r["speeches"] if ok.get(s["seq"], {}).get("text") != s["text"])
        if changed_text:
            diffs.append(f"- 本文が変わった発言：{changed_text}件")
        og, ng = o["general_question"], r["general_question"]
        if (og.get("start_seq"), og.get("end_seq"), og.get("end_marker")) != (ng.get("start_seq"), ng.get("end_seq"), ng.get("end_marker")):
            diffs.append(f"- 一般質問の範囲：{og.get('start_seq')}〜{og.get('end_seq')}（{og.get('end_marker')}）→ {ng.get('start_seq')}〜{ng.get('end_seq')}（{ng.get('end_marker')}）")
        oi = {i["no"]: i for i in og.get("items", [])}
        for it in ng.get("items", []):
            a = sorted(x["seq"] for x in oi.get(it["no"], {}).get("answers", []))
            b = sorted(x["seq"] for x in it["answers"])
            if a != b:
                diffs.append(f"- 一般質問の項目{it['no']}（{it['questioner_label']}）の答弁：{a} → {b}")
        osec = [(s["kind"], s["start_seq"]) for s in o["sections"]]
        nsec = [(s["kind"], s["start_seq"]) for s in r["sections"]]
        if osec != nsec:
            diffs.append(f"- 区切り：{len(osec)} → {len(nsec)}（新しく出たもの {[x for x in nsec if x not in osec]}、消えたもの {[x for x in osec if x not in nsec]}）")
        for s in r["sections"]:
            b = s.get("budget_scope")
            ob = next((x.get("budget_scope") for x in o["sections"] if x["start_seq"] == s["start_seq"] and x.get("budget_scope")), None)
            if b and ob and (b["accounts"] != ob["accounts"] or b["is_range"] != ob["is_range"] or b["sides"] != ob["sides"]):
                diffs.append(f"- 区切り{s['id']}の予算の欄：会計{ob['accounts']}→{b['accounts']}、歳入歳出{ob['sides']}→{b['sides']}、範囲{ob['is_range']}→{b['is_range']}（引き継ぎ：{b.get('inherited_from_same_speech')}）")
        span = [s["seq"] for s in r["speeches"] if s.get("sections_spanned")]
        if span:
            diffs.append(f"- 2つの議題にまたがる発言の印（新）：発言 {span}")
        od = Counter(d.get("category", "（分けていない）") for d in o.get("disorder_words", []))
        nd = Counter(d["category"] for d in r["disorder_words"])
        diffs.append(f"- 議事の言葉の印：{dict(od)} → {dict(nd)}")
        ow = len(o.get("personal_info_withheld", []))
        nw = len(r["personal_info_withheld"])
        if ow != nw:
            diffs.append(f"- 非公開の段落：{ow} → {nw}")
        if r["general_question"].get("needs_check"):
            diffs.append(f"- 一般質問：{r['general_question']['needs_check']}")
        if r.get("dedupe") and not r["dedupe"]["is_representative"]:
            diffs.append(f"- 重複：{r['dedupe']['duplicate_of']} の重複（代表ではない）")
        L.extend(diffs)
        L.append("")
    with open(path, "w", encoding="utf-8") as f:
        f.write("\n".join(L) + "\n")


ADD_DIR = os.path.join(OUT, "追加")
ADD_FILES = [
    ("A1_R7予算0306.docx", DRIVE_C + r"\10 予算審査特別委員会\R70306予算.docx",
     "予算審査特別委員会の総括質疑の日（「総括質疑」12回）"),
    ("A2_R7予算0313.docx", DRIVE_C + r"\10 予算審査特別委員会\R70313予算.docx",
     "予算審査特別委員会の態度表明・採決の日（「態度表明」18回）"),
    ("A3_R7予算0310.docx", DRIVE_C + r"\10 予算審査特別委員会\R70310予算.docx",
     "予算審査特別委員会の款別の日で、「静粛」が4回出る（議事の言葉の印の試し）"),
    ("A4_R6厚生1203.docx", DRIVE_C + r"\02 厚生委員会\R6\1203厚生.docx",
     "欠席委員のいる常任委員会（副委員長が欠席）。態度表明・退席の言葉あり"),
    ("A5_R6厚生0919.docx", DRIVE_C + r"\02 厚生委員会\R6\0919厚生.docx",
     "欠席委員のいる常任委員会。「討論」「損害賠償」「暫時休憩」が出る"),
    ("A6_R5本会議0608.docx", DRIVE_H + r"\R5\23.06.08　文京区令和5年6月定例議会（1日目）.docx",
     "本会議（令和5年6月定例議会1日目）。人事案件（同意）・専決処分の表3つ・欠席議員・退席"),
    ("A7_R6本会議1212.docx", DRIVE_H + r"\R6\24.12.12　文京区令和6年11月定例議会（最終日）.docx",
     "本会議の最終日（令和6年11月定例議会）。人事案件（同意）・採決（起立）・表2つ・欠席議員"),
    ("A8_R5本会議0313.docx", DRIVE_H + r"\R5\23.03.13　文京区令和5年2月定例議会（最終日）.docx",
     "本会議の最終日（令和5年2月定例議会）。予算の委員長報告・採決・「抗議」・欠席議員"),
]


def main():
    import shutil
    os.makedirs(OUT, exist_ok=True)
    base = []
    for name, drive, reason in FILES:
        r, m = run_one(name, drive, reason)
        base.append(r)
        print(name, r["stats"]["speeches"], r["stats"]["gq_items"], r["stats"]["disorder_words"])
    dups = corpus_duplicates()
    with open(os.path.join(OUT, "重複・分割の一覧（ドライブ全体のファイル名から）.csv"), "w", encoding="utf-8-sig", newline="") as f:
        w = csv.writer(f)
        w.writerow(["種類", "フォルダ", "ファイル・件数"])
        w.writerows(dups)
    write_set(base, OUT, "委員会会議録の分解の試し（最初の10件・v0.2 で作り直し）", dups)
    common = "全件に共通：議事の言葉の印を「乱れた場面の候補」と「ふつうの使われ方」に分けた。重複の代表の印を付けた。表は相手方の欄だけ非公開にし、本文に表の位置と非公開の印を置くようにした。"
    compare_with_previous(base, os.path.join(OUT, "_前回_v0.2"), os.path.join(OUT, "前回との違い_v0.2→v0.3.md"),
                          "前回（v0.2）と今回（v0.3）の違い（最初の10件）", common)
    # 追加の試し（原本はドライブから読むだけ。写しを 追加/原本コピー に置く）
    add_copy = os.path.join(ADD_DIR, "原本コピー")
    os.makedirs(add_copy, exist_ok=True)
    add = []
    for name, drive, reason in ADD_FILES:
        dst = os.path.join(add_copy, name)
        if not os.path.exists(dst):
            shutil.copy2(drive, dst)
        r, m = run_one(name, drive, reason, copy_dir=add_copy)
        add.append(r)
        print(name, r["stats"]["speeches"], r["stats"]["gq_items"], r["stats"]["disorder_words"])
    write_set(add, ADD_DIR, "委員会・本会議の会議録の分解の追加の試し（8件）")
    compare_with_previous(add, os.path.join(OUT, "_前回_v0.2", "追加"), os.path.join(ADD_DIR, "前回との違い_v0.2→v0.3.md"),
                          "前回（v0.2）と今回（v0.3）の違い（追加の8件）", common)
    n, c = write_gq_csv(base + add, os.path.join(OUT, "委員会の一般質問一覧（内部用）.csv"))
    print("gq csv", n, c)


def write_summary(results, dups, ks, out_dir, title):
    L = []
    A = L.append
    A(f"# {title} まとめ\n")
    A(f"- 作成：ソラトブルー（Claude Code）　道具：tools/{TOOL_NAME} 版 {TOOL_VERSION}　AI は使っていない")
    A("- データベースには入れていない。GitHub にも上げない（data/ の中）。")
    A("- 1件ごとの中間ファイル：同じフォルダの `番号_名前.json`（原文の層・名簿・議題・発言・一般質問の項目など）\n")
    A("## 1. 一覧\n")
    A("| 件 | 会議 | 種類 | 日付 | 形式 | 発言 | 名簿で特定 | 一般質問の範囲 | 項目 | 要確認の項目 | 参照資料 | 非公開の段落 |")
    A("|---|---|---|---|---|---|---|---|---|---|---|---|")
    for r in results:
        st, mt, g = r["stats"], r["meeting"], r["general_question"]
        rate = f"{st['identified_speeches']}/{st['speeches']}（{st['identified_speeches'] * 100 / max(1, st['speeches']):.1f}%）"
        rng = f"発言{g['start_seq']}〜{g['end_seq']}（{g['end_marker']}）" if g.get("found") else "なし"
        A(f"| {r['file']['trial_name']} | {mt['committee_name'] or '本会議'}{mt['volume'] or ''} | {mt['committee_type'] or '本会議'} | "
          f"{mt['date_iso']} | {r['file']['format']}{'→Word変換' if r['file']['converted'] else ''} | {st['speeches']} | {rate} | {rng} | "
          f"{st['gq_items']} | {st['gq_items_needs_check']} | {st['references']} | {st['withheld_paragraphs']} |")
    tot = sum(r["stats"]["speeches"] for r in results)
    ok = sum(r["stats"]["identified_speeches"] for r in results)
    A(f"\n合計：発言 {tot} 件、名簿でフルネームが特定できたのは {ok} 件（{ok * 100 / tot:.1f}%）。\n")
    A("選んだ理由：\n")
    for r in results:
        A(f"- {r['file']['trial_name']}：{r['file']['selected_because']}（元：`{r['file']['drive_path']}`）")
    A("\n## 2. 文字の読み方（python-docx の p.text だけの場合との差）\n")
    A("| 件 | 全段落 | 表 | 表の中の段落 | p.text と違う段落 | 足りなかった文字 | EQ フィールド | ルビ |")
    A("|---|---|---|---|---|---|---|---|")
    for r in results:
        st = r["stats"]
        A(f"| {r['file']['trial_name']} | {st['paragraphs_total']} | {st['tables']} | {st['table_paragraphs']} | "
          f"{st['ptext_diff_paragraphs']} | {st['ptext_missing_chars']} | {st['eq_fields']} | {st['ruby']} |")
    A("\n## 3. 特定できなかった発言者（推測で埋めず空欄）\n")
    for r in results:
        un = Counter((s["label"], s["speaker"]["note"]) for s in r["speeches"] if not s["speaker"]["full_name"])
        for (lb, note), c in un.items():
            A(f"- {r['file']['trial_name']}：○{lb}（{c}件）… {note}")
    A("\n## 4. 一般質問の項目\n")
    for r in results:
        g = r["general_question"]
        if not g.get("found"):
            A(f"- {r['file']['trial_name']}：一般質問の時間なし（開始の宣言 0）")
            continue
        A(f"- {r['file']['trial_name']}：開始の宣言 {g['start_declarations']}・終了の宣言 {g['end_declarations']}。"
          f"範囲 発言{g['start_seq']}〜{g['end_seq']}（終わりの目印：{g['end_marker']}）、範囲内の発言 {g['speech_count']}"
          + (f"。委員長の宣言との照合：{g['needs_check']}" if g.get("needs_check") else
             ("。委員長の宣言と項目の数は合う" if g.get("declared_check") else "。件数の宣言なし")))
        for it in g["items"]:
            ans = "、".join(f"発言{a['seq']} {a['full_name'] or '（空欄）'}（{a['role']}）"
                           + ("［" + a["attribution"] + "］" if a.get("attribution") != "直前の質問者" else "")
                           for a in it["answers"]) or "なし"
            chk = "；".join(it["needs_check"]) if it["needs_check"] else "—"
            A(f"  - 項目{it['no']}：{it['questioner_full_name'] or it['questioner_label']}"
              f"{'（関連質問）' if it['related_question'] else ''}　項目名「{it['title'] or '（空欄）'}」"
              f"　質問の発言 {len(it['question_seqs'])}・答弁者 {ans}　要確認：{chk}")
    A("\n## 5. 議題（区切り）と、一般質問以外の印\n")
    for r in results:
        kinds = Counter(s["kind"] for s in r["sections"])
        mk = Counter(m["kind"] for m in r["markers"])
        A(f"- {r['file']['trial_name']}：区切り {len(r['sections'])}（{dict(kinds)}）／印 {dict(mk)}")
        for s in r["sections"]:
            if s.get("budget_scope"):
                b = s["budget_scope"]
                A(f"  - 区切り{s['id']} {s['kind']}：会計{b['accounts'] or '（書かれていない）'} 歳入歳出{b['sides'] or '—'} 款{b['kan']} 項{b['kou']} 範囲{'あり' if b['is_range'] else 'なし'}　「{b['wording'][:70]}」")
    A("\n## 6. 参照資料の書き方の種類（出てきた書き方のまま。数字は N）\n")
    forms = Counter()
    for r in results:
        for x in r["references"]:
            forms[x["form"]] += 1
    for f, c in forms.most_common():
        A(f"- {f}：{c}")
    A("\n## 7. 時刻の目印（開会・休憩・再開・閉会など。発言ごとの時刻は会議録にないので付けていない）\n")
    for r in results:
        A(f"- {r['file']['trial_name']}：" + "、".join(f"{t['hhmm']}{t['event']}（段落{t['para']}）" for t in r["times"]))
    A("\n## 8. 個人情報の扱い\n")
    for r in results:
        if r["personal_info_withheld"]:
            reasons = Counter(w["reason"] for w in r["personal_info_withheld"])
            A(f"- {r['file']['trial_name']}：{len(r['personal_info_withheld'])}段落を非公開（文字を保存せず印だけ）：{dict(reasons)}")
    A("- 表は、相手方・損害賠償・住所・氏名・生年月日のどれかを含むとき、表全体の文字を保存しない（印だけ）。表の文字は発言の本文に混ぜない。")
    A("- 区の提案説明に出てくる契約の相手方（会社名・所在地・代表者名）は残す（2026-10-26 先生の決定）。")
    A("- 原本コピー・変換済み docx には原文がそのまま入っている（ドライブの原本の写し）。")
    A("\n## 9. 発言の鍵（案）\n")
    A("- 案2（今回）：`会議の鍵|話し手の原文の表記（空白を除き NFKC）|本文の先頭20文字の指紋（空白・句読点を除いて NFKC にしたものの sha1 の先頭12桁）`。同じものが2つ以上あれば `#2` `#3` を付ける。")
    A("- 前の案はフルネーム（空欄なら表記）だったので、速報版で空欄だった話し手が正式版で特定されると鍵が変わった。原文の表記にしたので変わらない。弱い所は、表記そのものの誤記が直されたときと、先頭20字が直されたとき（そのときは、同じ会議・近い位置・指紋だけで照らし合わせる予備の手順が要る）。")
    A("- 会議の鍵：`委員会:委員会名:日付[:分冊]`（本会議は `本会議:本会議:日付`）。")
    A("| 件 | 発言 | #2 以降が要った発言 | 発言を1つ消したとき変わる鍵（この案） | 通し番号の鍵なら | 空欄の話し手が特定されたとき変わる鍵（前の案） | 同（この案） |")
    A("|---|---|---|---|---|---|---|")
    for k in ks:
        A(f"| {k['name']} | {k['speeches']} | {k['dup_suffix_needed']} | {k['changed_if_one_deleted_fp']} | {k['changed_if_one_deleted_ordinal']} | "
          f"{k['changed_if_blank_speakers_identified_old_fullname_key']} | {k['changed_if_blank_speakers_identified_label_key']} |")
    A("\n## 10. 重複・分割ファイル（ドライブ全体のファイル名から。自動でまとめていない）\n")
    for kind, c in Counter(d[0] for d in dups).items():
        A(f"- {kind}：{c}件（一覧は `重複・分割の一覧（ドライブ全体のファイル名から）.csv`）")
    for r in results:
        A(f"- {r['file']['trial_name']}：{r['file'].get('duplicate_check')}")
    A("\n## 10b. 議事の言葉の印（文言と位置だけ。評価は付けない。一覧は 議事の言葉の印の一覧.csv）\n")
    tot_c, tot_n = Counter(), Counter()
    for r in results:
        c = Counter(d["word"] for d in r["disorder_words"] if d["category"] == "乱れた場面の候補")
        n = Counter(d["word"] for d in r["disorder_words"] if d["category"] != "乱れた場面の候補")
        tot_c.update(c)
        tot_n.update(n)
        A(f"- {r['file']['trial_name']}：乱れた場面の候補 {sum(c.values())}件 {dict(c)}／ふつうの使われ方 {sum(n.values())}件 {dict(n)}")
    A(f"- 合計：候補 {sum(tot_c.values())}件 {dict(tot_c)}／ふつう {sum(tot_n.values())}件 {dict(tot_n)}")
    A("- 分け方（機械の決まり。評価ではない）：進行役の注意の言葉・「動議」「議事進行」「異議あり」・手続き以外の声のト書き（「はい」「関連」「異議なし」などは除く）・"
      "進行役が求めた／本人が申し出た撤回や取り消し・それらの近くの暫時休憩 などを候補にした")
    A("\n## 10c. 2つの議題にまたがる発言\n")
    for r in results:
        for s in r["sections"]:
            if s.get("starts_mid_speech"):
                x = s["starts_mid_speech"]
                A(f"- {r['file']['trial_name']} 発言{x['seq']}：{x['sentence_index'] + 1}文目（{x['char_offset']}文字目）から区切り{s['id']}「{s['kind']}」（「{x['sentence_head']}…」）")
    A("\n## 11. 困った書式・道具が自動で判断した箇所\n")
    for r in results:
        for x in r["format_issues"]:
            A(f"- {r['file']['trial_name']}：{x}")
    A("\n## 12. 要確認の一覧\n")
    for r in results:
        for s in r["speeches"]:
            for fl in s.get("flags", []):
                A(f"- {r['file']['trial_name']} 発言{s['seq']}（○{s['label']}）：{fl}")
        for it in r["general_question"].get("items", []):
            for c in it["needs_check"]:
                A(f"- {r['file']['trial_name']} 一般質問の項目{it['no']}（{it['questioner_label']}）：{c}")
    with open(os.path.join(out_dir, "まとめ.md"), "w", encoding="utf-8") as f:
        f.write("\n".join(L) + "\n")


if __name__ == "__main__":
    main()
