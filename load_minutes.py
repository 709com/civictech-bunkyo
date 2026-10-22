#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
load_minutes.py  --  ingest_minutes.py が作ったJSONを、データベースに流し込む

【これは何をするものか】
ingest_minutes.py が作った data/out.json（本会議の一般質問）を読み、
データベースに入れるための命令書（SQL）を作ります。--apply を付けると、
そのままローカルのデータベース（Supabase）に流し込みます。

入れる先（表）:
  council_sessions  … 会期（定例会）。無ければ作る
  meetings          … 会議1回（本会議の1日）
  sections          … 区切り。本会議では質問者1人分（質問・答弁・再質問）で1区切り
  speeches          … 発言（1発言1行）。これが正本
  topic_nodes       … 章と論点
  topic_speeches    … 論点と発言（答弁）の結び付け。本文の何文字目から何文字目か
  general_questions … 既存の画面用の写し（下書き・未チェックで入れる）

【使い方（黒い画面に打ち込む）】
  1. まず会議録をJSONにする:
      py -3 ingest_minutes.py honkaigi-kaigiroku/
  2. 命令書（SQL）を作るだけ（データベースには触らない）:
      py -3 load_minutes.py
  3. 作って、ローカルのデータベースに流し込む:
      py -3 load_minutes.py --apply
  4. 作って、公開用のデータベース（Supabase のクラウド）に流し込む:
      py -3 load_minutes.py --apply --target production
     接続先は .env.production の SUPABASE_DB_URL から読む（値は画面に出さない）。
     流し込む前に、接続先のホスト名を表示し、そのホスト名を打ち込んで確かめる。
     （打ち込めない黒い画面では --confirm-host <ホスト名> で同じ確認をする）

【安全のための決まり】
  ・全部まとめて1回の処理（トランザクション）で入れる。途中で1つでも失敗したら、
    何も入らなかった状態に戻る。
  ・同じ会議録ファイルを二重に入れようとすると、データベース側で拒否されて止まる。
  ・議員は、表記が議員マスタ（members / member_aliases）で見つかった場合だけ結び付ける。
    見つからない表記は、新しい議員を作らず「未確認」のまま入れる。
  ・会派は、会派の履歴（member_faction_history）に発言日の期間があればそれを使い、
    無ければ本人の名乗りをそのまま使う。
  ・何も指定しなければ、入れる先はいつもローカル（このパソコンの Docker の中）。
    公開用に入れるのは --target production をはっきり付けたときだけ。
    そのときも、ホスト名の確認が合わなければ、つながずに止まる。
    公開用の接続先がローカル（127.0.0.1 など）を指していたら、取り違えとして止まる。
  ・選挙期間中（web/src/config/site.config.ts の electionBlackout の期間）は、
    --apply を付けてもデータベースに入れない（データ更新の休止。設計書 9-6）。
  ・命令書（data/load_minutes.sql）には会議録の本文が入るので、GitHubには上げない
    （data/ は .gitignore で除外済み）。
"""

import argparse
import json
import os
import re
import subprocess
import sys
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parent
DEFAULT_IN = ROOT / "data" / "out.json"
DEFAULT_SQL = ROOT / "data" / "load_minutes.sql"
DEFAULT_ENV_FILE = ROOT / ".env.production"
DB_URL_KEY = "SUPABASE_DB_URL"
# 公開用の接続先として、取り違えとみなすホスト（ローカルのデータベース）
LOCAL_HOSTS = {"localhost", "127.0.0.1", "::1", "0.0.0.0", "host.docker.internal"}

# IDを毎回同じ値にするための「種」。同じ会議録からは、何度作っても同じIDになる。
ID_NAMESPACE = uuid.UUID("6f0e1c7a-5b0d-4f6e-9a57-b0c7b1f2d3e4")


def make_id(*parts) -> str:
    return str(uuid.uuid5(ID_NAMESPACE, "|".join(str(p) for p in parts)))


def lit(value) -> str:
    """Pythonの値を、SQLに書ける形にする（文字列は ' で囲み、中の ' は '' にする）。"""
    if value is None or value == "":
        return "null"
    if isinstance(value, bool):
        return "true" if value else "false"
    if isinstance(value, int):
        return str(value)
    return "'" + str(value).replace("'", "''") + "'"


def session_slug(session: str) -> str:
    """「令和8年2月定例議会」→ r8-02。URLに使う短い名前。"""
    m = re.search(r"令和([\d元]+)年(\d+)月(定例議会|臨時議会|招集議会)", session)
    if not m:
        return ""
    year = "1" if m.group(1) == "元" else m.group(1)
    suffix = {"定例議会": "", "臨時議会": "-rinji", "招集議会": "-shoshu"}[m.group(3)]
    return f"r{year}-{int(m.group(2)):02d}{suffix}"


# 文京区議会 会議録検索システム。定例会ごとの会議録一覧ページの URL は、
# 「会議の種類（Cabinet）」と「会期の初日・最終日」で決まる（トップページのリンクで確認済み）。
MINUTES_LIST_URL = (
    "https://www.city.bunkyo.tokyo.dbsr.jp/100000?Template=list&QueryType=New&ListOrder=Asc"
    "&Cabinet={cabinet}&TermStart={start}&TermEnd={end}"
)
# 本会議の会議の種類 → Cabinet の番号
MINUTES_CABINET = {"招集議会": 1, "定例議会": 2, "臨時議会": 3}


def session_minutes_url(session: str, start: str, end: str) -> str:
    """定例会ごとの会議録一覧ページの URL。会議の種類が読めなければ空。

    例）令和8年2月定例議会（2026-02-09〜2026-03-17）
      → ...&Cabinet=2&TermStart=2026-02-09&TermEnd=2026-03-17
    """
    m = re.search(r"(定例議会|臨時議会|招集議会)", session or "")
    if not m or not start or not end:
        return ""
    return MINUTES_LIST_URL.format(cabinet=MINUTES_CABINET[m.group(1)], start=start, end=end)


def day_number(day_label: str) -> int:
    """「2日目」→ 2。読めなければ 1。"""
    m = re.search(r"(\d+)", day_label or "")
    return int(m.group(1)) if m else 1


def raw_transcript(q) -> str:
    """既存の画面用の原文。「◯話者 本文」を発言の順に並べる。"""
    parts = []
    for sp in q["speeches"]:
        if sp["speaker_kind"] == "member":
            speaker = f"{sp['name']}議員"
        else:
            speaker = f"{sp['role']}（{sp['name']}）"
        parts.append(f"◯{speaker}\n{sp['text']}")
    return "\n\n".join(parts)


def build_sql(questions) -> tuple[str, dict]:
    out = []
    w = out.append
    counts = {"council_sessions": 0, "meetings": 0, "sections": 0, "speeches": 0,
              "chapters": 0, "topics": 0, "topic_speeches": 0, "general_questions": 0}

    w("-- load_minutes.py が作った命令書。会議録の本文を含むので、GitHubには上げないこと。")
    w("begin;")

    # ---- 会期（無ければ作る）-------------------------------------------
    sessions = {}
    for q in questions:
        sessions.setdefault(q["session"], (q["session_start_date"], q["session_end_date"]))
    for name, (start, end) in sorted(sessions.items(), key=lambda x: x[1]):
        counts["council_sessions"] += 1
        w("insert into public.council_sessions (name, slug, start_date, end_date)\n"
          f"select {lit(name)}, {lit(session_slug(name))}, {lit(start)}::date, {lit(end)}::date\n"
          f"where not exists (select 1 from public.council_sessions where name = {lit(name)});")

    # ---- 会議 → 区切り → 発言 → 章・論点 -------------------------------
    by_file = {}
    for q in questions:
        by_file.setdefault(q["source_file"], []).append(q)

    for source_file, qs in sorted(by_file.items()):
        first = qs[0]
        meeting_id = make_id("meeting", source_file)
        counts["meetings"] += 1
        w("insert into public.meetings (id, kind, meeting_date, session_name, day_label,"
          " council_session_id, source_type, source_file, source_url)\n"
          f"values ({lit(meeting_id)}, 'plenary', {lit(first['meeting_date'])}::date,"
          f" {lit(first['session'])}, {lit(first['day_label'])},\n"
          f"  (select id from public.council_sessions where name = {lit(first['session'])}),\n"
          f"  {lit(first['source_type'])}, {lit(source_file)}, {lit(first['source_url'])});")

        speech_order = 0
        for q in sorted(qs, key=lambda x: x["question_order"]):
            section_id = make_id("section", source_file, q["question_order"])
            counts["sections"] += 1
            w("insert into public.sections (id, meeting_id, section_order, kind, title)\n"
              f"values ({lit(section_id)}, {lit(meeting_id)}, {q['question_order']},"
              f" 'general_question', {lit(q['questioner_name'] + '議員の一般質問')});")

            node_order = 0      # 区切りの中での、章（と章なし論点）の並び順
            gq_topics = []      # 既存の画面用の写しに入れる論点
            for sp in q["speeches"]:
                speech_order += 1
                speech_id = make_id("speech", source_file, speech_order)
                counts["speeches"] += 1
                is_member = sp["speaker_kind"] == "member"
                member_id = f"public.find_member_id({lit(sp['name'])})" if is_member else "null"
                w("insert into public.speeches (id, meeting_id, section_id, speech_order,"
                  " speaker_kind, member_id, speaker_name_raw, speaker_role_raw,"
                  " stated_faction, body)\n"
                  f"values ({lit(speech_id)}, {lit(meeting_id)}, {lit(section_id)}, {speech_order},"
                  f" {lit(sp['speaker_kind'])}, {member_id}, {lit(sp['name'])}, {lit(sp['role'])},"
                  f" {lit(q['stated_party']) if is_member else 'null'},\n  {lit(sp['text'])});")

                for ch in sp.get("chapters", []):
                    chapter_id = None
                    if ch["title"]:
                        node_order += 1
                        chapter_id = make_id("chapter", section_id, node_order)
                        counts["chapters"] += 1
                        w("insert into public.topic_nodes (id, section_id, parent_id, level,"
                          " node_order, title)\n"
                          f"values ({lit(chapter_id)}, {lit(section_id)}, null, 'chapter',"
                          f" {node_order}, {lit(ch['title'])});")
                    for i, t in enumerate(ch["topics"], start=1):
                        if chapter_id is None:
                            node_order += 1
                            order = node_order
                        else:
                            order = i
                        topic_id = make_id("topic", section_id, chapter_id or "-", order)
                        counts["topics"] += 1
                        w("insert into public.topic_nodes (id, section_id, parent_id, level,"
                          " node_order, title)\n"
                          f"values ({lit(topic_id)}, {lit(section_id)}, {lit(chapter_id)}, 'topic',"
                          f" {order}, {lit(t['title'])});")
                        counts["topic_speeches"] += 1
                        w("insert into public.topic_speeches (topic_node_id, speech_id,"
                          " char_start, char_end)\n"
                          f"values ({lit(topic_id)}, {lit(speech_id)}, {t['start']}, {t['end']});")
                        gq_topics.append({
                            "title": t["title"],
                            "question_summary": "",
                            # 要約ではなく、答弁の該当部分を原文のまま入れる（抜き出し）
                            "answer_summary": sp["text"][t["start"]:t["end"]],
                            "answerer_role": sp["role"],
                            "answerer_name": sp["name"],
                        })

            # ---- 既存の画面用の写し（下書き・未チェック）------------------
            counts["general_questions"] += 1
            name, date = lit(q["questioner_name"]), lit(q["meeting_date"])
            w("insert into public.general_questions (council_session_id, session_day,"
              " question_order, questioner_name, questioner_party, topics, raw_text, source_url,"
              " publish_status, source_type, review_status, content_origin, meeting_date,"
              " source_file, section_id)\n"
              "values (\n"
              f"  (select id from public.council_sessions where name = {lit(q['session'])}),\n"
              f"  {day_number(q['day_label'])}, {q['question_order']}, {name},\n"
              "  -- 会派：履歴に発言日の期間があればそれ、無ければ本人の名乗り\n"
              "  coalesce(\n"
              "    (select f.name from public.factions f\n"
              f"      where f.id = public.member_faction_id_on(public.find_member_id({name}), {date}::date)),\n"
              f"    {lit(q['stated_party'])}),\n"
              f"  {lit(json.dumps(gq_topics, ensure_ascii=False))}::jsonb,\n"
              f"  {lit(raw_transcript(q))},\n"
              # 原典リンク：指定が無ければ、定例会ごとの会議録一覧ページ
              f"  {lit(q['source_url'] or session_minutes_url(q['session'], q['session_start_date'], q['session_end_date']))},"
              f" 'draft', {lit(q['source_type'])}, 'unreviewed', 'extracted',"
              f" {date}::date, {lit(q['source_file'])}, {lit(section_id)});")

    # ---- 入れた件数が合っているか、確定する前に確かめる ---------------------
    files = ", ".join(lit(f) for f in sorted(by_file))
    w("do $$\ndeclare\n  v record;\nbegin\n"
      "  select\n"
      f"    (select count(*) from public.meetings m where m.source_file in ({files})) as meetings,\n"
      "    (select count(*) from public.sections s join public.meetings m on m.id = s.meeting_id\n"
      f"      where m.source_file in ({files})) as sections,\n"
      "    (select count(*) from public.speeches s join public.meetings m on m.id = s.meeting_id\n"
      f"      where m.source_file in ({files})) as speeches,\n"
      "    (select count(*) from public.topic_nodes n join public.sections s on s.id = n.section_id\n"
      "      join public.meetings m on m.id = s.meeting_id\n"
      f"      where m.source_file in ({files})) as nodes,\n"
      f"    (select count(*) from public.general_questions g where g.source_file in ({files})) as gq\n"
      "  into v;\n"
      f"  if v.meetings <> {counts['meetings']} or v.sections <> {counts['sections']}"
      f" or v.speeches <> {counts['speeches']}\n"
      f"     or v.nodes <> {counts['chapters'] + counts['topics']}"
      f" or v.gq <> {counts['general_questions']} then\n"
      "    raise exception '入れた件数が想定と違います: %', row_to_json(v);\n"
      "  end if;\nend;\n$$;")
    w("commit;")
    return "\n\n".join(out) + "\n", counts


def election_blackout_period():
    """公開サイトの設定（web/src/config/site.config.ts）から、選挙期間中の休止の期間を読む。

    返すもの: (開始日, 終了日)。どちらかが空なら None。
    """
    text = (ROOT / "web" / "src" / "config" / "site.config.ts").read_text(encoding="utf-8")
    m = re.search(
        r'electionBlackout:\s*\{[^}]*?start:\s*"([^"]*)"[^}]*?end:\s*"([^"]*)"', text, re.S
    )
    if not m or not m.group(1) or not m.group(2):
        return None
    return m.group(1), m.group(2)


def in_election_blackout(today: str) -> bool:
    """その日（"YYYY-MM-DD"）が、選挙期間中の休止の期間に入っているか。両端を含む。"""
    period = election_blackout_period()
    return bool(period) and period[0] <= today <= period[1]


def db_container() -> str:
    """supabase/config.toml の project_id から、データベースのコンテナ名を作る。"""
    text = (ROOT / "supabase" / "config.toml").read_text(encoding="utf-8")
    m = re.search(r'^project_id\s*=\s*"([^"]+)"', text, re.M)
    if not m:
        sys.exit("supabase/config.toml に project_id が見つかりません。")
    return f"supabase_db_{m.group(1)}"


def read_env_value(env_file: Path, key: str) -> str:
    """KEY=VALUE の形のファイルから、1つの値だけを読む。値は画面に出さない。"""
    if not env_file.is_file():
        sys.exit(f"{env_file} が見つかりません。公開手順書の STEP 3 で作ってください。")
    for line in env_file.read_text(encoding="utf-8-sig").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        name, value = line.split("=", 1)
        if name.strip().removeprefix("export ").strip() != key:
            continue
        value = value.strip()
        if len(value) >= 2 and value[0] == value[-1] and value[0] in "'\"":
            value = value[1:-1]
        return value
    return ""


def production_target(env_file: Path) -> tuple[str, str]:
    """公開用の接続先（接続文字列, ホスト名）。接続文字列は画面に出さない。"""
    url = read_env_value(env_file, DB_URL_KEY)
    if not url:
        sys.exit(f"{env_file} に {DB_URL_KEY} が書かれていません。公開手順書の STEP 3 を確かめてください。")
    if not url.startswith(("postgresql://", "postgres://")):
        sys.exit(f"{DB_URL_KEY} が postgresql:// で始まっていません。公開手順書の STEP 3 を確かめてください。")
    try:
        host = urlsplit(url).hostname or ""
    except ValueError:
        host = ""
    if not host:
        sys.exit(f"{DB_URL_KEY} からホスト名を読み取れません。公開手順書の STEP 3 を確かめてください。")
    if host.lower() in LOCAL_HOSTS:
        sys.exit(f"公開用の接続先がローカル（{host}）を指しています。取り違えのおそれがあるので止めます。")
    return url, host


def confirm_production(host: str, confirm_host: str | None) -> None:
    """公開用に流し込む前の確認。ホスト名が合わなければ止める。"""
    print("\n" + "=" * 60)
    print("  公開用のデータベースに流し込もうとしています。")
    print(f"  接続先のホスト名: {host}")
    print("=" * 60)
    if confirm_host is None:
        if not sys.stdin.isatty():
            sys.exit("確認ができないので止めます。--confirm-host <ホスト名> を付けて、もう一度実行してください。")
        try:
            confirm_host = input("よければ、上のホスト名をそのまま打ち込んで Enter: ").strip()
        except (EOFError, KeyboardInterrupt):
            sys.exit("\n確認ができないので止めます。何もしていません（公開用のデータベースにはつないでいません）。")
    if confirm_host != host:
        sys.exit("ホスト名が一致しません。何もしていません（公開用のデータベースにはつないでいません）。")


def redact(text: str, secret: str) -> str:
    """エラーの文に秘密の値が混ざっていたら伏せる。"""
    password = ""
    try:
        password = urlsplit(secret).password or ""
    except ValueError:
        pass
    for value in (secret, password):
        if value:
            text = text.replace(value, "****")
    return text


def main():
    ap = argparse.ArgumentParser(description="会議録JSONをデータベースに流し込む")
    ap.add_argument("json", nargs="?", default=str(DEFAULT_IN),
                    help=f"ingest_minutes.py が作ったJSON（既定: {DEFAULT_IN}）")
    ap.add_argument("-o", "--out", default=str(DEFAULT_SQL),
                    help=f"書き出す命令書（SQL）のファイル名（既定: {DEFAULT_SQL}）")
    ap.add_argument("--apply", action="store_true",
                    help="書き出したあと、データベースに流し込む（入れる先は --target）")
    ap.add_argument("--target", choices=["local", "production"], default="local",
                    help="入れる先。local＝このパソコンの Docker の中（既定）、"
                         "production＝公開用（.env.production の SUPABASE_DB_URL）")
    ap.add_argument("--env-file", default=str(DEFAULT_ENV_FILE),
                    help=f"公開用の接続先を読むファイル（既定: {DEFAULT_ENV_FILE}）")
    ap.add_argument("--confirm-host",
                    help="公開用に入れるときの確認。接続先のホスト名をそのまま書く")
    args = ap.parse_args()

    questions = json.loads(Path(args.json).read_text(encoding="utf-8"))
    if not questions:
        sys.exit("JSONに質問が1件もありません。")
    if "speeches" not in questions[0]:
        sys.exit("このJSONには発言の一覧がありません。ingest_minutes.py を実行し直してください。")

    sql, counts = build_sql(questions)
    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(sql, encoding="utf-8", newline="\n")

    print(f"命令書を書き出しました: {out_path}")
    print(f"  会期 {counts['council_sessions']} / 会議 {counts['meetings']}"
          f" / 区切り {counts['sections']} / 発言 {counts['speeches']}")
    print(f"  章 {counts['chapters']} / 論点 {counts['topics']}"
          f" / 画面用の写し {counts['general_questions']}")
    print("※ このファイルには会議録の本文が入っています。GitHubには上げないでください。")

    if not args.apply:
        print("データベースにはまだ入れていません。入れるときは --apply を付けてください。")
        if args.target == "production":
            print("（--target production は、--apply を付けたときだけ意味を持ちます）")
        return

    # 選挙期間中（告示日〜投開票日）は、データの更新を休止する（設計書 9-6）
    today = datetime.now(timezone(timedelta(hours=9))).strftime("%Y-%m-%d")
    if in_election_blackout(today):
        start, end = election_blackout_period()
        sys.exit(f"選挙期間中（{start}〜{end}）のため、データの更新を休止しています。"
                 "データベースには何も入れていません。")

    container = db_container()
    if args.target == "production":
        url, host = production_target(Path(args.env_file))
        confirm_production(host, args.confirm_host)
        print(f"\n公開用のデータベース（{host}）に流し込みます……")
        # 接続文字列はコマンドの引数に書かず、環境変数で渡す（画面やログに出さないため）。
        # psql は、このパソコンのデータベースのコンテナに入っているものを借りて使う。
        result = subprocess.run(
            ["docker", "exec", "-i", "-e", "PGCLIENTENCODING=UTF8", "-e", "PGSSLMODE=require",
             "-e", "LOAD_MINUTES_DB_URL", container,
             "sh", "-c", 'exec psql "$LOAD_MINUTES_DB_URL" -X -q -v ON_ERROR_STOP=1'],
            input=sql.encode("utf-8"), capture_output=True,
            env={**os.environ, "LOAD_MINUTES_DB_URL": url},
        )
        secret = url
    else:
        print(f"\nローカルのデータベース（{container}）に流し込みます……")
        result = subprocess.run(
            ["docker", "exec", "-i", "-e", "PGCLIENTENCODING=UTF8", container,
             "psql", "-U", "postgres", "-d", "postgres", "-X", "-q", "-v", "ON_ERROR_STOP=1"],
            input=sql.encode("utf-8"), capture_output=True,
        )
        secret = ""
    if result.returncode != 0:
        print(redact(result.stderr.decode("utf-8", errors="replace"), secret))
        sys.exit("流し込みに失敗しました。データベースは、流し込む前の状態のままです。")
    print("流し込みが終わりました。")


if __name__ == "__main__":
    main()
