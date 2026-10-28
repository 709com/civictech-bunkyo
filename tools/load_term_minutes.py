#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
load_term_minutes.py  --  分解の道具の中間ファイル（今期分）を、データベースに入れる命令書（SQL）を作る

【これは何をするものか】
tools/split_committee_minutes.py が作った中間ファイル（data/今期分/*.json。本会議と委員会の全文）を読み、
マイグレーション 20261027120000（会議録の全文の表）で作った表と、今ある表
（meetings・sections・speeches）に入れるための命令書（SQL）を作ります。
設計案：data/設計案_会議録データベース_2026-10-27.md（2026-10-27 先生の決定つき）。

  ・この道具は命令書を作るだけです。データベースにはつなぎません。
    入れるのは、先生の承認のあと、別に psql で流します（試し刷りは --mode dry_run で rollback 付き）。
  ・命令書には会議録の本文が入るので、data/ に置き、GitHub には上げません。

【今ある一般質問97件との関係（設計案⑨①：IDを保ったまま全文にする）】
  ・本会議36日分（一般質問だけ入っている会議）は、元ファイルのハッシュで中間ファイルと結び付けます。
  ・今の発言381件は、新しく作らず、中間ファイルの発言と本文の一致（全角半角と空白をそろえて比べる）で結び付け、
    行（ID）と本文はそのまま残し、番号（speech_order）を中間ファイルの番号に付け直して、足す列だけを埋めます。
    1件でも結び付かなければ止まります。
  ・今の区切り97件（質問者1人分）もそのまま残し、一般質問の範囲の「本体」にします。
    その間にある議長の進行の発言は、新しい区切り（種類「一般質問の進行」・分析の対象外）に入れます。
  ・general_questions（画面用の写し）・論点の表には触りません。

【入れる前の確かめ（設計案4章・5章。1つでも外れたら止まり、命令書を作りません）】
  ・中間ファイルの道具の版がそろっている（既定 0.3.6 以上。混ざっていたら止める）／代表のファイルだけ／
    原文に戻せる確認（verify_rebuild）が合格／会議の鍵・元ファイルのハッシュ・発言の鍵が重複しない。
  ・非公開の段落：丸ごと隠した段落の数（本文が空）と withheld_reason の行の数が一致し、本文が1文字も入っていない／
    一部だけ隠した段落の数と masked_count の行の数が一致し、本文の「［非公開」の数が masked_count と一致／
    合計が personal_info_withheld の件数と一致／発言の本文の置き換えの数が段落の側と一致。
  ・契約の相手方の代表者の氏名が入らない（中間ファイルの値は「［非公開：代表者の氏名］」か空であること）。
  ・請願者・陳情者の欄が入らない（中間ファイルの欄が空で「保存しない」の印であること）。
  ・確認表（tools/committee_regression_check.py の結果 data/今期分/確認表の結果.csv）が全部通っている。
  ・見逃しの網：本文を「〒」「生年月日」「…年…月…日生」「代表取締役＋人名らしい文字」の型で探し、一覧にする。
    --mode apply のときは、人が見て --net-reviewed で一覧を渡すまで止まる（推測で隠さず、止めて人が見る）。

【使い方（黒い画面に打ち込む）】
  1. 試し刷り用の命令書を作る（最後が rollback。データベースに何も残らない）:
      py -3 tools/load_term_minutes.py --mode dry_run
  2. 本番用の命令書を作る（最後が commit。流すのは先生の承認のあと）:
      py -3 tools/load_term_minutes.py --mode apply --net-reviewed data/今期分/網の結果_確認済み.csv
  書き出す先の既定は data/load_term_minutes.sql。件数の見込みは data/load_term_minutes_counts.json。
"""

import argparse
import csv
import glob
import hashlib
import json
import os
import re
import sys
import unicodedata
import uuid
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DEFAULT_IN = ROOT / "data" / "今期分"
DEFAULT_OUT = ROOT / "data" / "load_term_minutes.sql"
DEFAULT_OUT_JSON = ROOT / "data" / "out.json"
DEFAULT_PLENARY_DIR = ROOT / "honkaigi-kaigiroku"
TOOL_NAME = "load_term_minutes.py"
TOOL_VERSION = "0.1.0 (2026-10-27 今期分の全文を入れる命令書。設計案 第2版)"
MIN_SOURCE_VERSION = (0, 3, 6)

# load_minutes.py と同じ「種」。同じ中間ファイルからは、何度作っても同じ ID になる。
ID_NAMESPACE = uuid.UUID("6f0e1c7a-5b0d-4f6e-9a57-b0c7b1f2d3e4")
MASK = "［非公開"

# 分解の道具の話し手の区分 → 今の speeches.speaker_kind（4区分。変えない）
SPEAKER_KIND = {"議員": "member", "理事者": "executive", "議長": "chair", "委員長": "chair",
                "事務局": "other", "講師・参考人": "other", "不明": "other"}
# 名簿の区分 → 人の名簿の種類
COUNCIL_ROSTER = {"出席委員", "欠席委員", "委員外議員", "出席議員", "欠席議員"}
OFFICIAL_ROSTER = {"出席説明員": "理事者", "事務局職員": "事務局", "講師・参考人（付議事件の欄）": "講師・参考人"}
ROSTER_SECTIONS = COUNCIL_ROSTER | set(OFFICIAL_ROSTER) | {"欠員"}
OFFICIAL_KIND_PRIORITY = ["理事者", "事務局", "講師・参考人"]
SPEAKER_TO_OFFICIAL_KIND = {"理事者": "理事者", "事務局": "事務局", "講師・参考人": "講師・参考人"}
TIME_EVENTS = {"開会", "開議", "休憩", "再開", "閉会", "散会"}
# 請願文書表の欄 → 列。請願者・陳情者の欄は列を作らない（入れない）
PETITION_FIELDS = {"受理年月日及び番号": "received", "件名": "title", "紹介議員": "introducing_members",
                   "請願の要旨": "summary", "付託委員会": "referred_committee", "請願理由": "reason",
                   "陳情理由": "reason", "請願事項": "requested_items"}
PETITIONER_FIELDS = {"請願者", "陳情者"}
TITLE_SOURCES = {"質問", "答弁", "言葉から推定"}
BODY_TYPES = {"常任委員会", "特別委員会（調査など）", "議会運営委員会", "予算審査特別委員会",
              "決算審査特別委員会", "全員協議会"}

# 見逃しの網（推測で隠すのではなく、止めて人が見るための型）
KANJI_NUM = "0-9０-９〇一二三四五六七八九十百元"
NET_PATTERNS = [
    ("郵便番号", re.compile(r"〒")),
    ("生年月日", re.compile(r"生年月日")),
    ("…年…月…日生", re.compile(rf"[{KANJI_NUM}]+年[{KANJI_NUM}]+月[{KANJI_NUM}]+日生")),
    ("代表取締役＋人名らしい文字", re.compile(r"代表取締役(?:社長)?[\s　]*(?!［)[一-鿿々]{2,5}")),
]


def make_id(*parts) -> str:
    return str(uuid.uuid5(ID_NAMESPACE, "|".join(str(p) for p in parts)))


def lit(value) -> str:
    """Python の値を SQL に書ける形にする。None と空文字は null。"""
    if value is None:
        return "null"
    if isinstance(value, bool):
        return "true" if value else "false"
    if isinstance(value, int):
        return str(value)
    if isinstance(value, str) and value == "":
        return "null"
    return "'" + str(value).replace("'", "''") + "'"


def lit_text(value) -> str:
    """空文字も空文字のまま入れる（本文の列など、not null の列用）。"""
    if value is None:
        return "''"
    return "'" + str(value).replace("'", "''") + "'"


def lit_arr(values, kind="text") -> str:
    if values is None:
        return "null"
    items = []
    for v in values:
        if kind == "int":
            items.append(str(int(v)))
        else:
            items.append(lit_text(v))
    return f"array[{', '.join(items)}]::{kind}[]" if items else f"'{{}}'::{kind}[]"


def lit_json(value) -> str:
    return lit_text(json.dumps(value, ensure_ascii=False)) + "::jsonb"


def nz(value):
    """空文字を None にする。"""
    if isinstance(value, str) and value.strip() == "":
        return None
    return value


def alias_key(text: str) -> str:
    """public.member_alias_key と同じそろえ方（NFKC にして空白を全部取る）。"""
    return re.sub(r"\s+", "", unicodedata.normalize("NFKC", text or ""))


def body_key(text: str) -> str:
    """今の発言と結び付けるときの比べ方（全角半角と空白をそろえる）。本文そのものは変えない。"""
    return alias_key(text)


def version_tuple(text: str):
    m = re.match(r"\s*(\d+)\.(\d+)\.(\d+)", text or "")
    return tuple(int(x) for x in m.groups()) if m else (0, 0, 0)


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


class Stop(Exception):
    """入れる前の確かめで外れたとき。命令書は作らない。"""


class Builder:
    def __init__(self, files, existing_questions, plenary_dir: Path, mode: str):
        self.files = files                      # [(path, data, sha256_of_json)]
        self.existing_questions = existing_questions
        self.plenary_dir = plenary_dir
        self.mode = mode
        self.out = []
        self.counts = Counter()
        self.warnings = []
        self.net_hits = []
        self.run_id = make_id("ingest_run", TOOL_VERSION, mode,
                              hashlib.sha256("".join(s for _, _, s in files).encode()).hexdigest())

    # ---- 書き出しの小道具 -------------------------------------------------
    def w(self, sql: str):
        self.out.append(sql)

    def insert_rows(self, table: str, cols: list, rows: list, batch: int = 400, suffix: str = ""):
        """複数行の insert を、ほどよい大きさに分けて書く。rows は SQL の値の文字列のタプル。"""
        if not rows:
            return
        head = f"insert into public.{table} ({', '.join(cols)}) values\n"
        for i in range(0, len(rows), batch):
            chunk = rows[i:i + batch]
            self.w(head + ",\n".join("(" + ", ".join(r) + ")" for r in chunk) + suffix + ";")
        self.counts[table] += len(rows)

    # ---- 入れる前の確かめ ---------------------------------------------------
    def precheck(self):
        versions = Counter(d["tool"]["version"].split(" ")[0] for _, d, _ in self.files)
        if len(versions) != 1:
            raise Stop(f"中間ファイルの道具の版が混ざっています: {dict(versions)}")
        v = next(iter(versions))
        if version_tuple(v) < MIN_SOURCE_VERSION:
            raise Stop(f"中間ファイルの道具の版が古すぎます: {v}（{'.'.join(map(str, MIN_SOURCE_VERSION))} 以上が必要）")
        self.source_version = v
        keys, shas, speech_keys = Counter(), Counter(), Counter()
        for path, d, _ in self.files:
            name = os.path.basename(path)
            if d["tool"].get("ai_used"):
                raise Stop(f"{name}: AI を使った中間ファイルです")
            if not d["dedupe"]["is_representative"]:
                raise Stop(f"{name}: 代表でないファイルが混ざっています（目録には載せる作りだが、今期分では想定外）")
            if not d["verify_rebuild"]["ok"]:
                raise Stop(f"{name}: 原文に戻せる確認（verify_rebuild）が不合格です")
            if d["file"]["format"] != "docx":
                raise Stop(f"{name}: 形式が docx ではありません: {d['file']['format']}")
            keys[d["meeting"]["meeting_id"]] += 1
            shas[d["file"]["sha256_source"]] += 1
            for sp in d["speeches"]:
                speech_keys[sp["key"]] += 1
            if [s["seq"] for s in d["speeches"]] != list(range(1, len(d["speeches"]) + 1)):
                raise Stop(f"{name}: 発言の番号が1からの連番になっていません")
            if [s["id"] for s in d["sections"]] != list(range(len(d["sections"]))):
                raise Stop(f"{name}: 区切りの番号が0からの連番になっていません")
            if d["meeting"]["meeting_id"] != d["dedupe"]["meeting_key"]:
                raise Stop(f"{name}: 会議の鍵が meeting と dedupe で違います")
        for label, c in (("会議の鍵", keys), ("元ファイルのハッシュ", shas), ("発言の鍵", speech_keys)):
            dup = [k for k, n in c.items() if n > 1]
            if dup:
                raise Stop(f"{label}が重複しています: {dup[:5]}")
        self.check_personal_info()

    def check_personal_info(self):
        total_whole = total_partial = total_listed = 0
        for path, d, _ in self.files:
            name = os.path.basename(path)
            listed = d["personal_info_withheld"]
            listed_paras = Counter(x["para"] for x in listed)
            whole = [r for r in d["raw_paragraphs"] if r.get("withheld")]
            partial = [r for r in d["raw_paragraphs"] if r.get("partly_withheld")]
            for r in whole:
                if r.get("text"):
                    raise Stop(f"{name} 段落{r['para']}: 丸ごと隠した段落に本文が入っています")
                if r.get("partly_withheld"):
                    raise Stop(f"{name} 段落{r['para']}: 丸ごと隠した印と一部だけ隠した印の両方があります")
            for r in partial:
                n = (r.get("text") or "").count(MASK)
                if n != r["partly_withheld"]["count"] or n < 1:
                    raise Stop(f"{name} 段落{r['para']}: 「［非公開」の数（{n}）が隠した数"
                               f"（{r['partly_withheld']['count']}）と一致しません")
            for r in d["raw_paragraphs"]:
                if not r.get("partly_withheld") and MASK in (r.get("text") or ""):
                    raise Stop(f"{name} 段落{r['para']}: 印の無い段落に「［非公開」の置き換えがあります")
            if len(whole) + len(partial) != len(listed):
                raise Stop(f"{name}: 非公開の段落の数（丸ごと{len(whole)}＋一部{len(partial)}）が"
                           f" personal_info_withheld の件数（{len(listed)}）と一致しません")
            if sorted(listed_paras) != sorted(r["para"] for r in whole + partial):
                raise Stop(f"{name}: 非公開の段落の番号が personal_info_withheld と一致しません")
            if sum(1 for x in listed if x.get("partial")) != len(partial):
                raise Stop(f"{name}: 一部だけ隠した段落の数が personal_info_withheld と一致しません")
            # 発言の本文の側：置き換えの数＝丸ごと隠した段落の「続き」の数＋一部だけ隠した数
            by_seq = defaultdict(list)
            for r in d["raw_paragraphs"]:
                if r.get("seq") is not None:
                    by_seq[r["seq"]].append(r)
            for sp in d["speeches"]:
                expect, prev = 0, False
                for r in sorted(by_seq.get(sp["seq"], []), key=lambda r: r["para"]):
                    cur = bool(r.get("withheld"))
                    if cur and not prev:
                        expect += 1
                    prev = cur
                    expect += (r.get("partly_withheld") or {}).get("count", 0)
                if sp["text"].count(MASK) != expect:
                    raise Stop(f"{name} 発言{sp['seq']}: 本文の置き換えの数（{sp['text'].count(MASK)}）が"
                               f"段落の側（{expect}）と一致しません")
            # 契約の相手方：代表者の氏名は入れない
            for x in d["contract_parties"]:
                rn = x.get("representative_name")
                if rn not in (None, "", "［非公開：代表者の氏名］"):
                    raise Stop(f"{name}: 契約の相手方の代表者の氏名が隠されていません（段落{x.get('para')}）")
                if x.get("individual") and (nz(x.get("company")) or nz(x.get("address"))):
                    raise Stop(f"{name}: 個人の契約の相手方に企業名・所在地が入っています（段落{x.get('para')}）")
            # 請願者・陳情者の欄は入れない
            for p in d["petition_documents"]:
                for f in p["fields"]:
                    if f["field"] in PETITIONER_FIELDS and (f.get("lines") or not f.get("withheld")):
                        raise Stop(f"{name}: 請願者・陳情者の欄に中身があります（段落{f.get('para')}）")
            total_whole += len(whole)
            total_partial += len(partial)
            total_listed += len(listed)
        self.pi_totals = {"whole": total_whole, "partial": total_partial, "listed": total_listed}

    def scan_net(self):
        """見逃しの網。本文（発言・段落）を型で探して一覧にする。"""
        for path, d, _ in self.files:
            name = os.path.basename(path)
            texts = [("段落", r["para"], r.get("text") or "") for r in d["raw_paragraphs"]]
            for kind, pos, text in texts:
                for label, pat in NET_PATTERNS:
                    for m in pat.finditer(text):
                        a, b = max(m.start() - 15, 0), min(m.end() + 15, len(text))
                        self.net_hits.append({"file": name, "where": kind, "pos": pos, "pattern": label,
                                              "context": text[a:b].replace("\n", "／")})

    # ---- 今の97件との結び付け ------------------------------------------------
    def link_existing(self):
        """今の本会議36日分を、元ファイルのハッシュで中間ファイルと結び付ける。"""
        by_file = defaultdict(list)
        for q in self.existing_questions:
            by_file[q["source_file"]].append(q)
        self.existing = {}       # 中間ファイルの sha256 → 今の会議の情報
        for source_file, qs in by_file.items():
            path = self.plenary_dir / source_file
            if not path.is_file():
                raise Stop(f"今の会議の元ファイルが見つかりません: {path}")
            sha = sha256_file(path)
            speeches, sections = [], []
            order = 0
            for q in sorted(qs, key=lambda x: x["question_order"]):
                sec_id = make_id("section", source_file, q["question_order"])
                sections.append({"id": sec_id, "question_order": q["question_order"],
                                 "questioner": q["questioner_name"]})
                for sp in q["speeches"]:
                    order += 1
                    speeches.append({"id": make_id("speech", source_file, order), "order": order,
                                     "section_id": sec_id, "text": sp["text"], "kind": sp["speaker_kind"],
                                     "name": sp["name"], "question_order": q["question_order"]})
            self.existing[sha] = {"source_file": source_file, "meeting_id": make_id("meeting", source_file),
                                  "meeting_date": qs[0]["meeting_date"], "speeches": speeches,
                                  "sections": sections}
        self.plenary_names = {}
        if self.plenary_dir.is_dir():
            for p in self.plenary_dir.glob("*.docx"):
                self.plenary_names[sha256_file(p)] = p.name

    # ---- 命令書の本体 ---------------------------------------------------------
    def build(self):
        self.precheck()
        self.scan_net()
        self.link_existing()
        w = self.w
        w("-- load_term_minutes.py が作った命令書。会議録の本文を含むので、GitHub には上げないこと。")
        w(f"-- 道具: {TOOL_NAME} {TOOL_VERSION}／中間ファイル {len(self.files)}件（分解の道具 {self.source_version}）")
        w("set client_encoding = 'UTF8';")
        if self.mode != "body":
            w("begin;")
        w("set local statement_timeout = 0;")
        self.w_prechecks()
        self.w_ingest_run()
        self.w_bodies()
        self.w_source_files()
        self.w_officials()
        self.w_meetings()
        self.w_postchecks()
        if self.mode == "dry_run":
            w("-- 試し刷り：ここで取り消す（データベースには何も残らない）")
            w("rollback;")
        elif self.mode == "apply":
            w("commit;")
        return "\n\n".join(self.out) + "\n"

    def w_prechecks(self):
        n_sp = sum(len(e["speeches"]) for e in self.existing.values())
        n_sec = sum(len(e["sections"]) for e in self.existing.values())
        self.expected_existing = {"meetings": len(self.existing), "sections": n_sec, "speeches": n_sp}
        rows = []
        for e in self.existing.values():
            for sp in e["speeches"]:
                rows.append(f"({lit(sp['id'])}::uuid, {lit(e['meeting_id'])}::uuid, {lit(sp['section_id'])}::uuid,"
                            f" {sp['order']}, {lit(hashlib.md5(sp['text'].encode('utf-8')).hexdigest())})")
        self.w(
            "-- 前提の確かめ：マイグレーション 20261027120000 が当たっていること／今の会議・区切り・発言が想定どおりあること\n"
            "do $$\nbegin\n"
            "  if to_regclass('public.minutes_paragraphs') is null then\n"
            "    raise exception 'マイグレーション 20261027120000 が当たっていません';\n  end if;\n"
            "  if exists (select 1 from public.source_files) then\n"
            "    raise exception 'source_files にすでに行があります（二重投入のおそれ。止めます）';\n  end if;\n"
            "end;\n$$;")
        self.w("create temporary table _existing_speeches (id uuid, meeting_id uuid, section_id uuid,"
               " speech_order integer, body_md5 text) on commit drop;")
        self.insert_temp("_existing_speeches", rows)
        self.w(
            "do $$\ndeclare\n  v_n integer;\nbegin\n"
            "  select count(*) into v_n from _existing_speeches e\n"
            "    join public.speeches s on s.id = e.id and s.meeting_id = e.meeting_id\n"
            "     and s.section_id = e.section_id and s.speech_order = e.speech_order\n"
            "     and md5(s.body) = e.body_md5;\n"
            f"  if v_n <> {n_sp} then\n"
            f"    raise exception '今の発言のうち、想定どおりのものが % 件しかありません（想定 {n_sp}）', v_n;\n  end if;\n"
            "  select count(*) into v_n from public.speeches s\n"
            "   where s.meeting_id in (select distinct meeting_id from _existing_speeches);\n"
            f"  if v_n <> {n_sp} then\n"
            "    raise exception '今の36日分の会議に、想定していない発言があります（% 件）', v_n;\n  end if;\n"
            "  select count(*) into v_n from public.sections s\n"
            "   where s.meeting_id in (select distinct meeting_id from _existing_speeches);\n"
            f"  if v_n <> {n_sec} then\n"
            "    raise exception '今の36日分の会議の区切りの数が想定と違います（% 件）', v_n;\n  end if;\n"
            "end;\n$$;")

    def insert_temp(self, table, rows, batch=500):
        for i in range(0, len(rows), batch):
            self.w(f"insert into {table} values\n" + ",\n".join(rows[i:i + batch]) + ";")

    def w_ingest_run(self):
        self.w("insert into public.ingest_runs (id, tool_name, tool_version, source_tool_versions, file_count,"
               " counts_before, mode, note)\n"
               f"select {lit(self.run_id)}, {lit(TOOL_NAME)}, {lit(TOOL_VERSION)}, {lit_arr([self.source_version])},"
               f" {len(self.files)},\n"
               "  jsonb_build_object('meetings', (select count(*) from public.meetings),"
               " 'sections', (select count(*) from public.sections),"
               " 'speeches', (select count(*) from public.speeches),"
               " 'general_questions', (select count(*) from public.general_questions)),\n"
               f"  {lit('dry_run' if self.mode != 'apply' else 'apply')},"
               f" {lit('今期分（令和5年5月〜）の中間ファイル。本会議74日分を含む全文')};")

    def w_bodies(self):
        bodies = {}
        for _, d, _ in self.files:
            m = d["meeting"]
            if m["body"] == "本会議":
                name, btype = "本会議", "本会議"
            else:
                name, btype = m["committee_name"], m["committee_type"]
                if btype not in BODY_TYPES:
                    raise Stop(f"会議体の種類が想定外です: {name} {btype}")
            folder = None
            fm = re.search(r"[\\/](\d{2})[\s　]*" + re.escape(name) + r"[\\/]", d["file"]["drive_path"] or "")
            if fm:
                folder = fm.group(1)
            prev = bodies.get(name)
            if prev and prev[0] != btype:
                raise Stop(f"同じ会議体に2つの種類があります: {name} {prev[0]} / {btype}")
            if not prev or (folder and not prev[1]):
                bodies[name] = (btype, folder)
        self.body_ids = {n: make_id("meeting_body", n) for n in bodies}
        rows = [(lit(self.body_ids[n]), lit(n), lit(t), lit(f)) for n, (t, f) in sorted(bodies.items())]
        self.insert_rows("meeting_bodies", ["id", "name", "body_type", "drive_folder_no"], rows)

    def w_source_files(self):
        rows = []
        self.source_file_ids = {}
        for path, d, json_sha in self.files:
            f, m, dd = d["file"], d["meeting"], d["dedupe"]
            sid = make_id("source_file", f["sha256_source"])
            self.source_file_ids[path] = sid
            rows.append((lit(sid), lit(f["trial_name"]), lit(f["drive_path"]), lit(f["format"]),
                         lit(bool(f["converted"])), lit(f["conversion"]), lit(f["sha256_source"]),
                         lit(f["size_source"]), lit(f["parsed_docx"]), lit(f["sha256_parsed_docx"]),
                         "'seishiki'", lit(m["meeting_id"]), lit(m["volume"]), lit(nz(f.get("date_from_name"))),
                         lit(m["date_source"]), lit(m["date_check"]), lit(f["selected_because"]),
                         lit(bool(dd["is_representative"])), lit(dd["same_text_as_representative"]),
                         lit(dd["rule"]), lit_json(d["format_issues"]), lit(d["tool"]["name"]),
                         lit(d["tool"]["version"]), lit(json_sha), lit(self.run_id)))
        self.insert_rows("source_files", [
            "id", "file_name", "drive_path", "format", "converted", "conversion", "sha256_source",
            "size_source", "parsed_file", "sha256_parsed", "source_type", "meeting_key", "volume",
            "date_from_name", "date_source", "date_check", "selected_because", "is_representative",
            "same_text_as_representative", "dedupe_rule", "format_issues", "tool_name", "tool_version",
            "intermediate_sha256", "ingest_run_id"], rows)

    def w_officials(self):
        """理事者・事務局・講師の名簿。名前の字のまま（空白だけそろえる）で1人1行。字体の揺れではまとめない。"""
        people = {}
        for _, d, _ in self.files:
            for r in d["roster"]:
                kind = OFFICIAL_ROSTER.get(r["section"])
                if kind and nz(r.get("name")):
                    key = alias_key(r["name"])
                    people.setdefault(key, {"name": key, "kinds": set()})["kinds"].add(kind)
            for sp in d["speeches"]:
                kind = SPEAKER_TO_OFFICIAL_KIND.get(sp["speaker"]["kind"])
                if kind and nz(sp["speaker"].get("full_name")):
                    key = alias_key(sp["speaker"]["full_name"])
                    people.setdefault(key, {"name": key, "kinds": set()})["kinds"].add(kind)
        self.official_ids = {}
        rows, alias_rows = [], []
        multi = 0
        for key, p in sorted(people.items()):
            kinds = [k for k in OFFICIAL_KIND_PRIORITY if k in p["kinds"]]
            note = None
            if len(kinds) > 1:
                multi += 1
                note = "名簿の区分が複数（" + "・".join(kinds) + "）。最初のものを種類にした"
            oid = make_id("official", key)
            self.official_ids[key] = oid
            rows.append((lit(oid), lit(p["name"]), lit(kinds[0]), "true", lit(note)))
            alias_rows.append((lit(make_id("official_alias", key)), lit(oid), lit(p["name"])))
        if multi:
            self.warnings.append(f"理事者などの名簿で、区分が複数ある人 {multi}人（種類は 理事者＞事務局＞講師 の順で1つにした）")
        self.insert_rows("officials", ["id", "name", "official_kind", "is_provisional", "note"], rows)
        self.insert_rows("official_aliases", ["id", "official_id", "alias"], alias_rows)

    # ---- 会議ごと ---------------------------------------------------------------
    def w_meetings(self):
        new_meetings, upd_meetings = [], []
        self.per_meeting = []
        for path, d, _ in self.files:
            f, m = d["file"], d["meeting"]
            sha = f["sha256_source"]
            ex = self.existing.get(sha)
            if m["body"] == "本会議":
                source_file = self.plenary_names.get(sha) or f["trial_name"]
                if ex and ex["source_file"] != source_file:
                    raise Stop(f"今の会議の元ファイル名が一致しません: {ex['source_file']} / {source_file}")
                sm = re.search(r"(令和[\d元]+年\d+月(?:定例|臨時|招集)議会)", f["trial_name"])
                session_name = sm.group(1) if sm else None
                dm = re.search(r"（(\d+日目|最終日)）", f["trial_name"])
                day_label = dm.group(1) if dm else None
                day_no = int(re.match(r"\d+", day_label).group()) if day_label and day_label[0].isdigit() else None
                kind, committee_name, body = "plenary", None, "本会議"
            else:
                source_file = f["trial_name"]
                session_name = day_label = day_no = None
                kind, committee_name, body = "committee", m["committee_name"], m["committee_name"]
            if ex and ex["meeting_date"] != m["date_iso"]:
                raise Stop(f"今の会議と中間ファイルの日付が違います: {source_file}")
            meeting_id = ex["meeting_id"] if ex else make_id("meeting", source_file)
            common = {
                "meeting_key": m["meeting_id"], "meeting_body_id": self.body_ids[body],
                "session_kind": m["session"]["kind"], "day_number": day_no, "volume": m["volume"],
                "place": m["place"], "title_raw": m["title_raw"], "date_text": m["date_text"],
                "current_source_file_id": self.source_file_ids[path],
            }
            if ex:
                upd_meetings.append((meeting_id, common))
            else:
                new_meetings.append((meeting_id, kind, committee_name, m["date_iso"], session_name, day_label,
                                     source_file, common))
            self.per_meeting.append((path, d, meeting_id, source_file, ex))

        # 今の36日分：足した列を埋めて、中身の範囲を全文にする
        for meeting_id, c in upd_meetings:
            self.w("update public.meetings set\n"
                   f"  meeting_key = {lit(c['meeting_key'])}, meeting_body_id = {lit(c['meeting_body_id'])},"
                   f" session_kind = {lit(c['session_kind'])}, day_number = {lit(c['day_number'])},\n"
                   f"  volume = {lit(c['volume'])}, place = {lit(c['place'])}, title_raw = {lit(c['title_raw'])},"
                   f" date_text = {lit(c['date_text'])},\n"
                   f"  current_source_file_id = {lit(c['current_source_file_id'])}, content_scope = 'full'\n"
                   f"where id = {lit(meeting_id)};")
        self.counts["meetings_updated"] = len(upd_meetings)
        rows = []
        for meeting_id, kind, committee_name, date, session_name, day_label, source_file, c in new_meetings:
            council = (f"(select id from public.council_sessions where name = {lit(session_name)})"
                       if session_name else "null")
            rows.append((lit(meeting_id), lit(kind), lit(committee_name), lit(date) + "::date", lit(session_name),
                         lit(day_label), council, "'seishiki'", lit(source_file), lit(c["meeting_key"]),
                         lit(c["meeting_body_id"]), lit(c["session_kind"]), lit(c["day_number"]),
                         lit(c["volume"]), lit(c["place"]), lit(c["title_raw"]), lit(c["date_text"]),
                         lit(c["current_source_file_id"]), "'full'"))
        self.insert_rows("meetings", [
            "id", "kind", "committee_name", "meeting_date", "session_name", "day_label", "council_session_id",
            "source_type", "source_file", "meeting_key", "meeting_body_id", "session_kind", "day_number",
            "volume", "place", "title_raw", "date_text", "current_source_file_id", "content_scope"], rows)

        for path, d, meeting_id, source_file, ex in self.per_meeting:
            MeetingWriter(self, path, d, meeting_id, source_file, ex).write()

    def w_postchecks(self):
        c = self.counts
        n_whole, n_partial = self.pi_totals["whole"], self.pi_totals["partial"]
        expect_meetings = len(self.files)
        expect_speeches = sum(len(d["speeches"]) for _, d, _ in self.files)
        self.w(
            "-- 入れた件数と決まりが想定どおりか、確定する前に確かめる\n"
            "do $$\ndeclare\n  v record;\nbegin\n"
            "  select\n"
            "    (select count(*) from public.meetings where content_scope = 'full') as meetings_full,\n"
            "    (select count(*) from public.meetings where current_source_file_id is not null) as meetings_linked,\n"
            "    (select count(*) from public.speeches where source_file_id is not null) as speeches,\n"
            "    (select count(*) from public.minutes_paragraphs where withheld_reason is not null) as whole,\n"
            "    (select count(*) from public.minutes_paragraphs where withheld_reason is not null and text <> '') as whole_text,\n"
            "    (select count(*) from public.minutes_paragraphs where masked_count >= 1) as partial,\n"
            "    (select count(*) from public.speeches where speech_order < 1) as bad_order,\n"
            f"    (select count(*) from public.speeches s where s.id in (select id from _existing_speeches)"
            " and s.speech_key is null) as existing_unkeyed\n"
            "  into v;\n"
            f"  if v.meetings_full <> {expect_meetings} or v.meetings_linked <> {expect_meetings}"
            f" or v.speeches <> {expect_speeches}\n"
            f"     or v.whole <> {n_whole} or v.whole_text <> 0 or v.partial <> {n_partial}"
            " or v.bad_order <> 0 or v.existing_unkeyed <> 0 then\n"
            "    raise exception '入れた件数・決まりが想定と違います: %', row_to_json(v);\n"
            "  end if;\nend;\n$$;")
        self.w("update public.ingest_runs set counts_after = jsonb_build_object("
               "'meetings', (select count(*) from public.meetings),"
               " 'sections', (select count(*) from public.sections),"
               " 'speeches', (select count(*) from public.speeches),"
               " 'minutes_paragraphs', (select count(*) from public.minutes_paragraphs),"
               " 'general_questions', (select count(*) from public.general_questions))\n"
               f"where id = {lit(self.run_id)};")


class MeetingWriter:
    """1つの会議の、区切り・発言・段落・名簿などを書く。"""

    def __init__(self, b: Builder, path, d, meeting_id, source_file, ex):
        self.b, self.path, self.d = b, path, d
        self.meeting_id, self.source_file, self.ex = meeting_id, source_file, ex
        self.mkey = d["meeting"]["meeting_id"]
        self.sfid = b.source_file_ids[path]
        self.name = os.path.basename(path)

    def sid(self, *parts):
        return make_id(*parts)

    def write(self):
        d = self.d
        self.speech_ids = {}
        self.matched = {}                 # 中間ファイルの番号 → 今の発言
        if self.ex:
            self.match_existing()
        for sp in d["speeches"]:
            if sp["seq"] in self.matched:
                self.speech_ids[sp["seq"]] = self.matched[sp["seq"]]["id"]
            else:
                self.speech_ids[sp["seq"]] = self.sid("speech-full", self.source_file, sp["seq"])
        self.write_attendance()
        self.write_range()
        self.write_sections()
        self.write_speeches()
        self.write_range_links()
        self.write_paragraphs()
        self.write_times()
        self.write_agenda()
        self.write_markers_votes()
        self.write_stances_refs()
        self.write_contracts_petitions()
        self.write_disorder()
        self.write_items()

    # ---- 今の発言との結び付け ----
    def match_existing(self):
        gq = self.d["general_question"]
        if not gq.get("found"):
            raise Stop(f"{self.name}: 今の一般質問がある会議なのに、中間ファイルに一般質問の範囲がありません")
        by_text = defaultdict(list)
        for sp in self.d["speeches"]:
            by_text[body_key(sp["text"])].append(sp)
        last = 0
        for e in self.ex["speeches"]:
            cands = [sp for sp in by_text.get(body_key(e["text"]), []) if sp["seq"] > last]
            if not cands:
                raise Stop(f"{self.name}: 今の発言（{e['name']}・{e['order']}番目）が中間ファイルで見つかりません")
            sp = cands[0]
            if not (gq["start_seq"] <= sp["seq"] <= gq["end_seq"]):
                raise Stop(f"{self.name}: 今の発言（{e['order']}番目）が一般質問の範囲の外にあります")
            want = {"member": "議員", "executive": "理事者"}.get(e["kind"])
            if want and sp["speaker"]["kind"] != want:
                raise Stop(f"{self.name}: 今の発言（{e['order']}番目）の話し手の区分が違います")
            self.matched[sp["seq"]] = e
            last = sp["seq"]
        self.b.counts["existing_speeches_linked"] += len(self.matched)

    # ---- 名簿 ----
    def write_attendance(self):
        rows = []
        self.att_by_name = defaultdict(list)
        for i, r in enumerate(self.d["roster"]):
            if r["section"] not in ROSTER_SECTIONS:
                self.b.warnings.append(f"{self.name}: 名簿の区分が想定外の行を入れなかった"
                                       f"（区分「{r['section']}」・段落{r['para']}）")
                self.b.counts["roster_skipped"] += 1
                continue
            aid = self.sid("attendance", self.mkey, i)
            name = nz(r.get("name"))
            member_sql = official_sql = "null"
            status = "'unconfirmed'"
            if name and r["section"] in COUNCIL_ROSTER:
                member_sql = f"public.find_member_id({lit(name)})"
                status = (f"case when public.find_member_id({lit(name)}) is null"
                          " then 'unconfirmed' else 'confirmed' end")
            elif name and r["section"] in OFFICIAL_ROSTER:
                official_sql = lit(self.b.official_ids[alias_key(name)])
                status = "'confirmed'"
            seat = r.get("seat") if isinstance(r.get("seat"), int) else None
            rows.append((lit(aid), lit(self.meeting_id), str(i), lit(r["section"]), lit(nz(r.get("role"))),
                         lit(name), lit(nz(r.get("name_key"))), lit(seat), lit(nz(r.get("affiliation"))),
                         lit(r.get("para")), lit(r.get("raw")), lit(nz(r.get("note"))), member_sql, official_sql,
                         status))
            if name:
                self.att_by_name[(alias_key(name), r["section"])].append(aid)
                self.att_by_name[(alias_key(name), None)].append(aid)
        self.b.insert_rows("meeting_attendance", [
            "id", "meeting_id", "roster_order", "roster_section", "role_raw", "name_raw", "name_key_loose",
            "seat_number", "affiliation", "para", "raw_line", "note", "member_id", "official_id",
            "match_status"], rows)

    # ---- 一般質問の範囲（区切りより先に作る。発言との結び付けはあとで） ----
    def write_range(self):
        gq = self.d["general_question"]
        self.range_id = None
        if not gq.get("found"):
            return
        self.range_id = self.sid("gq_range", self.mkey)
        needs = gq.get("needs_check")
        if isinstance(needs, list):
            needs = "／".join(str(x) for x in needs) or None
        self.b.insert_rows("general_question_ranges", [
            "id", "meeting_id", "start_seq", "end_seq", "start_wording", "end_marker", "end_wording",
            "start_declarations", "end_declarations", "speech_count", "declared", "declared_check",
            "needs_check", "notices"], [(
                lit(self.range_id), lit(self.meeting_id), lit(gq.get("start_seq")), lit(gq.get("end_seq")),
                lit(gq.get("start_wording")), lit(gq.get("end_marker")), lit(gq.get("end_wording")),
                lit(gq.get("start_declarations")), lit(gq.get("end_declarations")), lit(gq.get("speech_count")),
                lit_json(gq.get("declared") or []),
                lit_json(gq["declared_check"]) if gq.get("declared_check") else "null",
                lit(needs), lit_json(gq.get("notices") or []))])

    # ---- 区切り ----
    def write_sections(self):
        d, gq = self.d, self.d["general_question"]
        secs = []     # (start_seq, tiebreak, dict)
        self.section_of_tool = {}   # 中間ファイルの区切りの番号 → DB の区切り（置き換えた一般質問は None）
        # 今の発言が入っている中間ファイルの区切り（ふつうは「一般質問」1つ。道具が途中を「その他」に
        # 切っている日もある＝2025-02-13）は、今の区切り（質問者1人分）と進行の区切りに置き換える
        self.replaced = set()
        existing_secs = {}
        if self.ex:
            self.replaced = {sp["section_id"] for sp in d["speeches"] if sp["seq"] in self.matched}
            other = sorted(k for k in {d["sections"][i]["kind"] for i in self.replaced} if k != "一般質問")
            if "一般質問" not in {d["sections"][i]["kind"] for i in self.replaced}:
                raise Stop(f"{self.name}: 今の発言の入る区切りに「一般質問」がありません")
            if other:
                self.b.warnings.append(f"{self.name}: 今の一般質問の発言が、道具の「{'・'.join(other)}」の区切りにも"
                                       "入っていた（今の区切りと進行の区切りに置き換えた）")
                self.b.counts["replaced_non_gq_tool_sections"] += 1
            for s in self.ex["sections"]:
                existing_secs[s["id"]] = {"seqs": [], "tool": None}
        for s in d["sections"]:
            if s["id"] in self.replaced:
                self.section_of_tool[s["id"]] = None
                continue
            kind_detail = s["kind"]
            sec_id = self.sid("section-full", self.source_file, s["id"])
            self.section_of_tool[s["id"]] = sec_id
            mid = s.get("starts_mid_speech") or {}
            in_range = (self.range_id and gq.get("start_seq") is not None
                        and gq["start_seq"] <= s["start_seq"] <= gq["end_seq"])
            role = None
            if in_range:
                role = "main" if kind_detail == "一般質問" else "interposed"
            elif kind_detail == "一般質問" and self.range_id:
                role = "main"
            secs.append((s["start_seq"], 0, s["id"], {
                "id": sec_id, "kind_detail": kind_detail, "start_seq": s["start_seq"], "end_seq": s["end_seq"],
                "start_para": s.get("start_para"), "start_sentence": mid.get("sentence_index"),
                "start_char": mid.get("char_offset"), "start_sentence_head": mid.get("sentence_head"),
                "range_role": role, "source_section_no": s["id"], "new": True}))
        # 置き換えた区切り：今の区切り（質問者1人分）と、その間の進行の区切り
        self.speech_section = {}
        if self.ex:
            gap, gap_tool = [], None
            for sp in d["speeches"]:
                if sp["section_id"] not in self.replaced:
                    continue
                if gap and (sp["seq"] in self.matched or sp["section_id"] != gap_tool):
                    secs.append(self.gap_section(gap, gap_tool))
                    gap = []
                if sp["seq"] in self.matched:
                    e = self.matched[sp["seq"]]
                    es = existing_secs[e["section_id"]]
                    es["seqs"].append(sp["seq"])
                    if es["tool"] is None:
                        es["tool"] = sp["section_id"]
                    self.speech_section[sp["seq"]] = e["section_id"]
                else:
                    gap.append(sp["seq"])
                    gap_tool = sp["section_id"]
            if gap:
                secs.append(self.gap_section(gap, gap_tool))
            for s in self.ex["sections"]:
                es = existing_secs[s["id"]]
                if not es["seqs"]:
                    raise Stop(f"{self.name}: 今の区切り（{s['questioner']}）の発言が見つかりません")
                secs.append((min(es["seqs"]), 1, -1, {
                    "id": s["id"], "kind_detail": "一般質問", "start_seq": min(es["seqs"]), "end_seq": max(es["seqs"]),
                    "start_para": None, "range_role": "main", "source_section_no": es["tool"],
                    "new": False}))
        secs.sort(key=lambda x: (x[0], x[1], x[2]))
        rows, upd = [], []
        kinds = self.b.section_kinds_base
        for order, (_, _, _, s) in enumerate(secs, start=1):
            if s["kind_detail"] not in kinds:
                raise Stop(f"{self.name}: 区切りの種類が種類の表にありません: {s['kind_detail']}")
            base = kinds[s["kind_detail"]]
            s["order"] = order
            if s["new"]:
                rows.append((lit(s["id"]), lit(self.meeting_id), str(order), lit(base), lit(s["kind_detail"]),
                             lit(s["start_seq"]), lit(s["end_seq"]), lit(s.get("start_para")),
                             lit(s.get("start_sentence")), lit(s.get("start_char")), lit(s.get("start_sentence_head")),
                             lit(self.range_id if s["range_role"] else None), lit(s["range_role"]),
                             lit(s["source_section_no"])))
            else:
                upd.append(s)
        if upd:
            ids = ", ".join(lit(s["id"]) for s in upd)
            # 番号の重複禁止にぶつからないよう、いったん負の番号にしてから付け直す
            self.b.w(f"update public.sections set section_order = -section_order where id in ({ids});")
            vals = ",\n".join(
                f"({lit(s['id'])}::uuid, {s['order']}, {s['start_seq']}, {s['end_seq']}, {s['source_section_no']})"
                for s in upd)
            self.b.w("update public.sections s set section_order = v.ord, kind_detail = '一般質問',"
                     " start_seq = v.st, end_seq = v.en,\n"
                     f"  range_id = {lit(self.range_id)}, range_role = 'main', source_section_no = v.src\n"
                     f"from (values\n{vals}\n) as v(id, ord, st, en, src)\nwhere s.id = v.id;")
            self.b.counts["sections_updated"] += len(upd)
        self.b.insert_rows("sections", [
            "id", "meeting_id", "section_order", "kind", "kind_detail", "start_seq", "end_seq", "start_para",
            "start_sentence", "start_char", "start_sentence_head", "range_id", "range_role",
            "source_section_no"], rows)
        self.db_sections = {s["id"]: s for _, _, _, s in secs}

    def gap_section(self, seqs, tool_sec_no):
        sec_id = self.sid("section-gap", self.source_file, seqs[0])
        for q in seqs:
            self.speech_section[q] = sec_id
        self.b.counts["gap_sections"] += 1
        return (seqs[0], 0, -2, {
            "id": sec_id, "kind_detail": "一般質問の進行", "start_seq": seqs[0], "end_seq": seqs[-1],
            "start_para": None, "range_role": "progress", "source_section_no": tool_sec_no, "new": True})

    def section_for(self, tool_sec_id, seq=None):
        """中間ファイルの区切りの番号（と発言の番号）から、DB の区切りの ID。"""
        if tool_sec_id is None:
            return None
        if tool_sec_id in self.replaced:
            return self.speech_section.get(seq)
        return self.section_of_tool.get(tool_sec_id)

    # ---- 発言 ----
    def write_speeches(self):
        rows, upd = [], []
        for sp in self.d["speeches"]:
            spk = sp["speaker"]
            detail = spk["kind"]
            if detail not in SPEAKER_KIND:
                raise Stop(f"{self.name} 発言{sp['seq']}: 話し手の区分が想定外です: {detail}")
            kind = SPEAKER_KIND[detail]
            full = nz(spk.get("full_name"))
            official_id = None
            if detail in SPEAKER_TO_OFFICIAL_KIND and full:
                official_id = self.b.official_ids[alias_key(full)]
            att = None
            if full:
                cands = self.att_by_name.get((alias_key(full), spk.get("roster_section")), []) \
                    or self.att_by_name.get((alias_key(full), None), [])
                if len(set(cands)) == 1:
                    att = cands[0]
            kp = sp["key_parts"]
            common = [lit(sp["key"]), lit(kp["head20_sha1"]), lit(kp["dup_no"]), lit(sp["label"]), lit(detail),
                      lit(att), lit(official_id), lit(nz(spk.get("how"))), lit(nz(spk.get("note"))),
                      lit(sp.get("is_presiding")), lit(sp.get("presiding_class")),
                      lit(bool(sp.get("related_question"))), lit(sp["chars"]), lit(sp["chars_nospace"]),
                      lit(sp["para_start"]), lit(sp["para_end"]), lit(sp["line_start"]), lit(sp["line_end"]),
                      lit(bool(sp.get("sections_spanned"))),
                      lit_arr(sp.get("sections_spanned"), "int") if sp.get("sections_spanned") else "null",
                      lit(bool(sp.get("in_general_question"))),
                      lit_arr(sp.get("flags")) if sp.get("flags") else "null", lit(self.sfid)]
            if sp["seq"] in self.matched:
                e = self.matched[sp["seq"]]
                upd.append((e["id"], sp["seq"], common))
                continue
            section_id = self.section_for(sp["section_id"], sp["seq"])
            if section_id is None:
                raise Stop(f"{self.name} 発言{sp['seq']}: 区切りが決まりません")
            member = (f"public.find_member_id({lit(full)})" if full and kind in ("member", "chair") else "null")
            name_raw = full or sp["label"]
            rows.append([lit(self.speech_ids[sp["seq"]]), lit(self.meeting_id), lit(section_id), str(sp["seq"]),
                         lit(kind), member, lit_text(name_raw), lit(nz(spk.get("role"))), "null",
                         lit_text(sp["text"])] + common)
        cols_extra = ["speech_key", "key_head20_sha1", "key_dup_no", "speaker_label_raw", "speaker_detail",
                      "attendance_id", "official_id", "identify_how", "identify_note", "is_presiding",
                      "presiding_class", "is_related_question", "chars", "chars_nospace", "para_start",
                      "para_end", "line_start", "line_end", "starts_mid_section", "sections_spanned",
                      "in_general_question", "flags", "source_file_id"]
        if upd:
            ids = ", ".join(lit(e_id) for e_id, _, _ in upd)
            self.b.w(f"update public.speeches set speech_order = -speech_order where id in ({ids});")
            vals = ",\n".join(f"({lit(e_id)}::uuid, {seq}, " + ", ".join(c) + ")" for e_id, seq, c in upd)
            casts = {"key_dup_no": "::integer", "attendance_id": "::uuid", "official_id": "::uuid",
                     "is_presiding": "::boolean", "is_related_question": "::boolean", "chars": "::integer",
                     "chars_nospace": "::integer", "para_start": "::integer", "para_end": "::integer",
                     "line_start": "::integer", "line_end": "::integer", "starts_mid_section": "::boolean",
                     "sections_spanned": "::integer[]", "in_general_question": "::boolean",
                     "flags": "::text[]", "source_file_id": "::uuid"}
            sets = ",\n  ".join(f"{c} = v.{c}{casts.get(c, '')}" for c in cols_extra)
            # 本文・話し手の名前・区切りはそのまま（今の画面・検索・論点の位置を変えない）
            self.b.w(f"update public.speeches s set speech_order = v.seq,\n  {sets}\n"
                     f"from (values\n{vals}\n) as v(id, seq, {', '.join(cols_extra)})\nwhere s.id = v.id;")
            self.b.counts["speeches_updated"] += len(upd)
        self.b.insert_rows("speeches", [
            "id", "meeting_id", "section_id", "speech_order", "speaker_kind", "member_id", "speaker_name_raw",
            "speaker_role_raw", "stated_faction", "body"] + cols_extra, [tuple(r) for r in rows], batch=200)

    def write_range_links(self):
        if not self.range_id:
            return
        gq = self.d["general_question"]
        self.b.w(f"update public.general_question_ranges set start_speech_id = {lit(self.speech_ids.get(gq['start_seq']))},"
                 f" end_speech_id = {lit(self.speech_ids.get(gq['end_seq']))} where id = {lit(self.range_id)};")

    # ---- 原文の段落 ----
    def write_paragraphs(self):
        stage = {}
        for x in self.d["stage_directions"]:
            if x["para"] in stage:
                self.b.counts["stage_dup_para"] += 1
                continue
            stage[x["para"]] = x
        rows = []
        for r in self.d["raw_paragraphs"]:
            st = stage.get(r["para"], {})
            pw = r.get("partly_withheld") or {}
            text = r.get("text") or ""
            rows.append((lit(self.sid("para", self.mkey, r["para"])), lit(self.meeting_id), lit(self.sfid),
                         str(r["para"]), lit(r.get("pd_index")), lit(r["part"]), lit_text(text),
                         lit(self.speech_ids.get(r.get("seq"))),
                         lit_arr(r["in_table"], "int") if r.get("in_table") else "null",
                         lit(self.speech_ids.get(st.get("inside_seq"))), lit(self.speech_ids.get(st.get("after_seq"))),
                         lit(r.get("also_contains")), lit(bool(r.get("ptext_differs"))),
                         lit(r.get("ptext_missing_chars")), lit_json(r["notes"]) if r.get("notes") else "null",
                         lit(r.get("withheld")), lit(r.get("chars") if r.get("withheld") else None),
                         lit(pw.get("reason")), lit(pw.get("count")), lit(pw.get("orig_chars"))))
        self.b.insert_rows("minutes_paragraphs", [
            "id", "meeting_id", "source_file_id", "para", "pd_index", "part", "text", "speech_id", "table_cell",
            "stage_inside_speech_id", "stage_after_speech_id", "also_contains", "ptext_differs",
            "ptext_missing_chars", "notes", "withheld_reason", "withheld_orig_chars", "masked_reason",
            "masked_count", "masked_orig_chars"], rows, batch=500)

    def write_times(self):
        rows = []
        for t in self.d["times"]:
            ev = t.get("event") if t.get("event") in TIME_EVENTS else None
            if t.get("event") and not ev:
                raise Stop(f"{self.name}: 時刻の出来事が想定外です: {t.get('event')}")
            rows.append((lit(self.sid("time", self.mkey, t["para"])), lit(self.meeting_id), str(t["para"]), lit(ev),
                         lit(t.get("hh")), lit(t.get("mm")), lit(t.get("hhmm")), lit_text(t["text"]),
                         lit(t.get("possible_typo"))))
        self.b.insert_rows("meeting_times", ["id", "meeting_id", "para", "event", "hh", "mm", "hhmm", "text_raw",
                                             "possible_typo"], rows)

    # ---- 議題 ----
    def write_agenda(self):
        rows = []
        self.agenda_ids = {}
        for i, a in enumerate(self.d["agenda_planned"]):
            aid = self.sid("agenda", self.mkey, i)
            self.agenda_ids[i] = aid
            rows.append((lit(aid), lit(self.meeting_id), str(i), lit(a.get("para")),
                         lit_arr(a["paras"], "int") if a.get("paras") else "null", lit(nz(a.get("label"))),
                         lit(a.get("level")), lit(nz(a.get("title"))), lit_text(a["raw"]),
                         lit_arr(a.get("refs")) if a.get("refs") else "null"))
        self.b.insert_rows("agenda_items", ["id", "meeting_id", "item_order", "para", "paras", "label", "level",
                                            "title", "raw", "refs"], rows)
        links = set()
        for s in self.d["sections"]:
            for i in s["agenda_refs"]:
                if i not in self.agenda_ids:
                    raise Stop(f"{self.name}: 区切りの議題の番号が範囲の外です: {i}")
                if s["id"] in self.replaced:
                    continue      # 置き換えた一般質問の区切り（今の区切り）には議題を付けない
                links.add((self.section_of_tool[s["id"]], self.agenda_ids[i]))
        self.b.insert_rows("section_agenda_items", ["section_id", "agenda_item_id"],
                           [(lit(a), lit(b)) for a, b in sorted(links)])

    # ---- 議事の言葉の印・採決 ----
    def write_markers_votes(self):
        # 区切りの中の印から、どの区切りかを引く（同じ発言・同じ文言・同じ種類の印は順に割り当てる）
        sec_of = defaultdict(list)
        for s in self.d["sections"]:
            for m in s["markers"]:
                sec_of[(m["seq"], m["wording"], m["kind"])].append(s["id"])
        rows, votes = [], []
        last_method = {}
        for i, m in enumerate(self.d["markers"]):
            lst = sec_of.get((m["seq"], m["wording"], m["kind"]))
            tool_sec = lst.pop(0) if lst else None
            if tool_sec is None:
                self.b.counts["markers_without_section"] += 1
            section_id = self.section_for(tool_sec, m["seq"])
            agenda = self.agenda_ids.get(m["agenda_index"]) if "agenda_index" in m else None
            if "agenda_index" in m and agenda is None:
                raise Stop(f"{self.name}: 印の議題の番号が範囲の外です: {m['agenda_index']}")
            rows.append((lit(self.sid("marker", self.mkey, i)), lit(self.meeting_id), lit(self.speech_ids[m["seq"]]),
                         lit(section_id), str(i), lit(m.get("sent")), lit(m["kind"]), lit_text(m["wording"]),
                         lit_arr(m["refs"]) if m.get("refs") else "null", lit(m.get("opens")), lit(agenda)))
            # 採決：結果の文言の印1つで1行。方法の文言は、同じ区切りの中の直前の「採決」の印（無ければ空）
            if m["kind"] == "採決":
                last_method[tool_sec] = m["wording"]
            elif m["kind"] == "採決結果":
                votes.append((lit(self.sid("vote", self.mkey, i)), lit(section_id), lit(self.speech_ids[m["seq"]]),
                              str(len(votes) + 1), lit(self.meeting_id), lit(last_method.pop(tool_sec, None)),
                              lit_text(m["wording"])))
        self.b.insert_rows("procedural_markers", ["id", "meeting_id", "speech_id", "section_id", "marker_order",
                                                  "sentence_index", "kind", "wording", "refs", "opens",
                                                  "agenda_item_id"], rows)
        self.b.insert_rows("votes", ["id", "section_id", "speech_id", "vote_order", "meeting_id", "method_wording",
                                     "result_wording"], votes)
        bs_rows = []
        for s in self.d["sections"]:
            sc = s.get("budget_scope")
            if not sc:
                continue
            section_id = self.section_of_tool.get(s["id"])
            if section_id is None:
                raise Stop(f"{self.name}: 置き換えた一般質問の区切りに予算・決算の欄があります")
            bs_rows.append((lit(self.sid("budget_scope", self.mkey, s["id"])), lit(section_id), "1",
                            lit_text(sc["wording"]), lit_arr(sc.get("accounts") or []), lit_arr(sc.get("sides") or []),
                            lit_json(sc.get("kan")), lit_json(sc.get("kou")), lit(bool(sc.get("is_range"))),
                            lit(bool(sc.get("inherited_from_same_speech")))))
        self.b.insert_rows("section_budget_scopes", ["id", "section_id", "scope_order", "wording", "accounts",
                                                     "sides", "kan", "kou", "is_range",
                                                     "inherited_from_same_speech"], bs_rows)

    def write_stances_refs(self):
        rows = []
        for s in self.d["sections"]:
            for j, x in enumerate(s.get("stances_as_stated") or []):
                section_id = self.section_for(s["id"], x["seq"])
                full = nz(x.get("full_name"))
                rows.append((lit(self.sid("stance", self.mkey, s["id"], j)), lit(section_id),
                             lit(self.speech_ids.get(x["seq"])), str(j + 1), lit(nz(x.get("label"))), lit(full),
                             f"public.find_member_id({lit(full)})" if full else "null", lit_text(x["wording"])))
        self.b.insert_rows("stated_stances", ["id", "section_id", "speech_id", "stance_order", "label_raw",
                                              "full_name", "member_id", "wording"], rows)
        rows = []
        per_speech = Counter()
        for i, x in enumerate(self.d["references"]):
            per_speech[x["seq"]] += 1
            rows.append((lit(self.sid("reference", self.mkey, i)), lit(self.speech_ids[x["seq"]]),
                         lit(self.section_for(x.get("section_id"), x["seq"])), str(per_speech[x["seq"]]),
                         lit_text(x["wording"]), lit(x.get("form")), lit(x.get("section_kind")),
                         lit(x.get("by_presider"))))
        self.b.insert_rows("speech_references", ["id", "speech_id", "section_id", "ref_order", "wording", "form",
                                                 "section_kind", "by_presider"], rows)

    def write_contracts_petitions(self):
        rows = []
        for i, x in enumerate(self.d["contract_parties"]):
            individual = bool(x.get("individual"))
            # 代表者の氏名は入れない（列も無い）
            rows.append((lit(self.sid("contract", self.mkey, i)), lit(self.meeting_id),
                         lit(self.speech_ids.get(x.get("seq"))), str(i + 1), lit(x.get("para")),
                         lit(None if individual else nz(x.get("company"))),
                         lit(None if individual else nz(x.get("address"))), lit(nz(x.get("representative_title"))),
                         lit(individual), lit(nz(x.get("note"))), lit(nz(x.get("bill_nearby"))),
                         lit_arr(x.get("section_refs")) if x.get("section_refs") else "null"))
        self.b.insert_rows("contract_parties", ["id", "meeting_id", "speech_id", "party_order", "para", "company",
                                                "address", "representative_title", "is_individual", "note",
                                                "bill_nearby", "section_refs"], rows)
        rows = []
        for i, p in enumerate(self.d["petition_documents"]):
            cols = {}
            extra = {}
            for fdef in p["fields"]:
                field = fdef["field"]
                if field in PETITIONER_FIELDS:
                    continue      # 請願者・陳情者の欄は入れない
                text = "\n".join(fdef.get("lines") or [])
                col = PETITION_FIELDS.get(field)
                if col and col not in cols:
                    cols[col] = text
                else:
                    extra[field] = text
            rows.append((lit(self.sid("petition", self.mkey, i)), lit(self.meeting_id), str(i + 1), lit_text(p["kind"]),
                         lit(p.get("para_start")), lit(p.get("para_end")), lit(nz(cols.get("received"))),
                         lit(nz(cols.get("title"))), lit(nz(cols.get("introducing_members"))),
                         lit(nz(cols.get("summary"))), lit(nz(cols.get("referred_committee"))),
                         lit(nz(cols.get("reason"))), lit(nz(cols.get("requested_items"))), lit_json(extra)))
        self.b.insert_rows("petition_documents", ["id", "meeting_id", "doc_order", "kind", "para_start", "para_end",
                                                  "received", "title", "introducing_members", "summary",
                                                  "referred_committee", "reason", "requested_items",
                                                  "extra_fields"], rows)

    def write_disorder(self):
        rows = []
        for i, x in enumerate(self.d["disorder_words"]):
            rows.append((lit(self.sid("disorder", self.mkey, i)), lit(self.meeting_id), str(i + 1), lit(x["where"]),
                         lit(x.get("para")), lit(self.speech_ids.get(x.get("after_seq"))),
                         lit(self.speech_ids.get(x.get("seq"))), lit(x.get("sentence_index")), lit(nz(x.get("label"))),
                         lit(x.get("by_presider")), lit_text(x["wording"]), lit_text(x["word"]),
                         lit_arr(x.get("signals") or []), lit_text(x["category"]), lit(x.get("retract")),
                         lit(x.get("caution"))))
        self.b.insert_rows("disorder_candidates", ["id", "meeting_id", "cand_order", "where_found", "para",
                                                   "after_speech_id", "speech_id", "sentence_index", "label_raw",
                                                   "by_presider", "wording", "word", "signals", "category",
                                                   "retract", "caution"], rows)

    # ---- 一般質問の項目 ----
    def write_items(self):
        gq = self.d["general_question"]
        if not self.range_id:
            return
        items, links = [], []
        used_sections = set()
        for it in gq.get("items") or []:
            iid = self.sid("gq_item", self.mkey, it["no"])
            section_id = None
            if self.ex:
                q0 = it["question_seqs"][0] if it.get("question_seqs") else None
                section_id = self.speech_section.get(q0)
                if not section_id or section_id in used_sections or \
                        self.db_sections.get(section_id, {}).get("new", True):
                    raise Stop(f"{self.name}: 項目{it['no']}を今の区切り（質問者1人分）と1対1で結べません")
                used_sections.add(section_id)
            ts = nz(it.get("title_source"))
            if ts is not None and ts not in TITLE_SOURCES:
                raise Stop(f"{self.name}: 項目名の出どころが想定外です: {ts}")
            full = nz(it.get("questioner_full_name"))
            reasons = it.get("needs_check") if isinstance(it.get("needs_check"), list) else (
                [it["needs_check"]] if it.get("needs_check") else [])
            items.append((lit(iid), lit(self.range_id), str(it["no"]), lit(section_id), lit(nz(it.get("questioner_label"))),
                          lit(full), f"public.find_member_id({lit(full)})" if full else "null",
                          lit(bool(it.get("related_question"))), lit(nz(it.get("title"))), lit(nz(it.get("title_rule"))),
                          lit(ts), lit(nz(it.get("title_field"))),
                          lit_arr(it.get("titles_found")) if it.get("titles_found") else "null",
                          lit(it.get("title_from_seq")), lit(nz(it.get("first_sentence"))),
                          lit(bool(it.get("needs_check_flag"))), lit_arr(reasons) if reasons else "null",
                          lit(nz(it.get("count_hint")))))
            seen = set()
            for q in it.get("question_seqs") or []:
                if (iid, q) not in seen:
                    seen.add((iid, q))
                    links.append((lit(iid), lit(self.speech_ids[q]), "'question'", "null"))
            for a in it.get("answers") or []:
                if (iid, a["seq"]) not in seen:
                    seen.add((iid, a["seq"]))
                    links.append((lit(iid), lit(self.speech_ids[a["seq"]]), "'answer'", lit(nz(a.get("attribution")))))
        if self.ex and len(used_sections) != len(self.ex["sections"]):
            raise Stop(f"{self.name}: 項目の数（{len(used_sections)}）が今の区切りの数（{len(self.ex['sections'])}）と違います")
        self.b.insert_rows("general_question_items", [
            "id", "range_id", "item_no", "section_id", "questioner_label", "questioner_full_name", "member_id",
            "is_related_question", "title", "title_rule", "title_source", "title_field", "titles_found",
            "title_from_seq", "first_sentence", "needs_check", "needs_check_reasons", "count_hint"], items)
        self.b.insert_rows("general_question_item_speeches", ["item_id", "speech_id", "role", "attribution"], links)


# 区切りの種類の表（マイグレーションの section_kinds と同じ中身）。細目 → 3分類
SECTION_KINDS_BASE = {
    "開会・委員会運営": "other", "付議事件の件名": "other", "日程": "other", "提案説明": "other", "議案": "other",
    "議案質疑": "other", "付託議案審査": "other", "委員長報告": "other", "委員会報告": "other",
    "理事者報告": "report_qa", "請願・陳情": "other", "付託請願審査": "other", "代表質問": "other",
    "一般質問": "general_question", "一般質問の進行": "other", "総括質疑": "other", "款別質疑": "other",
    "態度表明": "other", "採決": "other", "選挙・人事": "other", "研究会・講演": "other", "委員会記録": "other",
    "その他": "other", "閉会": "other",
}


def check_regression(in_dir: Path):
    """確認表の結果（tools/committee_regression_check.py が書いたもの）が全部通っているか。"""
    path = in_dir / "確認表の結果.csv"
    if not path.is_file():
        raise Stop(f"確認表の結果が見つかりません: {path}")
    with open(path, encoding="utf-8-sig", newline="") as f:
        rows = list(csv.DictReader(f))
    if not rows:
        raise Stop("確認表の結果が空です")
    col = next((c for c in rows[0] if c in ("判定", "結果", "result", "ok")), None)
    if col is None:
        raise Stop(f"確認表の結果の判定の列が分かりません: {list(rows[0])}")
    bad = [r for r in rows if str(r[col]).strip() not in ("合格", "OK", "ok", "True", "true", "○")]
    if bad:
        raise Stop(f"確認表の結果に不合格が {len(bad)} 件あります")
    return len(rows)


def main():
    ap = argparse.ArgumentParser(description="今期分の中間ファイルを、データベースに入れる命令書（SQL）を作る")
    ap.add_argument("--in-dir", default=str(DEFAULT_IN), help=f"中間ファイルのフォルダ（既定: {DEFAULT_IN}）")
    ap.add_argument("-o", "--out", default=str(DEFAULT_OUT), help=f"書き出す命令書（既定: {DEFAULT_OUT}）")
    ap.add_argument("--existing-json", default=str(DEFAULT_OUT_JSON),
                    help=f"今の97件を入れたときの JSON（既定: {DEFAULT_OUT_JSON}）")
    ap.add_argument("--plenary-dir", default=str(DEFAULT_PLENARY_DIR),
                    help=f"本会議の会議録 docx のフォルダ（既定: {DEFAULT_PLENARY_DIR}）")
    ap.add_argument("--mode", choices=["dry_run", "apply", "body"], default="dry_run",
                    help="dry_run＝最後が rollback（既定）／apply＝最後が commit／body＝begin も終わりも書かない（試し刷りの組み立て用）")
    ap.add_argument("--net-reviewed", help="見逃しの網の一覧を人が確かめた CSV（apply のとき必須。網に掛かったものが全部載っていること）")
    ap.add_argument("--skip-regression-check", action="store_true", help="確認表の結果の確かめを飛ばす（試し刷りのときだけ）")
    args = ap.parse_args()

    in_dir = Path(args.in_dir)
    paths = [p for p in sorted(glob.glob(str(in_dir / "*.json"))) if not os.path.basename(p).startswith("_")]
    if not paths:
        sys.exit(f"中間ファイルが見つかりません: {in_dir}")
    try:
        if args.skip_regression_check:
            if args.mode == "apply":
                raise Stop("本番（apply）では確認表の結果の確かめを飛ばせません")
            n_reg = None
        else:
            n_reg = check_regression(in_dir)
        files = []
        for p in paths:
            raw = Path(p).read_bytes()
            files.append((p, json.loads(raw.decode("utf-8")), hashlib.sha256(raw).hexdigest()))
        existing = json.loads(Path(args.existing_json).read_text(encoding="utf-8"))
        b = Builder(files, existing, Path(args.plenary_dir), args.mode)
        b.section_kinds_base = SECTION_KINDS_BASE
        sql = b.build()
    except Stop as e:
        sys.exit(f"止めました（命令書は作っていません）: {e}")

    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    net_path = out.with_name(out.stem + "_網の結果.csv")
    with open(net_path, "w", encoding="utf-8-sig", newline="") as f:
        wcsv = csv.DictWriter(f, fieldnames=["file", "where", "pos", "pattern", "context"])
        wcsv.writeheader()
        wcsv.writerows(b.net_hits)
    if b.net_hits and args.mode == "apply":
        if not args.net_reviewed:
            sys.exit(f"見逃しの網に {len(b.net_hits)} 件掛かりました（{net_path}）。人が確かめて、"
                     "--net-reviewed で確かめた一覧を渡すまで、本番の命令書は作りません。")
        with open(args.net_reviewed, encoding="utf-8-sig", newline="") as f:
            reviewed = {(r["file"], r["where"], r["pos"], r["pattern"]) for r in csv.DictReader(f)}
        left = [h for h in b.net_hits if (h["file"], h["where"], str(h["pos"]), h["pattern"]) not in reviewed]
        if left:
            sys.exit(f"見逃しの網に、確かめた一覧に無いものが {len(left)} 件あります。本番の命令書は作りません。")
    out.write_text(sql, encoding="utf-8", newline="\n")
    counts = dict(b.counts)
    summary = {"tool": TOOL_VERSION, "mode": args.mode, "files": len(files), "source_version": b.source_version,
               "regression_rows": n_reg, "personal_info": b.pi_totals, "net_hits": len(b.net_hits),
               "existing_expected": b.expected_existing, "counts": counts, "warnings": b.warnings}
    out.with_name(out.stem + "_counts.json").write_text(json.dumps(summary, ensure_ascii=False, indent=1),
                                                         encoding="utf-8")
    print(f"命令書を書き出しました: {out}（{out.stat().st_size / 1e6:.1f}MB、モード {args.mode}）")
    print(f"  中間ファイル {len(files)}件（分解の道具 {b.source_version}）／確認表 {n_reg}件")
    print(f"  非公開の段落：丸ごと {b.pi_totals['whole']}／一部 {b.pi_totals['partial']}"
          f"／一覧 {b.pi_totals['listed']}")
    print(f"  見逃しの網：{len(b.net_hits)}件（{net_path}）")
    for k in sorted(counts):
        print(f"  {k}: {counts[k]}")
    for wmsg in b.warnings[:20]:
        print(f"  注意: {wmsg}")
    print("※ このファイルには会議録の本文が入っています。GitHub には上げないでください。")


if __name__ == "__main__":
    main()
