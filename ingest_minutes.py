#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ingest_minutes.py  --  文京区議会 本会議会議録(.docx) 取り込みスクリプト

【これは何をするものか】
Wordの会議録ファイルを読み込んで、「誰が」「何を質問し」「誰が」「どう答えたか」を
1件ずつ切り出し、JSONという形式のデータに変換します。
そのJSONを、あとでデータベース(Supabase)に流し込みます。

【使い方（黒い画面に打ち込む）】
  1回目（まず様子を見る・診断モード）:
      py -3 ingest_minutes.py --diagnose "会議録.docx"
      py -3 ingest_minutes.py --diagnose honkaigi-kaigiroku/     ← フォルダ全体の要約

  2回目（実際に変換する）:
      py -3 ingest_minutes.py "会議録.docx"

  フォルダごとまとめて:
      py -3 ingest_minutes.py honkaigi-kaigiroku/

  → 結果は何も指定しなければ data/out.json に出ます（-o で変更できます）。
    data/ には会議録の本文がそのまま入るので、.gitignore で除外してあります。

【最初に1回だけ必要な準備】
      py -3 -m pip install python-docx

【文京区の会議録の書式（2026-09-14に実ファイル74件を調べて確認）】
  ・一般質問の範囲  … 「日程第一、一般質問を行います。」で始まり、
                       「…を議題といたします」「以上で本日の日程は終了」「…散会」で終わる。
                       この範囲の外にある登壇（委員長報告・討論・議案説明）は拾わない。
  ・質問者          … 〔沢田けいじ議員登壇〕 というト書きの次に
                       ○沢田けいじ議員 本文……   ← この「○名前議員」行が本体
  ・答弁者          … 〔成澤廣修区長登壇〕 のあと
                       ○区長(成澤廣修) 本文……   ← 「○役職(氏名)」の形
  ・議長            … ○議長(市村やすとし) …  → 議事進行なので捨てる
  ・見出し（論点）  … 「次に、基金について伺います。」
                       「初めに、令和八年度予算編成についてお伺いいたします。」
                       「まず、まちづくりについてです。」
                       → 接続語 ＋ ○○について ＋ 伺います/です で終わる短い行
  ・番号付き見出し（「一、待機児童対策について」）は文京区では使われていない（0件）。
  ・日付と定例会名  … 本文は漢数字なので、ファイル名から取るのが確実。
                       例）26.02.12　文京区令和8年2月定例議会（2日目）.docx
"""

import argparse
import json
import re
import sys
import unicodedata
from pathlib import Path

try:
    import docx  # python-docx
except ImportError:
    sys.exit("python-docx が入っていません。先に `py -3 -m pip install python-docx` を実行してください。")


# 変換結果(JSON)の既定の置き場所。
# どこから実行しても同じ場所に出るよう、このスクリプトの隣の data/ に固定する。
# data/ は .gitignore で除外してあるので、GitHubには上がらない。
DEFAULT_OUT = Path(__file__).resolve().parent / "data" / "out.json"


# ============================================================
# 設定：ここを実際の会議録の書式に合わせて直す
# ============================================================

PATTERNS = {
    # --- 一般質問セクションの始まりと終わり ---------------------------
    # 「日程第一、一般質問を行います。」「休憩前に引き続き一般質問を行います。」
    "gq_start": re.compile(r"一般質問を行います"),
    # 「次に、日程第一から第十七までの十七件を一括して議題といたします。」
    # 「以上で本日の日程は終了いたしました。」「午後四時三十分散会」
    "gq_end": re.compile(r"議題といたします|以上で本日の日程は終了|^午[前後][^ ]{0,12}散会"),

    # --- 発言者の行 ---------------------------------------------------
    # 質問者。例）「○沢田けいじ議員 政策チームAGORAの沢田です。」
    "questioner": re.compile(
        r"^[○〇●]\s*(?P<name>(?!議長|副議長)[^\s()（）「」、。]{2,14}?)議員(?:\s|$)"
    ),
    # 答弁者。例）「○区長(成澤廣修) 沢田議員の御質問にお答えします。」
    #            「○保健衛生部長(矢内真理子) …」
    "answerer": re.compile(
        r"^[○〇●]\s*(?P<role>(?!議長|副議長)[^\s()（）、。]{2,20}?)\s*[(（](?P<name>[^)）]{2,16})[)）]"
    ),
    # 議長・副議長の議事進行。捨てる。
    "chair": re.compile(r"^[○〇●]\s*(?:議長|副議長)\s*[(（]"),

    # --- 見出し（質問の論点） -----------------------------------------
    # 「次に、基金について伺います。」「初めに、令和八年度予算編成についてお伺いいたします。」
    # 「まず、まちづくりについてです。」「次に、町の美観について四点伺います。」
    "heading": re.compile(
        r"^(?:初めに|はじめに|最初に|まず|次に|続いて|続きまして|さらに|最後に|終わりに|おわりに)"
        r"\s*[、,]?\s*"
        r"(?P<title>.{2,60}?)"
        r"(?:について|につきまして|に関して|に関し)"
        r"[^。]{0,20}?"
        r"(?:(?:お)?(?:伺い|質問|聞き|尋ね|申し上げ|述べ)(?:を)?"
        r"(?:させて|さして)?(?:いただき|いたし|し)?(?:ます|たいと思います|たい)"
        r"|です|でございます)"
        r"\s*[。．.]?\s*$"
    ),

    # 体言止めの見出し。議員によってはこちらを使う。
    # 「次に、五歳児健診の実施を。」「次に、学校給食の無償化を。」
    # 短く言い切る行だけを拾い、ふつうの地の文（〜ます／〜ました等）は除く。
    "heading_short": re.compile(
        r"^(?:初めに|はじめに|最初に|まず|次に|続いて|続きまして|さらに|最後に|終わりに|おわりに)"
        r"\s*[、,]\s*"
        r"(?P<title>(?!.*(?:ます|ました|ません|でした|ください|思う|よう))[^。、，]{3,30})"
        r"\s*[。．.]\s*$"
    ),

    # --- 会期・日付（本文が漢数字なのでファイル名を優先して使う） -------
    # 例）26.02.12　文京区令和8年2月定例議会（2日目）.docx
    "fname_date": re.compile(r"^(?P<yy>\d{2})\.(?P<mm>\d{2})\.(?P<dd>\d{2})"),
    "fname_session": re.compile(
        r"令和(?P<r>[\d元]+)年(?P<month>\d+)月(?P<kind>定例議会|臨時議会|招集議会)"
        r"(?:[（(](?P<day>[^)）]+)[)）])?"
    ),

    # --- 捨てる行 -------------------------------------------------------
    # ト書き〔…〕、罫線、空行、開議・休憩・散会の時刻行
    "skip": re.compile(
        r"^\s*$|^[―—─\-]+$|^[〔［\[].*[〕］\]]$|^午[前後][^ ]{0,12}(?:開議|休憩|散会|再開)$"
    ),

}

# 会派の一覧（2023年5月〜の任期。実データから拾い出したもの）。
#   左＝データベースに入れる正式名 / 右＝会議録の冒頭あいさつに出てくる言い方
# 会派が増えたり名前が変わったら、ここに足すだけでよい。
# ※ 上から順に照合するので、長い名前・具体的な名前を先に書くこと。
FACTIONS = [
    ("自由民主党文京区議会",        ["自由民主党文京区議会", "自民党文京区議会"]),
    ("日本共産党文京区議会議員団",  ["日本共産党文京区議会議員団", "日本共産党文京区議会", "日本共産党"]),
    ("公明党文京区議団",            ["公明党文京区議団", "公明党"]),
    ("日本維新の会文京区議団",      ["日本維新の会文京区議団", "文京区議会日本維新の会", "日本維新の会"]),
    ("文京区議会都民ファーストの会", ["文京区議会都民ファーストの会", "都民ファーストの会"]),
    ("政策チームAGORA",             ["政策チーム AGORA", "政策チームAGORA", "AGORA"]),
    ("ぶんきょう子育て.ネット",     ["ぶんきょう子育て.ネット", "ぶんきょう子育てネット"]),
    ("文京永久の会",                ["文京永久の会"]),
    ("市民フォーラム",              ["市民フォーラム"]),
    ("区民が主役の会",              ["区民が主役の会"]),
    ("文京根っこの会",              ["文京根っこの会"]),
]

# 政策テーマのタグ。見出しや本文にこの語が出たらタグを付ける。
TAG_RULES = {
    "子育て": ["保育", "待機児童", "児童館", "子育て", "学童", "育児", "こども", "子ども"],
    "教育": ["学校", "教育", "給食", "不登校", "いじめ", "教員", "体育館", "主権者教育"],
    "防災": ["防災", "災害", "避難", "耐震", "水害", "消防", "帰宅困難"],
    "まちづくり": ["まちづくり", "再開発", "道路", "公園", "住宅", "景観", "駅"],
    "DX": ["デジタル", "DX", "ICT", "オンライン", "AI", "マイナンバー", "システム"],
    "福祉": ["高齢", "介護", "障害", "障がい", "生活保護", "福祉", "医療", "国保"],
    "環境": ["環境", "ごみ", "清掃", "温暖化", "脱炭素", "緑化", "リサイクル"],
    "財政": ["予算", "決算", "財政", "基金", "税", "使用料", "ふるさと納税"],
}


# ============================================================
# 以下は処理本体
# ============================================================

def normalize(text: str) -> str:
    """全角英数字を半角に揃え、余分な空白を削る。"""
    t = unicodedata.normalize("NFKC", text)
    return re.sub(r"[ 　]+", " ", t).strip()


def read_paragraphs(path: Path):
    """docxファイルから段落の文字列を順番に取り出す。

    文京区の会議録の本文はすべて段落で、表は議案の添付資料にしか出てこない。
    表を末尾にくっつけると発言の順番が狂うので、ここでは読まない。
    """
    d = docx.Document(str(path))
    return [p.text.strip() for p in d.paragraphs if p.text.strip()]


def meta_from_filename(path: Path):
    """ファイル名から「開催日」と「定例会名」を取り出す。

    例）26.02.12　文京区令和8年2月定例議会（2日目）.docx
        → meeting_date = "2026-02-12"
          session       = "令和8年2月定例議会"
          day_label     = "2日目"
    """
    name = normalize(path.stem)
    meeting_date, session, day_label = "", "", ""

    m = PATTERNS["fname_date"].match(name)
    if m:
        meeting_date = f"20{m.group('yy')}-{m.group('mm')}-{m.group('dd')}"

    m = PATTERNS["fname_session"].search(name)
    if m:
        session = f"令和{m.group('r')}年{m.group('month')}月{m.group('kind')}"
        day_label = m.group("day") or ""

    return meeting_date, session, day_label


def iter_general_question_lines(paras):
    """一般質問のセクションに入っている行だけを (行番号, 行) で返す。

    委員長報告・討論・議案説明の登壇を拾わないための足切り。
    """
    in_scope = False
    for i, raw in enumerate(paras):
        line = normalize(raw)
        if not in_scope:
            if PATTERNS["gq_start"].search(line):
                in_scope = True
            continue
        if PATTERNS["gq_end"].search(line):
            in_scope = False
            continue
        yield i, line


# 見出しとして認める行の最大の長さ。
# これより長い行は、答弁の地の文（「次に、…についてのお尋ねですが、…です。」）で
# たまたま形が似てしまうことがあるので、見出しとは見なさない。
HEADING_MAX_LEN = 70


def match_heading(line: str):
    """行が「質問の見出し」なら、見出し文字列を返す。違えば None。"""
    if len(line) > HEADING_MAX_LEN:
        return None
    m = PATTERNS["heading"].match(line) or PATTERNS["heading_short"].match(line)
    return m.group("title").strip(" 、,") if m else None


def guess_party(first_lines):
    """質問の冒頭あいさつから会派名を読み取る。

    「自由民主党文京区議会の浅川のぼるです。」のように、ほとんどの議員は
    名乗りの中で会派名を言う。上の FACTIONS の表と突き合わせるだけなので、
    勝手な文字列を拾ってしまう心配がない。見つからなければ空にする。
    """
    text = " ".join(first_lines)[:250]
    for canonical, aliases in FACTIONS:
        for a in aliases:
            if a in text:
                return canonical
    return ""


def fill_missing_parties(all_q):
    """名乗りで会派が分からなかった質問を、同じ議員の直前の発言から補う。

    会派は任期の途中で変わる議員がいるので、「その議員の最新の会派」ではなく
    「その質問より前で最後に分かっている会派」を使う。
    補った分は party_source を "carried"（引き継ぎ）にして、
    管理画面で確認すべき箇所が分かるようにしておく。
    """
    last_known = {}
    for q in sorted(all_q, key=lambda x: (x["meeting_date"], x["question_order"])):
        name = q["questioner_name"]
        if q["questioner_party"]:
            q["party_source"] = "stated"       # 本人が名乗った
            last_known[name] = q["questioner_party"]
        elif name in last_known:
            q["questioner_party"] = last_known[name]
            q["party_source"] = "carried"      # 前回の発言から引き継ぎ（要確認）
        else:
            q["party_source"] = "unknown"      # 分からない（要入力）
    return all_q


def guess_tags(text: str):
    tags = []
    for tag, words in TAG_RULES.items():
        if any(w in text for w in words):
            tags.append(tag)
    return tags


def diagnose(path: Path, verbose: bool = True):
    """書式を調べるモード。どの行が何として認識されたかを表示する。"""
    paras = read_paragraphs(path)
    scoped = list(iter_general_question_lines(paras))
    meeting_date, session, day_label = meta_from_filename(path)

    hit = {"questioner": 0, "answerer": 0, "heading": 0, "saishitsumon": 0}
    seen_names = []
    lines_out = []
    current_name = None
    speaker_kind = None  # "q"=質問 / "f"=再質問 / "a"=答弁

    for i, line in scoped:
        if PATTERNS["skip"].match(line) or PATTERNS["chair"].match(line):
            continue
        label = None
        mq = PATTERNS["questioner"].match(line)
        ma = PATTERNS["answerer"].match(line)
        if mq:
            if mq.group("name") == current_name:
                label = "[再質問]"
                hit["saishitsumon"] += 1
                speaker_kind = "f"
            else:
                label = "[質問者]"
                hit["questioner"] += 1
                seen_names.append(mq.group("name"))
                current_name = mq.group("name")
                speaker_kind = "q"
        elif ma:
            label = "[答弁者]"
            hit["answerer"] += 1
            speaker_kind = "a"
        elif speaker_kind == "q" and match_heading(line):
            # 見出しは質問の本文の中だけで数える。
            # 答弁の地の文にも似た形の行があるため。
            label = "[見出し]"
            hit["heading"] += 1
        if label:
            lines_out.append(f"{i:4d} {label} {line[:68]}")

    print(f"\n=== 診断: {path.name} ===")
    print(f"段落数: {len(paras)}  /  一般質問セクション内の行: {len(scoped)}")
    print(f"開催日: {meeting_date or '(不明)'}  定例会: {session or '(不明)'} {day_label}")
    if not scoped:
        print("※ このファイルに一般質問はありません（議案審議・委員長報告の回）。")
        return hit

    if verbose:
        print("\n--- 認識できた行だけを、出てきた順に表示します ---")
        for s in lines_out:
            print(s)

    print("\n--- 認識件数 ---")
    print(f"  質問者   : {hit['questioner']} 件")
    print(f"  再質問   : {hit['saishitsumon']} 件")
    print(f"  答弁者   : {hit['answerer']} 件")
    print(f"  見出し   : {hit['heading']} 件")
    print(f"  質問者の氏名: {', '.join(seen_names) if seen_names else '(なし)'}")
    return hit


def parse(path: Path, source_type: str, source_url: str = ""):
    """会議録1ファイルを解析して、質問のリストを返す。"""
    paras = read_paragraphs(path)
    meeting_date, session, day_label = meta_from_filename(path)

    questions = []
    current = None
    speaker_kind = None  # "q"=質問 / "f"=再質問 / "a"=答弁
    order = 0

    for _, line in iter_general_question_lines(paras):
        if PATTERNS["skip"].match(line) or PATTERNS["chair"].match(line):
            continue

        mq = PATTERNS["questioner"].match(line)
        if mq:
            name = mq.group("name")
            rest = line[mq.end():].strip()
            # 同じ議員がもう一度立った＝再質問（自席発言）。別件にはしない。
            if current and current["questioner_name"] == name:
                speaker_kind = "f"
                if rest:
                    current["followup_text"] += rest + "\n"
                continue
            if current:
                questions.append(current)
            order += 1
            current = {
                "session": session,
                "day_label": day_label,
                "meeting_date": meeting_date,
                "questioner_name": name,
                "questioner_party": "",          # 冒頭あいさつから推定（後で名簿で上書き）
                "question_order": order,
                "headings": [],
                "question_text": (rest + "\n") if rest else "",
                "followup_text": "",
                "answers": [],
                "tags": [],
                "source_type": source_type,      # "sokuhou"（速報版）または "seishiki"（正式版）
                "source_url": source_url,
                "source_file": path.name,
                "review_status": "unreviewed",   # 未チェック
            }
            speaker_kind = "q"
            continue

        ma = PATTERNS["answerer"].match(line)
        if ma and current:
            head = line[ma.end():].strip()
            current["answers"].append({
                "role": ma.group("role"),
                "name": ma.group("name") or "",
                "text": (head + "\n") if head else "",
            })
            speaker_kind = "a"
            continue

        if current is None:
            continue

        if speaker_kind == "q":
            mh = match_heading(line)
            if mh:
                current["headings"].append(mh)
            current["question_text"] += line + "\n"
            continue

        if speaker_kind == "f":
            current["followup_text"] += line + "\n"
        elif speaker_kind == "a" and current["answers"]:
            current["answers"][-1]["text"] += line + "\n"

    if current:
        questions.append(current)

    for q in questions:
        q["question_text"] = q["question_text"].strip()
        q["followup_text"] = q["followup_text"].strip()
        first_lines = q["question_text"].split("\n")[:2]
        q["questioner_party"] = guess_party(first_lines)
        basis = " ".join(q["headings"]) + " " + q["question_text"][:3000]
        q["tags"] = guess_tags(basis)
        for a in q["answers"]:
            a["text"] = a["text"].strip()

    return questions


def main():
    ap = argparse.ArgumentParser(description="文京区議会 会議録docx 取り込み")
    ap.add_argument("path", help="docxファイル、またはdocxが入ったフォルダ")
    ap.add_argument("-o", "--out", default=str(DEFAULT_OUT),
                    help=f"出力するJSONファイル名（既定: {DEFAULT_OUT}）")
    ap.add_argument("--diagnose", action="store_true", help="書式を調べるだけ（変換しない）")
    ap.add_argument("--quiet", action="store_true", help="診断で1行ずつの表示を省き、件数だけ出す")
    ap.add_argument("--source-type", default="seishiki",
                    choices=["seishiki", "sokuhou"],
                    help="seishiki=正式版 / sokuhou=速報版")
    ap.add_argument("--source-url", default="", help="原典（会議録検索システム等）のURL")
    args = ap.parse_args()

    target = Path(args.path)
    files = sorted(target.glob("*.docx")) if target.is_dir() else [target]
    files = [f for f in files if not f.name.startswith("~$")]  # Wordの一時ファイルを除く

    if not files:
        sys.exit("docxファイルが見つかりません。")

    if args.diagnose:
        verbose = (not args.quiet) and len(files) == 1
        total = {"questioner": 0, "answerer": 0, "heading": 0, "saishitsumon": 0}
        gq_files = 0
        for f in files:
            h = diagnose(f, verbose=verbose)
            if h["questioner"]:
                gq_files += 1
            for k in total:
                total[k] += h.get(k, 0)
        if len(files) > 1:
            print("\n============ 全ファイル合計 ============")
            print(f"  読んだファイル数        : {len(files)}")
            print(f"  一般質問があったファイル: {gq_files}")
            print(f"  質問者 : {total['questioner']} 件")
            print(f"  再質問 : {total['saishitsumon']} 件")
            print(f"  答弁者 : {total['answerer']} 件")
            print(f"  見出し : {total['heading']} 件")
        return

    all_q = []
    for f in files:
        qs = parse(f, args.source_type, args.source_url)
        if qs:
            print(f"{f.name}: 質問 {len(qs)} 件")
        all_q.extend(qs)

    fill_missing_parties(all_q)
    n_stated = sum(1 for q in all_q if q.get("party_source") == "stated")
    n_carried = sum(1 for q in all_q if q.get("party_source") == "carried")
    n_unknown = sum(1 for q in all_q if q.get("party_source") == "unknown")
    print(f"\n会派: 本人が名乗った {n_stated} 件 / 前回から引き継ぎ {n_carried} 件 / 不明 {n_unknown} 件")

    out_path = Path(args.out)
    # 出力先のフォルダが無ければ作る（既定の data/ など）
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(
        json.dumps(all_q, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print(f"\n合計 {len(all_q)} 件を {out_path} に書き出しました。")
    print("※ このファイルには会議録の本文が入っています。GitHubには上げないでください")
    print("   （data/ は .gitignore で除外済みです）。")
    print("中身を一度目で見てから、データベースへの投入に進んでください。")


if __name__ == "__main__":
    main()
