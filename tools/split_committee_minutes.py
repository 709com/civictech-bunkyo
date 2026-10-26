"""委員会（と本会議）の会議録 docx を、発言・議題・一般質問の項目などに分解する（試作 v0.1）。

- AI は使わない。決まった言い回しの照合だけで分ける。
- 推測で埋めない。名簿で1人に決まらない発言者は空欄。自信のない切れ目は「要確認」。
- 原文の層：全段落を段落番号つきで残す（範囲の外・ト書き・時刻の行も）。
- 個人情報：請願文書表の「請願者」の欄、人事案件の住所・生年月日などの段落は、
  文字を保存せず「非公開」の印だけを残す。
- データベースには何も入れない。結果は JSON に書くだけ。

元にしたもの：クラウドでの試作 split_committee.py（2026-10-26）、
会議録AI（kaigiroku-ai）の parser.py（SpeakerResolver）の考え方。
"""
import hashlib
import re
import unicodedata
from collections import Counter, OrderedDict

from committee_docx_text import read_document

TOOL_NAME = "split_committee_minutes.py"
TOOL_VERSION = "0.3.2 (2026-10-27 契約の相手方の代表者の氏名を隠す)"

SP = "　"
DIG = str.maketrans("０１２３４５６７８９", "0123456789")
KAN = {"〇": 0, "零": 0, "一": 1, "二": 2, "三": 3, "四": 4, "五": 5,
       "六": 6, "七": 7, "八": 8, "九": 9}


def nospace(s):
    return re.sub(r"[\s　]+", "", s or "")


def kan2int(s):
    """漢数字・全角数字・半角数字を整数に（十・百・千まで）。読めなければ None。"""
    if s is None:
        return None
    s = s.translate(DIG).strip()
    if s.isdigit():
        return int(s)
    if s == "元":
        return 1
    total, cur = 0, 0
    for ch in s:
        if ch in KAN:
            cur = cur * 10 + KAN[ch]
        elif ch in "十百千":
            mult = {"十": 10, "百": 100, "千": 1000}[ch]
            total += (cur or 1) * mult
            cur = 0
        else:
            return None
    return total + cur


ERA = {"令和": 2018, "平成": 1988, "昭和": 1925}


def parse_wareki(text):
    t = nospace(text).translate(DIG)
    m = re.search(r"(令和|平成|昭和)([0-9]+|元|[〇一二三四五六七八九十]+)年([0-9〇一二三四五六七八九十]+)月([0-9〇一二三四五六七八九十]+)日", t)
    if not m:
        return None
    y = ERA[m.group(1)] + kan2int(m.group(2))
    return f"{y:04d}-{kan2int(m.group(3)):02d}-{kan2int(m.group(4)):02d}"


# ---------------------------------------------------------------- 行の種類
NUMCH = r"0-9０-９〇一二三四五六七八九十"
TIME_RE = re.compile(
    rf"^(午前|午後)([{NUMCH}零]+)時(?:([{NUMCH}]+)分)?(開会|開議|休憩|再開|閉会|散会|延会|開始|終了)?$"
    r"|^(正午)(開会|開議|休憩|再開|閉会|散会)?$")
SEP_LINE_RE = re.compile(r"^[\s　]*[―─－\-]{5,}[\s　]*$")
# 請願文書表の区切りは「……」。「・・・・」は伏字（文字を伏せた所）なので区切りにしない
DOT_LINE_RE = re.compile(r"^[\s　]*[…]{8,}[\s　]*$")
STAGE_RE = re.compile(r"^[〔（(][^〔〕]*[〕）)](?:[（(][^（）]*[）)])*$")


def parse_time(line):
    t = nospace(line)
    m = TIME_RE.match(t)
    if not m:
        return None
    if m.group(5):
        return {"hh": 12, "mm": 0, "event": m.group(6) or ""}
    hh = 0 if m.group(2) == "零" else kan2int(m.group(2))
    mm = kan2int(m.group(3)) if m.group(3) else 0
    if hh is None or mm is None:
        return None
    if m.group(1) == "午後" and hh < 12:
        hh += 12
    return {"hh": hh, "mm": mm, "event": m.group(4) or ""}


# ---------------------------------------------------------------- 名簿
COUNCIL_ROLES = ["委員長職務代理者", "委員長代理", "副委員長", "委員長", "副議長", "議長",
                 "理事", "委員", "議員", "座長"]
STAFF_TITLES = ["区議会事務局長", "事務局長", "事務局次長", "議事調査係長", "議事調査主査",
                "議事調査担当", "議事主査", "調査主査", "議会主査", "議事係長", "調査係長",
                "主任主事", "主任", "主事", "係員", "書記"]


def split_member_line(body):
    """出席委員・委員外議員（肩書が先）：「委 員 長　　　　関　川　　けさ子」"""
    t = body.strip(SP + " \t")
    for role in COUNCIL_ROLES:
        pat = r"[\s　]*".join(re.escape(c) for c in role)
        m = re.match(rf"^{pat}(?![長員])[\s　]+(.+)$", t)
        if m and nospace(m.group(1)):
            return role, nospace(m.group(1))
    return None, nospace(t)


def split_official_line(body):
    """出席説明員（氏名が先）：「成　澤　廣　修　　区　長」→ 最後の2文字以上の空白で区切る。"""
    t = body.strip(SP + " \t")
    runs = list(re.finditer("　{2,}", t))
    if not runs:
        return None, nospace(t)
    last = runs[-1]
    name, title = nospace(t[:last.start()]), nospace(t[last.end():])
    if not name or not title:
        return None, nospace(t)
    return title, name


def split_staff_line(body):
    """事務局職員（肩書が先）。肩書と氏名の間の空白が1つのこともあるので、肩書の一覧で切る。"""
    t = body.strip(SP + " \t")
    s = nospace(t)
    for title in STAFF_TITLES:
        if s.startswith(title) and len(s) > len(title):
            return title, s[len(title):]
    runs = [len(r) for r in re.findall("　+", t)]
    if runs:
        longest = max(runs)
        if longest >= 2 and runs.count(longest) == 1:
            a, b = re.split("　{%d}" % longest, t, maxsplit=1)
            return nospace(a), nospace(b)
    return None, s


def is_spaced_name_only(line):
    """「　　佐　　藤　　正　　子」のように、1〜3文字ずつ空白で区切られた名前だけの行か。"""
    chunks = [c for c in re.split("[　 ]+", line.strip(SP + " \t")) if c]
    if chunks and len(chunks[0]) >= 2 and re.search(r"(長|者|監|参事|理事|役)$", chunks[0]):
        return False  # 「区長　成　澤　…」のように肩書が先頭にある
    return len(chunks) >= 2 and all(len(c) <= 3 for c in chunks) and len(nospace(line)) <= 6


# ---------------------------------------------------------------- 本体
class Meeting:
    def __init__(self, path, info):
        self.path = path
        self.info = info  # 目録の情報（元の場所・形式など）
        self.issues = []
        self.withheld = []

    # ------------------------------------------------ 読み込み
    def load(self):
        paras, n_pd, n_tbl = read_document(self.path)
        # 契約の相手方の代表者の氏名を、読み込んだ直後に段落の中で隠す（企業名・所在地は残す。2026-10-27 先生の決定）
        self.contract_parties = []
        for p in paras:
            masked, parties = mask_representatives(p["text"])
            if parties:
                p["text"] = masked
                p["ptext"] = mask_representatives(p["ptext"])[0]
                p["masked_representatives"] = len(parties)
                for x in parties:
                    x["para"] = p["para"]
                    self.contract_parties.append(x)
        self.paras = paras
        self.n_pd, self.n_tbl = n_pd, n_tbl
        # 行の単位（段落の中のソフト改行も1行）
        self.lines = []
        for p in paras:
            for li, s in enumerate(p["text"].split("\n")):
                self.lines.append({"para": p["para"], "li": li, "text": s,
                                   "in_table": p["in_table"]})

    # ------------------------------------------------ 会議の情報
    def detect_body(self):
        first = next((nospace(x["text"]) for x in self.lines if nospace(x["text"])), "")
        self.title_raw = first
        self.is_committee = "委員会" in first or "協議会" in first
        name = re.sub(r"会議録", "", first)
        m = re.search(r"([①②③④⑤])$", name)
        self.volume = m.group(1) if m else None
        self.committee_name = re.sub(r"[①②③④⑤]$", "", name) if self.is_committee else None

    def committee_type(self):
        n = self.committee_name or ""
        if not self.is_committee:
            return None
        if "予算審査特別" in n:
            return "予算審査特別委員会"
        if "決算審査特別" in n:
            return "決算審査特別委員会"
        if "議会運営" in n:
            return "議会運営委員会"
        if "特別委員会" in n:
            return "特別委員会（調査など）"
        if "全員協議会" in n:
            return "全員協議会"
        if n in ("総務区民委員会", "厚生委員会", "建設委員会", "文教委員会"):
            return "常任委員会"
        return "不明（名前の一覧にない）"

    # ------------------------------------------------ 冒頭（名簿・付議事件）
    def parse_header(self):
        self.roster, self.agenda_planned = [], []
        self.date_text = self.place = None
        sec = None
        body_start = len(self.lines)
        group = []  # 本会議の説明員：複数行に分かれた肩書をまとめる
        for i, ln in enumerate(self.lines):
            t = ln["text"]
            s = nospace(t)
            if t.lstrip().startswith("○") or parse_time(t):
                body_start = i
                break
            if i == 0 or not s:
                if sec == "本会議説明員" and group:
                    self._flush_official_group(group)
                    group = []
                continue
            if SEP_LINE_RE.match(t):
                continue
            m = re.match(r"^[\s　]*[０-９0-9]+[\s　]+(.+)$", t)
            head = None
            if m and len(nospace(m.group(1))) <= 20 and not re.search(r"号|第", m.group(1)):
                head = re.sub(r"[（(].*?[）)]", "", nospace(m.group(1)))
            elif not self.is_committee and s in ("出席議員", "欠席議員", "欠員", "出席説明員",
                                                  "事務局職員", "議事日程", "説明のため出席した者"):
                head = s
            if head:
                if sec == "本会議説明員" and group:
                    self._flush_official_group(group)
                    group = []
                sec = {"開会年月日": "開会年月日", "開議年月日": "開会年月日",
                       "開会場所": "開会場所", "出席委員": "出席委員", "欠席委員": "欠席委員",
                       "欠席議員": "欠席委員" if self.is_committee else "欠席議員",
                       "委員外議員": "委員外議員", "出席説明員": "出席説明員" if self.is_committee else "本会議説明員",
                       "説明のため出席した者": "本会議説明員",
                       "事務局職員": "事務局職員", "本日の付議事件": "付議事件", "議事日程": "付議事件",
                       "出席議員": "出席委員" if self.is_committee else "出席議員",
                       "欠員": "欠員"}.get(head, "その他:" + head)
                if self.is_committee and head == "出席議員":
                    self.issues.append(f"段落{ln['para']}: 委員会の名簿の見出しが「出席議員」（出席委員として読んだ）")
                continue
            para = ln["para"]
            if sec == "開会年月日":
                self.date_text = s
            elif sec == "開会場所":
                self.place = s
            elif sec in ("出席委員", "委員外議員", "欠席委員", "欠席議員", "欠員"):
                if s in ("なし", "無し"):
                    continue
                if sec in ("欠席議員", "欠員") and not self.is_committee:
                    seat, name = self._split_seat(t)
                    self.roster.append({"section": sec, "role": None, "name": name, "seat": seat,
                                        "raw": t.strip(SP + " \t"), "para": para})
                    continue
                role, name = split_member_line(t)
                if role is None:
                    self.issues.append(f"段落{para}: 名簿（{sec}）で肩書と氏名を分けられず、氏名欄にまとめた")
                self.roster.append({"section": sec, "role": role, "name": name, "seat": None,
                                    "raw": t.strip(SP + " \t"), "para": para})
            elif sec == "出席議員":
                seat, name = self._split_seat(t)
                self.roster.append({"section": sec, "role": "議員", "name": name, "seat": seat,
                                    "raw": t.strip(SP + " \t"), "para": para})
            elif sec == "出席説明員":
                if s in ("なし", "無し"):
                    continue
                role, name = split_official_line(t)
                if role is None:
                    self.issues.append(f"段落{para}: 説明員の行で氏名と肩書を分けられず：{s}")
                self.roster.append({"section": sec, "role": role, "name": name, "seat": None,
                                    "raw": t.strip(SP + " \t"), "para": para})
            elif sec == "本会議説明員":
                group.append((t, para))  # 空行か次の見出しで、まとめて読む（_flush_official_group）
            elif sec == "事務局職員":
                role, name = split_staff_line(t)
                if role is None:
                    self.issues.append(f"段落{para}: 事務局職員の行で肩書と氏名を分けられず：{s}")
                self.roster.append({"section": sec, "role": role, "name": name, "seat": None,
                                    "raw": t.strip(SP + " \t"), "para": para})
            elif sec == "付議事件":
                rec = self._agenda_item(t, para)
                if rec["level"] is None and self.agenda_planned and self.agenda_planned[-1]["level"] is not None:
                    # 長い件名が次の行に折り返している → 前の項目の続き
                    prev = self.agenda_planned[-1]
                    prev["raw"] += s
                    prev["title"] = (prev["title"] or "") + s
                    prev["refs"] = find_refs(prev["raw"])
                    prev.setdefault("paras", [prev["para"]]).append(para)
                else:
                    self.agenda_planned.append(rec)
                lm = re.match(r"^(講師|参考人)[\s　]+(.+?)[\s　]+([^\s　]+?)(氏|さん)?$", t.strip(SP + " \t"))
                if lm:
                    self.roster.append({"section": "講師・参考人（付議事件の欄）", "role": lm.group(1),
                                        "name": nospace(lm.group(3)), "seat": None, "affiliation": nospace(lm.group(2)),
                                        "raw": s, "para": para})
            elif sec and sec.startswith("その他:"):
                self.roster.append({"section": sec[4:], "role": None, "name": s, "seat": None,
                                    "raw": t.strip(SP + " \t"), "para": para})
                self.issues.append(f"段落{para}: 見出し「{sec[4:]}」は想定外の名簿区分（文字のまま記録）")
        if group:
            self._flush_official_group(group)
        self.body_start = body_start

    def _split_seat(self, t):
        s = t.strip(SP + " \t")
        m = re.match(rf"^([{NUMCH}]+)番[\s　]+(.+)$", s)
        if m:
            return kan2int(m.group(1)), nospace(m.group(2))
        return None, nospace(s)

    def _flush_official_group(self, group):
        """本会議の説明員（肩書が先）。空行で区切られたまとまりを上から読む。

        - 「区長　　成　　澤　　廣　　修」：肩書＋氏名の行
        - 「　　佐　　藤　　正　　子」：氏名だけの行（肩書は前後の行にある）
        - 「福祉部長」「兼福祉事務所長」「文京保健所参事」：肩書の断片だけの行
          → 氏名の行より前の断片は次の人の肩書の頭、後ろの断片は（「兼」で始まる・前の肩書が「・」で終わる・
             肩書が複数行の人のとき）前の人の肩書の続きとしてつなぐ。
        """
        pending, last, multi = [], None, False
        for t, para in group:
            raw = t.strip(SP + " \t")
            chunks = [c for c in re.split("　{2,}", raw) if c]
            if is_spaced_name_only(t):
                role_part, name = "", nospace(raw)
            elif len(chunks) >= 2:
                role_part, name = nospace(chunks[0]), nospace("".join(chunks[1:]))
            else:
                frag = nospace(raw)
                if last is not None and not pending and (frag.startswith("兼") or (last["role"] or "").endswith("・") or multi):
                    last["role"] = (last["role"] or "") + frag
                    last["raw"] += " / " + raw
                    last["note"] = "肩書が複数行に分かれていたのをつないだ"
                else:
                    pending.append((frag, raw))
                continue
            role = "".join(f for f, _ in pending) + role_part
            multi = bool(pending)
            rec = {"section": "出席説明員", "role": role or None, "name": name, "seat": None,
                   "raw": " / ".join([r for _, r in pending] + [raw]), "para": para}
            if pending:
                rec["note"] = "肩書が複数行に分かれていたのをつないだ"
            self.roster.append(rec)
            last, pending = rec, []
        for frag, raw in pending:
            self.roster.append({"section": "出席説明員", "role": frag, "name": "", "seat": None, "raw": raw,
                                "para": group[-1][1]})
            self.issues.append(f"段落{group[-1][1]}: 本会議の説明員の行で氏名が見つからず：{frag}")

    def _agenda_item(self, t, para):
        s = t.strip(SP + " \t")
        rec = {"para": para, "raw": s, "level": None, "label": None, "refs": [], "title": None}
        m = re.match(r"^[（(]([0-9０-９]+)[）)][\s　]*(.+)$", s)
        m2 = re.match(r"^([0-9０-９]+)[）)][\s　]*(.+)$", s)
        m3 = re.match(r"^([アイウエオカキクケコ])[\s　]+(.+)$", s)
        m4 = re.match(rf"^日程第([{NUMCH}]+)[\s　]*(.+)$", s)
        if m:
            rec.update(level=1, label=m.group(1), title=m.group(2))
        elif m2:
            rec.update(level=2, label=m2.group(1), title=m2.group(2))
        elif m3:
            rec.update(level=3, label=m3.group(1), title=m3.group(2))
        elif m4:
            rec.update(level=1, label="日程第" + m4.group(1), title=m4.group(2))
        else:
            rec.update(level=None, title=s)
        rec["refs"] = find_refs(s)
        return rec

    # ------------------------------------------------ 本文
    def parse_body(self):
        known = set()
        for ln in self.lines[self.body_start:]:
            t = ln["text"].lstrip(SP + " \t")
            if t.startswith("○"):
                m = re.match(r"^○([^\s　]+)[\s　]", t)
                if m:
                    known.add(m.group(1))
        self.items = []      # 時刻・区切り線・請願文書表・発言 などを順番に
        self.speeches = []
        self.stage = []
        self.times = []
        cur = None
        mode = "body"        # body / petition / appendix
        pet = None
        pet_field = None

        def flush():
            nonlocal cur
            if cur:
                cur["text"] = "\n".join(x for x in cur.pop("_lines")).strip("\n")
                self.speeches.append(cur)
                self.items.append({"kind": "発言", "seq": cur["seq"], "para": cur["para_start"]})
            cur = None

        def close_pet():
            nonlocal pet, mode
            if pet:
                self.items.append(pet)
            pet = None
            mode = "body"

        for ln in self.lines[self.body_start:]:
            t, para = ln["text"], ln["para"]
            st = t.strip(SP + " \t")
            if ln.get("in_table"):
                # 表の中の文字は発言の本文に混ぜない（専決処分の表など。個人情報の判定は detect_personal）
                if not any(it["kind"] == "表" and it["para"] == para for it in self.items[-3:]):
                    self.items.append({"kind": "表", "para": para, "table": ln["in_table"][0],
                                       "inside_seq": cur["seq"] if cur else None})
                if cur:
                    cur.setdefault("tables_inside", [])
                    ti = ln["in_table"][0]
                    if ti not in cur["tables_inside"]:
                        cur["tables_inside"].append(ti)
                        # 本文には表の中身を入れず、表の位置と非公開の欄の印を置く（印の付け方をそろえる）
                        tps = [p["para"] for p in self.paras if p["in_table"] and p["in_table"][0] == ti]
                        whr = sorted({w["reason"] for w in self.withheld if w["para"] in set(tps)})
                        ph = f"［表{ti}（段落{min(tps)}〜{max(tps)}。中身は原文の層）" + (f"。非公開：{'、'.join(whr)}］" if whr else "］")
                        cur["_lines"].append(ph)
                        cur["para_end"] = max(cur["para_end"], max(tps))
                continue
            if not st:
                continue
            tm = parse_time(st)
            if tm and mode != "petition":
                flush()
                rec = {"kind": "時刻", "para": para, "text": st, **tm,
                       "hhmm": f"{tm['hh']:02d}:{tm['mm']:02d}"}
                self.times.append(rec)
                self.items.append(rec)
                if tm["event"] in ("閉会", "散会", "延会"):
                    mode = "appendix"
                continue
            if SEP_LINE_RE.match(t):
                flush()
                close_pet()
                self.items.append({"kind": "区切り線", "para": para})
                continue
            if DOT_LINE_RE.match(t):
                flush()
                self.items.append({"kind": "点線（請願文書表の区切り）", "para": para})
                if mode == "petition":
                    close_pet()
                else:
                    mode = "petition"
                    pet = {"kind": "請願文書表", "para_start": para, "para_end": para, "fields": []}
                continue
            if st.startswith("・受理年月日") and mode != "petition":
                flush()
                mode = "petition"
                pet = {"kind": "請願文書表", "para_start": para, "para_end": para, "fields": []}
            if mode == "petition":
                if st.startswith("○"):
                    close_pet()
                else:
                    pet["para_end"] = para
                    fm = re.match(r"^・(受理年月日及び番号|件[\s　]*名|請[\s　]*願[\s　]*者|陳[\s　]*情[\s　]*者|紹介議員"
                                  r"|(?:請願|陳情)の要旨|付託委員会|(?:請願|陳情)理由|(?:請願|陳情)事項)[\s　]*(.*)$", st) \
                        or re.match(r"^・([^　\s]+)[　\s]*(.*)$", st)
                    if st.startswith("・"):
                        key = nospace(fm.group(1)) if fm else nospace(st)
                        pet_field = key
                        val = fm.group(2) if fm and fm.lastindex and fm.lastindex >= 2 else ""
                        pet["fields"].append({"field": key, "para": para, "lines": [val] if val else []})
                    elif pet["fields"]:
                        pet["fields"][-1]["lines"].append(st)
                    else:
                        pet["fields"].append({"field": "（見出しなし）", "para": para, "lines": [st]})
                    if pet_field and "請願者" in pet_field or (pet_field and "陳情者" in pet_field):
                        self.withhold(para, "請願文書表の請願者の欄（住所・氏名）")
                    continue
            if mode == "appendix" and not st.startswith("○"):
                sign = bool(re.match(r"^(議長|副議長|議員|委員長)$", nospace(st)) or re.match(r"^(議[\s　]*長|副[\s　]*議[\s　]*長|議[\s　]*員|委[\s　]*員[\s　]*長)[\s　]{2,}", st))
                self.items.append({"kind": "付属資料", "para": para, "text": st,
                                   "looks_like": "会議録の署名欄" if sign else None})
                if not sign:
                    self.issues.append(f"段落{para}: 閉会・散会のあとに文字がある（付属資料として別に記録）")
                continue
            if st.startswith("○"):
                flush()
                body = st[1:]
                m = re.match(r"^([^\s　]+)[\s　]+(.*)$", body)
                if m:
                    label, text = m.group(1), m.group(2)
                else:
                    hit = sorted([k for k in known if body.startswith(k)], key=len, reverse=True)
                    if hit:
                        label, text = hit[0], body[len(hit[0]):]
                        self.issues.append(f"段落{para}: 発言者と本文の間に空白がない → 「{label}」と判断"
                                           if text else f"段落{para}: 「○{label}」だけの行（本文は次の行）")
                    else:
                        label, text = body, ""
                        self.issues.append(f"段落{para}: 発言者の表記だけの行（要確認）：{body[:30]}")
                cur = {"seq": len(self.speeches) + 1, "para_start": para, "para_end": para,
                       "label": label, "_lines": [text.strip(SP + " ")] if text.strip(SP + " ") else [],
                       "stage_inside": []}
                continue
            if STAGE_RE.match(st):
                rec = {"kind": "ト書き", "para": para, "text": st,
                       "inside_seq": cur["seq"] if cur else None,
                       "after_seq": cur["seq"] if cur else (self.speeches[-1]["seq"] if self.speeches else None)}
                self.stage.append(rec)
                self.items.append(rec)
                if cur:
                    cur["stage_inside"].append(para)
                continue
            if cur is None:
                self.items.append({"kind": "発言者のいない段落", "para": para, "text": st})
                self.issues.append(f"段落{para}: 発言者のいない段落：{st[:30]}")
                continue
            wh = {w["para"]: w["reason"] for w in self.withheld}
            if para in wh:
                # 非公開の段落の文字は発言の本文に入れず、印だけを置く
                ph = f"［非公開：{wh[para]}］"
                if not cur["_lines"] or cur["_lines"][-1] != ph:
                    cur["_lines"].append(ph)
                cur["para_end"] = para
                continue
            cur["_lines"].append(st)
            cur["para_end"] = para
        flush()
        close_pet()
        # 時刻の行の食い違い（原文の誤記の可能性）。直さずに印だけ
        prev = None
        for i, t in enumerate(self.times):
            notes = []
            if i > 0 and t["event"] in ("開会", "開議"):
                notes.append(f"2回目以降の時刻の行が「{t['event']}」。休憩・再開の誤記の可能性")
            if prev and (t["hh"], t["mm"]) < (prev["hh"], prev["mm"]):
                notes.append(f"時刻が前の行（{prev['hhmm']}）より早い。午前・午後の誤記の可能性")
            if prev and prev["event"] in ("閉会", "散会") and t["event"] in ("再開", "休憩"):
                notes.append(f"閉会・散会のあとに「{t['event']}」。閉会の誤記の可能性")
            if notes:
                t["possible_typo"] = "；".join(notes) + "（原文のまま。直していない）"
                self.issues.append(f"段落{t['para']}: 時刻の行「{t['text']}」：{t['possible_typo']}")
            prev = t

    def withhold(self, para, reason):
        if not any(w["para"] == para for w in self.withheld):
            self.withheld.append({"para": para, "reason": reason})

    def detect_personal(self):
        """請願者の欄以外の個人情報（人事案件の住所・生年月日、専決処分の表の相手方）を探す。"""
        # 「相手方」は区の提案説明の契約の相手方（会社名など）にも出るので、行の判定には使わない（2026-10-26 先生の決定で残す）
        pat = re.compile(rf"生年月日|[{NUMCH}]+年[{NUMCH}]+月[{NUMCH}]+日生|^住所|現住所|略歴")
        # 請願者・陳情者の欄：「・請　願　者」の行から、次の「・」の欄・空行・番号の見出しまで（委員長報告の一覧の中も）
        inpet = False
        for p in self.paras:
            t = nospace(p["text"])
            if re.match(r"^・(請願者|陳情者)", t):
                inpet = True
            elif inpet and (not t or t.startswith("・") or t.startswith("○") or re.match(r"^[一二三四五六七八九十0-9０-９]+(請願|陳情)", t)):
                inpet = False
            if inpet:
                self.withhold(p["para"], "請願者・陳情者の欄（住所・氏名）")
        # 人事案件の議案文：「下記の者を選任／任命／推薦…」のあとの「記」から、次の発言（○）・時刻の行までを丸ごと保存しない
        block = False
        armed = False
        for p in self.paras:
            t = nospace(p["text"])
            if block:
                if t.startswith("○") or parse_time(p["text"]) or SEP_LINE_RE.match(p["text"]) or re.match(rf"^(追加)?日程第[{NUMCH}]+", t):
                    block = False
                elif t:
                    self.withhold(p["para"], "人事案件の議案文（氏名・住所・生年月日・略歴）")
                continue
            if re.search(r"(下記|左記)の者を.*(選任|任命|推薦|同意|諮問)", t):
                # 議員を公職の候補者として推薦する議案（広域連合議会議員の選挙など）は、私人の情報ではないので対象外
                if not re.search(r"議会議員|議員提出議案", t):
                    armed = True
                continue
            if armed and t == "記":
                block = True
                armed = False
                continue
            if t.startswith("○"):
                armed = False
        # 表：中に「相手方・損害賠償・住所・氏名」がある表は、表全体の文字を保存しない（専決処分の損害賠償の表など）
        tables = {}
        for p in self.paras:
            if p["in_table"]:
                tables.setdefault(p["in_table"][0], []).append(p)
        # 表：「相手方・住所・氏名・生年月日」の欄だけを保存しない（件名・和解の内容・損害賠償額・決定年月日は残す）
        key = r"相手方|住所|氏名|生年月日"
        for ti, ps in tables.items():
            cells = {}
            for p in ps:
                _, ri, ci = p["in_table"]
                cells.setdefault((ri, ci), []).append(p)
            txt = {k: nospace("".join(p["text"] for p in v)) for k, v in cells.items()}
            if not any(re.search(key, t) for t in txt.values()):
                continue
            # 見出しのマス：「相手方」「住所」「氏名」だけが書かれた短いマス（文の中の「相手方」は見出しではない）
            label = {k for k, t in txt.items() if len(t) <= 20 and re.search(r"^(相手方|住所|氏名|生年月日)|(相手方|住所|氏名|生年月日)$", t)}
            row0_labels = [k for k, t in txt.items() if k[0] == 0 and len(t) <= 10]
            col_mode = any(k[0] == 0 for k in label) and len(row0_labels) >= 3
            hit = False
            for (ri, ci), v in cells.items():
                if (ri, ci) in label:
                    continue
                if col_mode:
                    target = any(lc == ci and ri > lr for (lr, lc) in label)
                else:
                    # 2列の表（中身｜見出し）：見出しのマスと同じ行の、ほかのマスが中身
                    target = any(lr == ri for (lr, lc) in label)
                if target and re.fullmatch(r"別紙のとおり|なし", txt[(ri, ci)]):
                    hit = True  # 中身が「別紙のとおり」だけなら個人の情報はないので残す
                    continue
                if target:
                    hit = True
                    for p in v:
                        self.withhold(p["para"], f"表{ti}の相手方などの欄（氏名・住所）")
            if not hit:
                # 欄の位置が分からない（1つのマスの中に「相手方　氏名」と並ぶ形など）→ その言葉を含むマスだけ
                for k, v in cells.items():
                    if re.search(key, txt[k]):
                        for p in v:
                            self.withhold(p["para"], f"表{ti}の相手方などを含むマス（欄の位置が分からないためマスごと。要確認）")
        for p in self.paras:
            t = nospace(p["text"])
            if p["in_table"]:
                continue
            elif pat.search(t):
                # 本文の中の言葉としての「相手方」などは多いので、短い行（議案文の欄）だけを対象にする
                if len(t) <= 60 and not t.startswith("○"):
                    self.withhold(p["para"], "人事案件などの住所・生年月日・略歴らしい行（要確認）")

    # ------------------------------------------------ 発言者の特定
    def resolve_speakers(self):
        council = [r for r in self.roster if r["section"] in ("出席委員", "委員外議員", "出席議員")]
        officials = [r for r in self.roster if r["section"] == "出席説明員"]
        staff = [r for r in self.roster if r["section"] == "事務局職員"]
        cache = {}
        for sp in self.speeches:
            lb = sp["label"]
            if lb not in cache:
                cache[lb] = self._resolve(lb, council, officials, staff)
            sp["speaker"] = dict(cache[lb])

    def _resolve(self, label, council, officials, staff):
        lab = nospace(label)
        out = {"full_name": "", "role": "", "kind": "不明", "how": "", "note": ""}
        # 本会議：「議長（宮崎文雄）」「区長（成澤廣修）」
        m = re.match(r"^(.+?)[（(](.+?)[）)]$", lab)
        if m and not self.is_committee:
            role, name = m.group(1), m.group(2)
            out.update(full_name=name, role=role, how="表記の括弧内の氏名")
            out["kind"] = "議長" if role in ("議長", "副議長") else "理事者"
            if role in ("議長", "副議長") and not any(r["name"] == name for r in council):
                out["note"] = "出席議員の名簿に同じ名前がない"
            return out
        # 本会議：「萬立幹夫議員」
        if not self.is_committee and lab.endswith("議員"):
            name = lab[:-2]
            hit = [r for r in council if r["name"] == name]
            out.update(role="議員", kind="議員")
            if len(hit) == 1:
                out.update(full_name=name, how="出席議員の名簿と一致")
            else:
                out.update(full_name="", how="", note="出席議員の名簿に見つからず空欄")
            return out
        # 委員会：議員側
        for role in COUNCIL_ROLES:
            if not lab.endswith(role):
                continue
            base = lab[: -len(role)]
            if base == "":
                holders = [r for r in council if r["role"] == role]
                if len(holders) == 1:
                    out.update(full_name=holders[0]["name"], role=role, kind=self._ckind(role),
                               how="肩書だけの表記。名簿でその肩書の人が1人")
                else:
                    out.update(role=role, kind=self._ckind(role), note=f"肩書だけの表記で候補{len(holders)}人")
                return out
            mm = re.match(r"^(.+?)[（(](.+?)[）)]$", base)
            sur, hint = (mm.group(1), mm.group(2)) if mm else (base, None)
            cands = [r for r in council if r["name"].startswith(sur)]
            if hint:
                cands = [r for r in cands if r["name"][len(sur):].startswith(hint)]
            cands = [r for r in cands if self._role_ok(r, role)]
            if len(cands) == 1:
                out.update(full_name=cands[0]["name"], role=role, kind=self._ckind(role),
                           how="名字＋肩書が名簿と一致" + ("（同じ姓の書き分けの文字も一致）" if hint else ""),
                           roster_role=cands[0]["role"], roster_section=cands[0]["section"])
                return out
            if len(cands) > 1:
                out.update(role=role, kind=self._ckind(role), note=f"名簿に候補が{len(cands)}人（空欄）")
                return out
            if role in ("委員長代理", "委員長職務代理者"):
                # 名簿に「委員長代理」は無い。名字が副委員長と一致し、1人に決まるときだけ（要確認の印つき）
                dep = [r for r in council if r["role"] == "副委員長" and r["name"].startswith(sur)]
                if len(dep) == 1:
                    out.update(full_name=dep[0]["name"], role=role, kind="議員",
                               how="委員長代理の表記を、名字で名簿の副委員長と照合（要確認）")
                    return out
            if role in ("委員", "議員", "委員長", "副委員長", "委員長代理", "委員長職務代理者"):
                out.update(role=role, kind=self._ckind(role), note="名簿に見つからず空欄")
                # 理事者の肩書が「…委員」で終わることは少ないので、ここで止める
                return out
        # 講師・参考人（付議事件の欄に書かれた人）
        for r in [x for x in self.roster if x["section"].startswith("講師・参考人")]:
            if lab.endswith(r["role"]) and lab[: -len(r["role"])] and r["name"].startswith(lab[: -len(r["role"])]):
                out.update(full_name=r["name"], role=r["role"], kind="講師・参考人", how="付議事件の欄の講師・参考人と一致")
                return out
        # 理事者・事務局
        for group, kind in ((officials, "理事者"), (staff, "事務局")):
            hit = self._match_title(lab, group)
            if hit:
                r, how = hit
                out.update(full_name=r["name"], role=r["role"], kind=kind, how=how)
                return out
        out["note"] = "名簿と照合できず空欄"
        return out

    def _ckind(self, role):
        return {"委員長": "委員長", "議長": "議長", "副議長": "議長"}.get(role, "議員")

    def _role_ok(self, r, role):
        rr = r["role"] or ""
        if role in ("委員", "理事"):
            return r["section"] == "出席委員" and rr in ("委員", "理事") or (
                r["section"] == "委員外議員" and rr in ("委員", "議員"))
        if role == "議員":
            return r["section"] in ("委員外議員", "出席議員")
        return rr == role

    def _match_title(self, lab, group):
        cands = []
        for r in group:
            title = nospace(r["role"] or "")
            if not title:
                continue
            variants = {title, title.replace("事務取扱", "")}
            for part in re.split("兼", title):
                if part:
                    variants.add(part.replace("事務取扱", ""))
            name = r["name"]
            for k in range(min(len(name), 4), 0, -1):
                pre = name[:k]
                if not lab.startswith(pre):
                    continue
                rest = lab[k:]
                if not rest:
                    continue
                if rest in variants:
                    cands.append((r, "名字＋肩書が名簿と一致", k))
                    break
                if any(len(v) >= 3 and (v.endswith(rest) or rest.endswith(v) or rest in v) for v in variants) and len(rest) >= 2:
                    cands.append((r, "名字＋肩書の一部が名簿と一致（肩書の呼び方の違い）", k))
                    break
        if not cands:
            # 名字なしの肩書だけ（「区長」など）
            only = [r for r in group if nospace(r["role"] or "") == lab]
            if len(only) == 1:
                return only[0], "肩書だけの表記。名簿でその肩書の人が1人"
            return None
        exact = [c for c in cands if c[1] == "名字＋肩書が名簿と一致"]
        pool = exact or cands
        if len({id(c[0]) for c in pool}) == 1:
            return pool[0][0], pool[0][1]
        best = max(c[2] for c in pool)
        top = [c for c in pool if c[2] == best]
        if len({id(c[0]) for c in top}) == 1:
            return top[0][0], top[0][1] + "（名字の長さで1人に決めた）"
        return None

    # ------------------------------------------------ 進行役と発言の印
    PROGRESS_RE = re.compile(
        r"ございますか|ありますか|御質疑|態度表明をお願い|続きまして|^次に、|に入ります|に移ります|決定させていただきます"
        r"|よろしいでしょうか|よろしいですか|御覧ください|開会いたします|閉会いたします|再開いたします|休憩いたします"
        r"|(委員|議員|課長|部長|区長|教育長|所長|参事|局長|室長|館長|さん)。$")

    def mark_presiding(self):
        """進行役（その時に会議を進めている人）を、会議の流れから追う。

        - 最初は委員長（本会議は議長）。
        - 副委員長・委員長代理・座長・副議長などが進行の言葉（指名・「ございますか」など）を話したら、その人に交代したと推定。
        - 委員長が進行の言葉を話したら、委員長に戻ったと推定。どちらも「要確認」の印を付ける。
        """
        chair_roles = ("委員長", "委員長代理", "委員長職務代理者", "座長") if self.is_committee else ("議長", "副議長")
        deputy_roles = ("副委員長", "委員長代理", "委員長職務代理者", "座長", "副議長")
        official = None
        if self.is_committee:
            ch = [r for r in self.roster if r["section"] == "出席委員" and r["role"] == "委員長"]
            official = ch[0]["name"] if len(ch) == 1 else None
        presider = official
        for sp in self.speeches:
            role = sp["speaker"]["role"]
            who = sp["speaker"]["full_name"] or sp["label"]
            if presider is None and role in chair_roles:
                presider = official = who
            t = sp["text"]
            last_sent = split_sentences(t)[-1].strip(SP + " ") if t else ""
            progress = bool(self.PROGRESS_RE.search(last_sent)) or (
                len(nospace(t)) <= 40 and bool(self.PROGRESS_RE.search(t)))
            # 直前に進行役がこの人を指名していたら、この人は質問者（交代ではない）
            prev = self.speeches[sp["seq"] - 2] if sp["seq"] >= 2 else None
            nominated = bool(prev and (prev["speaker"]["full_name"] or prev["label"]) == presider and (
                re.sub(r"[（(].*", "", sp["label"])[:2] in split_sentences(prev["text"])[-1]
                or (sp["speaker"]["full_name"] and sp["speaker"]["full_name"] in nospace(prev["text"]))))
            if who == official and presider != official and progress:
                sp.setdefault("flags", []).append(f"進行役が委員長（議長）の「{who}」に戻ったと推定（要確認）")
                presider = official
            elif who != presider and role in deputy_roles and progress and not nominated:
                sp.setdefault("flags", []).append(f"進行役が「{presider}」から「{who}」に交代したと推定（要確認）")
                presider = who
            is_p = presider is not None and who == presider
            sp["is_presiding"] = is_p
            if is_p:
                # 「時間を延長させて」「本会議での委員会報告の一任」は進行（2026-10-26 検査の指摘）
                if re.search(r"就任|御挨拶|ごあいさつ|挨拶|超過時間|時間を超過|超過して|審査結果|結果を御報告|結果について申し上げ|黙禱|委員長報告", t):
                    sp["presiding_class"] = "役職としての報告・あいさつ"
                elif len(nospace(t)) > 150 and re.search(r"伺います|お聞きします|お尋ねします|質問します", t) and not re.search(
                        r"ございますか|御質疑|お願いします|よろしいでしょうか|よろしいですか", t):
                    sp["presiding_class"] = "質問・意見"
                    sp.setdefault("flags", []).append("進行役の質問・意見と推定（要確認）")
                else:
                    sp["presiding_class"] = "進行"
            elif role in chair_roles:
                sp["presiding_class"] = "質問・意見"
                sp.setdefault("flags", []).append("委員長・議長の肩書の人が、進行役でないときに話した（要確認）")
            else:
                sp["presiding_class"] = None
        # 関連質問：進行役の指名に「関連」があり、次に話した議員
        pending = False
        for sp in self.speeches:
            if sp.get("is_presiding"):
                pending = "関連" in sp["text"]
                continue
            if sp["speaker"]["kind"] == "議員":
                if pending or re.match(r"^(関連で|関連して|関連質問|関連なんですが|関連なんですけれども)", sp["text"]):
                    sp["related_question"] = True
                pending = False

    # ------------------------------------------------ 区切り（議題）の印
    MARKERS = [
        ("一般質問・終わり", re.compile(r"一般質問を(終了|終わ)")),
        ("一般質問", re.compile(r"一般質問(に入ります|に入りたい|を行います|に移ります|に移りたい|を始め|は[０-９0-9一二三四五六七八九十]+件|ですが|のある)|(引き続き(まして)?、?)一般質問|^一般質問、|日程第[一二三四五六七八九十]+、一般質問")),
        ("総括質疑", re.compile(r"総括(説明に対する)?質疑(に入ります|を行います|を行いたい|に入りたい|から始め)")),
        ("款別質疑", re.compile(r"(歳入|歳出|[0-9０-９]+款)[^。]{0,60}?(の質疑に入ります|の質疑を行います|の質疑から始め|の質疑に入りたい|の審査に入ります)"
                               r"|[0-9０-９]+款[^。]{0,40}から[^。]{0,40}まで[^。]{0,40}(部分でございます|部分です|を審査|の質疑)")),
        ("質疑の終わり", re.compile(r"(の質疑|審査)を終了")),
        ("態度表明", re.compile(r"態度表明")),
        ("採決", re.compile(r"採決(を|に入ります|いたします|を行います)|起立(多数|全員)|異議なしと認め|審査の結果")),
        ("議案", re.compile(r"(^|、|続きまして、|次に、)議案第[0-9０-９]+号")),
        ("請願・陳情", re.compile(r"(^|、|続きまして、|次に、)((請願|陳情)(受理)?|受理)第[0-9０-９]+号")),
        ("付託議案審査", re.compile(r"付託議案審査(に移ります|に入ります|１件|[0-9０-９]+件)")),
        ("付託請願審査", re.compile(r"付託(請願|陳情)審査")),
        ("理事者報告", re.compile(r"理事者報告(に入ります|に移ります|[0-9０-９]+件|は)|報告事項[0-9０-９]+[^。]{0,4}(、|の質疑)|^(まず、)?資料第[0-9０-９]+号")),
        ("その他", re.compile(r"^(続きまして、|次に、|では、|それでは、)?その他")),
        ("委員会報告", re.compile(r"本会議での委員会報告")),
        ("委員会記録", re.compile(r"委員会記録について")),
        ("閉会", re.compile(r"閉会(いたします|します)|散会(いたします|します)|延会")),
        ("日程", re.compile(rf"日程第[{NUMCH}]+")),
        ("一括", re.compile(r"一括")),
        ("提案説明", re.compile(r"提案(理由の)?説明")),
        ("委員長報告", re.compile(r"委員長(の)?報告")),
        ("討論", re.compile(r"討論")),
        ("選挙・人事", re.compile(r"選挙を行います|指名推選|同意|推薦")),
        ("請願の付託", re.compile(r"(請願|陳情)[^。]{0,20}付託")),
        ("議案質疑", re.compile(r"^(?!.*款).*(議案|報告)[^。]*質疑を行います")),
        ("代表質問", re.compile(r"代表質問")),
        ("研究会・講演", re.compile(r"研究会(に入ります|を始め|を開会)|参考人(から|の)(意見|御意見)")),
    ]
    OPENERS = {"一般質問", "総括質疑", "款別質疑", "態度表明", "採決", "議案", "請願・陳情", "理事者報告",
               "その他", "委員会報告", "委員会記録", "閉会", "日程", "付託議案審査", "付託請願審査", "研究会・講演"}

    OPEN_PRIORITY = ["議案", "請願・陳情", "款別質疑", "総括質疑", "一般質問", "研究会・講演", "理事者報告", "付議事件の件名",
                     "日程", "付託議案審査", "付託請願審査", "その他", "委員会報告", "委員会記録", "閉会",
                     "態度表明", "採決"]
    CLOSE_RE = re.compile(r"(質疑|審査|報告|議案審査|請願審査)を?(終了|終わ)")
    RESULT_RE = re.compile(r"可決すべき|否決すべき|承認すべき|認定すべき|採択とすべき|不採択とすべき|と決定(いたしました|します|いたします)"
                           r"|審査結果|結果を(御)?報告|結果について申し上げ|結果を申し上げ"
                           r"|(不)?採択[0-9０-９]+[、，]|(不)?採択[0-9０-９]+で|保留[0-9０-９]+")

    def mark_sections(self):
        budget = self.committee_type() in ("予算審査特別委員会", "決算審査特別委員会") or not self.is_committee
        markers = []
        for sp in self.speeches:
            if not sp.get("is_presiding"):
                continue
            overview = bool(re.search(r"委員会運営|運びにより|以上の運び", sp["text"]))
            reading = False  # 「書記より朗読いたします」のあとは朗読（報告書の文）なので区切りの印にしない
            for si, sent in enumerate(split_sentences(sp["text"])):
                ns = sent.strip(SP + " ")
                base = {"seq": sp["seq"], "sent": si, "wording": ns[:160], "refs": find_refs(ns)}
                if reading:
                    continue
                if re.search(r"朗読(いた)?します|朗読させ", ns):
                    reading = True
                    sp["reading_from_sentence"] = si + 1
                    sp.setdefault("flags", []).append(f"{si + 2}文目から朗読（報告書などの文）。朗読の中の言葉では区切らない")
                if overview or ns.startswith("その後"):
                    markers.append({**base, "kind": "運営の説明", "opens": False})
                    continue
                if ns.startswith("・") or re.match(r"^[一二三四五六七八九十]+[\s　]+(請願|陳情)", ns):
                    continue  # 請願の一覧の欄（・審査の結果 など）は区切りの印にしない
                if re.search(r"関連する理事者|理事者の出席|御出席", ns):
                    markers.append({**base, "kind": "理事者の出席", "opens": False})
                    continue
                if re.search(r"一般質問を(終了|終わ)|一般質問は(以上|終わり|終了)", ns):
                    markers.append({**base, "kind": "一般質問・終わり", "opens": False})
                    continue
                if self.CLOSE_RE.search(ns):
                    markers.append({**base, "kind": "質疑などの終わり", "opens": False})
                    continue
                if self.RESULT_RE.search(ns):
                    markers.append({**base, "kind": "採決結果", "opens": False})
                    continue
                for kind, rx in self.MARKERS:
                    if kind in ("一般質問・終わり", "質疑の終わり"):
                        continue
                    if rx.search(ns):
                        opens = kind in self.OPENERS and (budget or kind not in ("態度表明", "採決"))
                        markers.append({**base, "kind": kind, "opens": opens})
        # 付議事件の件名（2段目・3段目と日程）が進行役の文に出たら、その議題の始まりの印
        for ai, ag in enumerate(self.agenda_planned):
            title = nospace(re.sub(r"[「」『』]", "", ag.get("title") or ""))
            generic = re.fullmatch(r"(付託)?(議案|請願|陳情)(審査)?|理事者報告|一般質問|予算審査|決算審査|協議事項|その他"
                                   r"|付託議案審査|付託請願審査|付託陳情審査", title)
            if len(title) < 6 or ag["level"] is None or (ag["level"] == 1 and generic):
                continue
            for sp in self.speeches:
                if not sp.get("is_presiding") or re.search(r"委員会運営|運びにより", sp["text"]):
                    continue
                for si, sent in enumerate(split_sentences(sp["text"])):
                    if title[:20] in nospace(re.sub(r"[「」『』]", "", sent)) and not self.RESULT_RE.search(sent) \
                            and not self.CLOSE_RE.search(sent):
                        markers.append({"seq": sp["seq"], "sent": si, "kind": "付議事件の件名",
                                        "wording": ag["raw"][:120], "opens": True, "agenda_index": ai,
                                        "refs": ag["refs"]})
                        break
                else:
                    continue
                break
        markers.sort(key=lambda m: (m["seq"], m["sent"]))
        self.markers = markers
        # 1つの発言で開く印は1つだけ（いちばん具体的なもの）
        by_seq = OrderedDict()
        for m in markers:
            if m["opens"]:
                by_seq.setdefault(m["seq"], []).append(m)
        chosen = {}
        for q, ms in by_seq.items():
            # 同じ発言の中では、いちばん具体的な種類を選び、同じ種類なら後ろの文（次の議題の始まり）を選ぶ
            ms.sort(key=lambda m: (self.OPEN_PRIORITY.index(m["kind"]) if m["kind"] in self.OPEN_PRIORITY else 99, -m["sent"]))
            chosen[q] = ms[0]
            # 予算・決算の特別委員会：同じ発言に「議案第◯号を議題」と款の宣言があれば、款を優先して「款別質疑」にする
            if self.committee_type() in ("予算審査特別委員会", "決算審査特別委員会"):
                kb = [m for m in ms if m["kind"] == "款別質疑"]
                if kb and ms[0]["kind"] == "議案":
                    chosen[q] = kb[0]
        sections = []
        cur = {"id": 0, "kind": "開会・委員会運営", "start_seq": 1, "markers": [], "agenda_refs": []}
        sections.append(cur)
        for m in markers:
            ch = chosen.get(m["seq"])
            if ch is m:
                cur_refs = {r for x in cur["markers"] for r in x.get("refs", [])
                            if x["kind"] not in ("理事者の出席", "運営の説明")}
                same_kind_cont = (m["kind"] == "一般質問" and cur["kind"] == "一般質問") or (
                    m["kind"] in ("議案", "請願・陳情") and cur["kind"] == m["kind"] and m.get("refs")
                    and set(m["refs"]) <= cur_refs)
                if same_kind_cont:
                    pass
                elif m["seq"] == 1 and cur["id"] == 0:
                    cur["kind"] = m["kind"]
                else:
                    cur = {"id": len(sections), "kind": m["kind"], "start_seq": m["seq"], "markers": [],
                           "agenda_refs": [], "_start_sent": m["sent"]}
                    sections.append(cur)
            # 同じ発言の中で、開く印より前の文の印（「以上で…を終了」など）は前の区切りへ
            if ch is not None and m["seq"] == ch["seq"] and m["sent"] < ch["sent"] and len(sections) >= 2 \
                    and cur["start_seq"] == m["seq"] and cur is not sections[0]:
                sections[-2]["markers"].append(m)
                continue
            cur["markers"].append(m)
        for i, s in enumerate(sections):
            s["end_seq"] = sections[i + 1]["start_seq"] - 1 if i + 1 < len(sections) else len(self.speeches)
            if s["end_seq"] < s["start_seq"]:
                s["end_seq"] = s["start_seq"]
            refs = OrderedDict()
            for m in s["markers"]:
                if m["kind"] in ("理事者の出席", "運営の説明"):
                    continue
                for r in m.get("refs", []):
                    refs[r] = True
            s["refs"] = list(refs)
            # 付議事件とのひも付け（多対多）：参照番号か件名（先頭15文字）が一致したもの
            idx = []
            open_text = nospace("".join(m["wording"] for m in s["markers"] if m["kind"] not in ("理事者の出席", "運営の説明")))
            open_text = re.sub(r"[「」『』]", "", open_text)
            for ai, ag in enumerate(self.agenda_planned):
                t15 = nospace(re.sub(r"[「」『』]", "", ag.get("title") or ""))
                t15 = re.sub(r"^(議案|報告|請願|陳情)?(受理)?第[0-9０-９]+号", "", t15)[:15]
                if any(m.get("agenda_index") == ai for m in s["markers"]) or (
                        set(ag["refs"]) & set(s["refs"])) or (len(t15) >= 8 and t15 in open_text):
                    idx.append(ai)
            s["agenda_refs"] = idx
            s["results"] = [m["wording"] for m in s["markers"]
                            if m["kind"] in ("採決結果", "採決") or re.search(r"起立(多数|全員)|異議なしと認め", m["wording"])]
            bm = next((m for m in s["markers"] if m["kind"] in ("款別質疑", "総括質疑")), None)
            if s["kind"] in ("款別質疑", "総括質疑") or bm:
                before = ""
                if bm:
                    spx = next((x for x in self.speeches if x["seq"] == bm["seq"]), None)
                    if spx:
                        before = "".join(split_sentences(spx["text"])[: bm["sent"]])
                b = budget_scope(bm["wording"] if bm else "", before)
                # 同じ発言にも書かれていなければ、同じ日の前の款別の区切りの会計・歳入歳出を引き継ぐ（印つき）
                prev = next((x["budget_scope"] for x in reversed(sections[:i]) if x.get("budget_scope")), None)
                if prev and s["kind"] == "款別質疑":
                    if not b["accounts"] and prev["accounts"]:
                        b["accounts"] = prev["accounts"]
                        b["inherited_from_same_speech"].append("会計（前の区切りから）")
                    if not b["sides"] and prev["sides"]:
                        b["sides"] = prev["sides"]
                        b["inherited_from_same_speech"].append("歳入歳出（前の区切りから）")
                s["budget_scope"] = b
            s["markers"] = [{k: v for k, v in m.items() if k not in ("opens", "sent")} for m in s["markers"]]
        sp_by = {sp["seq"]: sp for sp in self.speeches}
        # 1つの発言が2つの議題にまたがるとき（「…決定いたしました。続きまして、受理第２号、…」など）は、
        # 区切りの始まりを「発言番号＋文の番号＋文字の位置」で記録し、発言にも印を付ける
        for s in sections:
            si = s.pop("_start_sent", 0)
            sp = sp_by.get(s["start_seq"])
            # 前の文に、前の議題を締める言葉（採決の結果・「以上で…を終了」）があるときだけ「またがる」とする
            closes_before = any(m["seq"] == s["start_seq"] and m["sent"] < si and m["kind"] in (
                "採決結果", "質疑などの終わり", "一般質問・終わり", "採決") for m in self.markers)
            if si and sp and closes_before:
                sents = split_sentences(sp["text"])
                pos = 0
                for k in range(si):
                    j = sp["text"].find(sents[k].strip("\n"), pos)
                    if j >= 0:
                        pos = j + len(sents[k].strip("\n"))
                j = sp["text"].find(sents[si].strip("\n").strip(SP + " "), pos)
                off = j if j >= 0 else None
                s["starts_mid_speech"] = {"seq": sp["seq"], "sentence_index": si, "char_offset": off,
                                          "sentence_head": sents[si].strip(SP + " \n")[:40]}
                sp.setdefault("flags", []).append(
                    f"この発言の途中で議題が変わる（{si + 1}文目・{off}文字目から区切り{s['id']}「{s['kind']}」）")
                sp["sections_spanned"] = [s["id"] - 1, s["id"]]
        for s in sections:
            for q in range(s["start_seq"], s["end_seq"] + 1):
                if q in sp_by:
                    sp_by[q]["section_id"] = s["id"]
            s["start_para"] = sp_by[s["start_seq"]]["para_start"] if s["start_seq"] in sp_by else None
            # 態度表明（本人が明言した賛否）は文言のまま
            stances = []
            if s["kind"] in ("議案", "請願・陳情", "態度表明", "付議事件の件名", "採決"):
                for q in range(s["start_seq"], s["end_seq"] + 1):
                    sp = sp_by.get(q)
                    if sp and sp["speaker"]["kind"] == "議員" and not sp.get("is_presiding"):
                        for sent in split_sentences(sp["text"]):
                            if re.search(r"賛成|反対|採択|不採択|保留|継続", sent) and len(sent) <= 120:
                                stances.append({"seq": q, "label": sp["label"],
                                                "full_name": sp["speaker"]["full_name"], "wording": sent.strip(SP)})
                                break
            s["stances_as_stated"] = stances
        self.sections = sections

    # ------------------------------------------------ 参照資料
    REF_RE = re.compile(
        r"資料第[0-9０-９]+号(?:の[0-9０-９]+)?(?:[、，]?\s*[「『][^」』]{1,60}[」』])?"
        r"|資料[0-9０-９]+(?:「[^」]{1,60}」)?"
        r"|報告事項[0-9０-９]+"
        r"|(?:議案集|議案書|請願文書表(?:のデータ)?|予算事項別明細書|事項別明細書|主要施策の成果|決算書|予算書|予算案の概要)の?[0-9０-９]+ページ"
        r"|(?:議案|報告|諮問|請願|陳情)(?:受理)?第[0-9０-９]+号")

    def mark_references(self):
        refs = []
        sec_kind = {s["id"]: s["kind"] for s in self.sections}
        for sp in self.speeches:
            for m in self.REF_RE.finditer(sp["text"]):
                w = m.group(0)
                refs.append({"seq": sp["seq"], "section_id": sp.get("section_id"),
                             "section_kind": sec_kind.get(sp.get("section_id")),
                             "by_presider": bool(sp.get("is_presiding")), "wording": w,
                             "form": ref_form(w)})
        self.references = refs

    # ------------------------------------------------ 一般質問の範囲と項目
    def general_question(self):
        gq = {"found": False, "start_declarations": 0, "end_marker": None}
        starts = [m for m in self.markers if m["kind"] == "一般質問"]
        ends = [m for m in self.markers if m["kind"] == "一般質問・終わり"]
        gq["start_declarations"] = len(starts)
        gq["end_declarations"] = len(ends)
        if not starts:
            self.gq = gq
            return
        s_seq = starts[0]["seq"]
        end_seq, end_kind = None, None
        e = [m for m in ends if m["seq"] > s_seq]
        if not self.is_committee:
            # 本会議：「本日の日程は終了…散会」や次の日程に入る議長の発言は、一般質問の範囲の外
            stop = None
            for sp in self.speeches:
                if sp["seq"] <= s_seq or not sp.get("is_presiding"):
                    continue
                if re.search(r"日程は(全部)?終了|散会|延会", sp["text"]):
                    stop = (sp["seq"], "本日の日程の終了・散会の宣言（その発言は範囲の外）")
                    break
                if re.search(rf"日程第(?!一[、，])[{NUMCH}]+", sp["text"]) and not re.search(r"一般質問", sp["text"]):
                    stop = (sp["seq"], "次の日程に入る宣言（その発言は範囲の外）")
                    break
            end_seq, end_kind = (stop[0] - 1, stop[1]) if stop else (len(self.speeches), "見つからず（最後の発言まで）")
            e = []
            gq_end_given = True
        else:
            gq_end_given = False
        if gq_end_given:
            pass
        elif e:
            end_seq, end_kind = e[0]["seq"], "①委員長の終了宣言"
        else:
            o = [m for m in self.markers if m["seq"] > s_seq and m["kind"] == "その他"]
            c = [m for m in self.markers if m["seq"] > s_seq and m["kind"] == "閉会"]
            nxt = [m for m in self.markers if m["seq"] > s_seq and m.get("opens") is not False
                   and m["kind"] in ("日程",) and not self.is_committee]
            if o:
                end_seq, end_kind = o[0]["seq"], "②「その他」に入る宣言"
            elif c:
                end_seq, end_kind = c[0]["seq"], "③閉会宣言"
            elif nxt:
                end_seq, end_kind = nxt[0]["seq"], "次の日程"
            else:
                end_seq, end_kind = len(self.speeches), "見つからず（最後の発言まで）"
        gq.update(found=True, start_seq=s_seq, start_wording=starts[0]["wording"], end_seq=end_seq,
                  end_marker=end_kind, end_wording=next((m["wording"] for m in self.markers if m["seq"] == end_seq
                                                         and m["kind"] in ("一般質問・終わり", "その他", "閉会")), ""))
        rng = [sp for sp in self.speeches if s_seq <= sp["seq"] <= end_seq]
        items, cur = [], None
        prev_kind = None
        pool = []  # 答弁を待っている項目（まとめて質問が出たときは2つ以上）
        sp_text = {sp["seq"]: sp["text"] for sp in self.speeches}
        for sp in rng:
            sp["in_general_question"] = True
            k = sp["speaker"]["kind"]
            if sp.get("is_presiding") or k in ("委員長", "議長") and sp.get("presiding_class") != "質問・意見":
                continue
            who = sp["speaker"]["full_name"] or sp["label"]
            if k == "議員":
                new = cur is None or cur["questioner_key"] != who
                reason = None
                # 同じ人の次の項目：「次に」「２点目」などで始まり、しかも冒頭に新しい題名（「○○について」）があるときだけ。
                # 「最後になりますけど」などの同じテーマの続きは分けない（2026-10-26 検査の指摘）
                if not new and prev_kind == "理事者" and re.match(
                        r"^(次に|２点目|2点目|二点目|２つ目|2つ目|二つ目|続いて|もう一点|もう１点|もう1点|３点目|三点目|３つ目|別件)", sp["text"]):
                    nt, _, _ = extract_title(sp["text"][:120])
                    if nt and nt != cur.get("title"):
                        new, reason = True, "同じ人の2つ目以降の項目と推定（「次に」＋新しい題名で区切った）"
                if new:
                    cur = {"no": len(items) + 1, "questioner_key": who, "questioner_label": sp["label"],
                           "questioner_full_name": sp["speaker"]["full_name"],
                           "related_question": bool(sp.get("related_question")),
                           "question_seqs": [], "answers": [], "needs_check": [], "titles_found": []}
                    if reason:
                        cur["needs_check"].append(reason)
                    t, rule, allt = extract_title(sp["text"], 600 if self.is_committee else 10 ** 6,
                                                  honkaigi=not self.is_committee)
                    cur["title"], cur["title_rule"], cur["title_from_seq"] = t, rule, sp["seq"]
                    cur["titles_found"] = allt
                    cur["first_sentence"] = split_sentences(sp["text"])[0][:80] if sp["text"] else ""
                    if not t:
                        cur["needs_check"].append("項目名の決まった言い回しが見つからず空欄")
                    elif re.match(r"^(その|この|あの|今回|それ|これ|先ほど|前回)", t) or t.endswith("ということ") or len(t) > 30:
                        cur["needs_check"].append("項目名が「その・この」で始まる、長すぎるなど、題名として不完全な可能性")
                    if len(allt) > 1 and self.is_committee:
                        cur["needs_check"].append(f"最初の発言の中に項目名らしいものが{len(allt)}つ（1つの項目にまとめた）")
                    if re.search(r"(予告|通告)した.{0,12}前に|前に.{0,50}(一つ|１つ|1つ|一点|１点|1点|ひとつ)", sp["text"][:200]):
                        cur["needs_check"].append("予告した項目の前に別の質問を1つしている（項目を分けるか要確認）")
                    cnt = re.search(r"([２-９2-9二三四五])(つ|点|件)(あります|ございます|お伺い|質問)", sp["text"][:80])
                    if cnt:
                        cur["count_hint"] = cnt.group(0)
                    items.append(cur)
                    # 前の項目に答弁がまだ無いまま次の人が質問した → まとめて答弁される
                    if pool and prev_kind == "議員" and all(not x["answers"] for x in pool):
                        pool.append(cur)
                    else:
                        pool = [cur]
                elif prev_kind != "議員":
                    pool = [cur]
                cur["question_seqs"].append(sp["seq"])
            elif k in ("理事者", "事務局"):
                if cur is None:
                    continue
                target, how = cur, "直前の質問者"
                if len(pool) >= 2:
                    prevsp = self.speeches[sp["seq"] - 2] if sp["seq"] >= 2 else None
                    nom = prevsp["text"] if prevsp and prevsp.get("is_presiding") else ""
                    target, how = attribute_answer(sp["text"], pool, sp_text, nom)
                    last_t = getattr(self, "_last_answer_target", None)
                    if how.startswith("まとめて出た質問のどれへの答弁か決められず") and last_t is pool[-1] and target is pool[-1]:
                        how = "直前の答弁と同じ項目（後の項目への答弁が続いている）"
                self._last_answer_target = target
                rec = {"seq": sp["seq"], "label": sp["label"], "full_name": sp["speaker"]["full_name"],
                       "role": sp["speaker"]["role"], "attribution": how}
                target["answers"].append(rec)
                if how != "直前の質問者" and not how.startswith("直前の答弁と同じ項目"):
                    target["needs_check"].append(f"発言{sp['seq']}の答弁の帰属：{how}")
            else:
                if cur is not None:
                    cur["needs_check"].append(f"発言{sp['seq']}：話し手の種類が分からない（{sp['label']}）")
            prev_kind = k
        # 本人が「２つあります」と言っているのに、同じ人の項目が1つのとき
        by_q = Counter(i["questioner_key"] for i in items)
        for it in items:
            if it.get("count_hint") and by_q[it["questioner_key"]] == 1:
                it["needs_check"].append(f"本人が「{it['count_hint']}」と言っているが、切れ目は見つからず1項目のまま")
            if not it["answers"]:
                it["needs_check"].append("答弁が見つからない（次の項目とまとめて答弁された可能性。答弁の帰属は要確認）")
            it["needs_check_flag"] = bool(it["needs_check"])
            it.pop("questioner_key")
        gq["items"] = items
        gq["speech_count"] = len(rng)
        # 委員長の「５人の委員から６件」「一般質問は２件」などの宣言と、項目の数を照らし合わせる
        decl = []
        for sp in self.speeches:
            if not sp.get("is_presiding") or sp["seq"] > s_seq + 2:
                continue
            for m in re.finditer(rf"(?:([{NUMCH}]+)(?:人|名)(?:の(?:委員|方))?(?:の方)?から、?)?([{NUMCH}]+)(?:件|問)(?:の一般質問|の質問|とお聞き|の御質問|の通告)|一般質問[はが、]?([{NUMCH}]+)件", sp["text"]):
                if "一般質問" not in sp["text"]:
                    continue
                n = kan2int(m.group(2) or m.group(3))
                ppl = kan2int(m.group(1)) if m.group(1) else None
                decl.append({"seq": sp["seq"], "wording": m.group(0), "items": n, "people": ppl})
        gq["declared"] = decl
        if decl:
            d = decl[-1]
            n_people = len({i["questioner_full_name"] or i["questioner_label"] for i in items})
            gq["declared_check"] = {"declared_items": d["items"], "found_items": len(items),
                                    "declared_people": d["people"], "found_people": n_people}
            if d["items"] != len(items) or (d["people"] and d["people"] != n_people):
                gq["needs_check"] = (f"委員長の宣言「{d['wording']}」（{d['items']}件"
                                     + (f"・{d['people']}人" if d["people"] else "")
                                     + f"）と、見つけた項目の数（{len(items)}件・{n_people}人）が合わない")
        self.gq = gq

    # ------------------------------------------------ 議事の進行が乱れたときの言葉の印
    DISORDER = [
        ("動議", r"動議"),
        ("議事進行", r"議事進行"),
        ("異議あり", r"異議あり(?!ませ)|異議がある"),
        ("抗議", r"抗議"),
        ("撤回", r"撤回"),
        ("発言の取り消し", r"取り消|取消し|取消す"),
        ("暫時休憩", r"暫時休憩"),
        ("静粛に", r"静粛|静かに"),
        ("退席", r"退席"),
        ("退場", r"退場"),
        ("懲罰", r"懲罰"),
        ("不規則発言", r"不規則発言|不穏当"),
    ]

    # 進行役の注意の言葉（検査役の見立て。2026-10-26）
    CAUTION = r"発言中|マイクから|マイクを通|マイクを使|時間(が|を)(過ぎ|超過|超え|来て|オーバー)|時間です|関連じゃない|関連ではない|関連では" \
              r"|御静粛|静粛|静かに|指名(して|を受けて)から|許可(して|を得て)から|不規則発言|御注意|注意(いた|を)" \
              r"|発言を控え|議題(と|に)関係|質問の趣旨から外れ|簡潔にお願い"
    PROC_VOICE = r"^[（(]「?(はい|異議なし|なし|関連|賛成|了解|ありません|お願いします|結構です)」?と(言う|呼ぶ)(人|者)あり[）)]$|^[（(]発言する人なし[）)]$|^〔「?異議なし」?と呼ぶ者あり〕$"

    def mark_disorder(self):
        """議事の進行が乱れたときの言葉の印。文言と位置だけを記録し、評価は付けない。

        それぞれの印に、場面を絞るための手がかり（signals）を付け、
        「乱れた場面の候補」と「ふつうの使われ方」に分ける（分け方は機械の決まり。最後は人が読む）。
        手がかり：①話し手が進行役か ②直後のト書きが手続きの声（「はい」「関連」など）以外の声か
        ③直前の発言が「……」「――」で途中で切れているか ④進行役の注意の言葉か
        ⑤「撤回」「取り消し」は進行役が求めたときと本人が申し出たときだけを候補にする
        """
        sp_by = {sp["seq"]: sp for sp in self.speeches}
        voices_after = {}
        for st in self.stage:
            q = st["inside_seq"] or st["after_seq"]
            voices_after.setdefault(q, []).append(st["text"])

        def is_proc(v):
            if re.match(self.PROC_VOICE, v):
                return True
            qs = re.findall(r"「([^」]*)」", v)
            return bool(qs) and all(re.match(r"^(?:(?:すみません|すいません)、?)?(はい|異議なし|なし|賛成|了解|ありません|お願いします|結構です|委員長、?関連|はい、?関連(です)?|関連(です|でいいですか|で)?)$", q) for q in qs)

        def nonproc_voice(q):
            return [v for v in voices_after.get(q, []) if re.search(r"人あり|者あり", v) and not is_proc(v)]

        CHALLENGE = (r"違う|おかしい|ちょっと待|やめ|関連じゃない|いいかげん|撤回|謝罪|聞いてない|ルール|議事進行|委員長、ちょっと|進めて"
                     r"|言ってよ|じゃないよ|何回も|勝手|失礼|ふざけ|聞いて(ください|よ)|答えて")

        def counts_as_voice(v):
            # 答弁を補う短い声（「何ページ」「４億円」「音羽」など、言い返しでない8文字以下）は数えない
            qs = re.findall(r"「([^」]*)」", v)
            if not qs:
                return True  # （発言する人あり）
            return any(len(q) > 8 or re.search(CHALLENGE, q) for q in qs)

        def cut_off(q):
            sp = sp_by.get(q)
            return bool(sp and re.search(r"(……|…|――|─)$", sp["text"].strip()))

        out = []

        def add(rec, sp_seq):
            sig = []
            sp = sp_by.get(sp_seq)
            if sp and sp.get("is_presiding"):
                sig.append("①進行役の発言")
            nv = nonproc_voice(sp_seq) + nonproc_voice(sp_seq - 1)
            if nv:
                sig.append("②手続き以外の声のト書き：" + " ".join(nv[:2]))
            if cut_off(sp_seq - 1):
                sig.append("③直前の発言が途中で切れている")
            if rec.get("caution"):
                sig.append("④進行役の注意の言葉")
            if rec.get("retract"):
                sig.append("⑤" + rec["retract"])
            rec["signals"] = sig
            word = rec["word"]
            cand = False
            if word in ("動議", "議事進行", "異議あり", "懲罰", "不規則発言"):
                cand = True
            elif word == "進行役の注意":
                # 「持ち時間を超過いたしました」「残り◯分です、御注意ください」は予算・決算の決まった時間の告知
                # 発言全体で時間の告知かを判定する（「御注意いただければと思います」だけの文も、前の文が時間の告知ならふつう）
                whole = sp["text"] if sp else rec["wording"]
                cand = not re.search(r"持ち時間|残り.{0,6}(分|秒)|超過(を)?いたしました", whole) or bool(nv)
                if not cand:
                    rec["word"] = "時間の告知"
            elif word == "静粛に" and sp and sp.get("is_presiding"):
                cand = True
            elif word in ("撤回", "発言の取り消し"):
                cand = bool(rec.get("retract"))
            elif word == "暫時休憩":
                cand = bool(nv) or cut_off(sp_seq - 1) or (rec.get("wording") and not re.search(r"委員会審査|議事の都合|理事会|理事の皆様|調整", rec["wording"]))
            elif word in ("退席", "退場"):
                cand = bool(re.search(r"命じ|退場を求|退席を求", rec["wording"])) or bool(nv)
            elif word == "抗議":
                cand = rec["where"] == "ト書き" or bool(nv)
            elif word == "手続き以外の声":
                # 単発の場内の声（「何ページ」「４億円」など）はふつう。進行役の発言の直後・声が続く・言い返しの言葉は候補
                many = sum(1 for q in (sp_seq - 1, sp_seq, sp_seq + 1) for v in nonproc_voice(q) if counts_as_voice(v)) >= 2
                cand = bool(sp and sp.get("is_presiding")) or many or bool(re.search(CHALLENGE, rec["wording"]))
            rec["category"] = "乱れた場面の候補" if cand else "ふつうの使われ方"
            out.append(rec)

        for sp in self.speeches:
            pres = bool(sp.get("is_presiding"))
            for si, sent in enumerate(split_sentences(sp["text"])):
                w = sent.strip(SP + " \n")[:100]
                base = {"where": "発言", "seq": sp["seq"], "sentence_index": si, "label": sp["label"],
                        "by_presider": pres, "section_id": sp.get("section_id"), "wording": w}
                hit_words = [k for k, pat in self.DISORDER if re.search(pat, sent)]
                for kind in hit_words:
                    rec = dict(base, word=kind)
                    if kind in ("撤回", "発言の取り消し"):
                        if pres and re.search(r"(撤回|取り消)(を求め|してください|されますか|しますか|願います|をお願い)", sent):
                            rec["retract"] = "進行役が撤回・取り消しを求めた"
                        elif not pres and re.search(r"(撤回|取り消)(します|いたします|させていただ|させて)", sent):
                            rec["retract"] = "本人が撤回・取り消しを申し出た"
                    add(rec, sp["seq"])
                if pres and re.search(self.CAUTION, sent) and not hit_words:
                    add(dict(base, word="進行役の注意", caution=True), sp["seq"])
        for st in self.stage:
            q = st["inside_seq"] or st["after_seq"] or 0
            base = {"where": "ト書き", "para": st["para"], "after_seq": st["after_seq"], "wording": st["text"][:100]}
            hit_words = [k for k, pat in self.DISORDER if re.search(pat, st["text"])]
            for kind in hit_words:
                add(dict(base, word=kind), q)
            if not hit_words and re.search(r"人あり|者あり", st["text"]) and not is_proc(st["text"]):
                add(dict(base, word="手続き以外の声"), q)
        self.disorder = out

    # ------------------------------------------------ 発言の鍵
    def speech_keys(self, meeting_id):
        """発言の鍵（案2）：会議の鍵｜話し手の原文の表記｜本文の先頭20字の指紋（＋重複の番号）。

        話し手はフルネームではなく原文の表記（空白を除き NFKC）を使う。速報版で名簿と照合できず空欄だった
        話し手が、正式版で特定されても鍵は変わらない。
        """
        seen = Counter()
        for sp in self.speeches:
            who = unicodedata.normalize("NFKC", nospace(sp["label"]))
            fp = fingerprint(sp["text"], 20)
            base = f"{meeting_id}|{who}|{fp}"
            seen[base] += 1
            sp["key"] = base + (f"#{seen[base]}" if seen[base] > 1 else "")
            sp["key_parts"] = {"meeting": meeting_id, "speaker_label": who, "head20_sha1": fp,
                               "dup_no": seen[base]}
            sp["chars"] = len(sp["text"].replace("\n", ""))
            sp["chars_nospace"] = len(nospace(sp["text"]))

    # ------------------------------------------------ 原文の層
    def raw_layer(self):
        wh = {w["para"]: w["reason"] for w in self.withheld}
        kind_of = {}
        for it in self.items:
            if it["kind"] == "発言":
                continue
            if "para" in it:
                kind_of.setdefault(it["para"], it["kind"])
            if it["kind"] == "請願文書表":
                for q in range(it["para_start"], it["para_end"] + 1):
                    kind_of[q] = "請願文書表"
        sp_para = {}
        for sp in self.speeches:
            for q in range(sp["para_start"], sp["para_end"] + 1):
                sp_para.setdefault(q, sp["seq"])
        header_end_para = self.lines[self.body_start]["para"] if self.body_start < len(self.lines) else 10 ** 9
        out = []
        for p in self.paras:
            q = p["para"]
            rec = {"para": q, "pd_index": p["pd_index"]}
            if p["in_table"]:
                rec["in_table"] = p["in_table"]
            if q < header_end_para:
                rec["part"] = "冒頭（名簿・付議事件）"
            elif q in kind_of:
                rec["part"] = kind_of[q]
            elif q in sp_para:
                rec["part"] = "発言"
                rec["seq"] = sp_para[q]
            else:
                rec["part"] = "空行" if not nospace(p["text"]) else "その他"
            if q in wh:
                rec["text"] = None
                rec["withheld"] = wh[q]
                rec["chars"] = len(p["text"])
            else:
                rec["text"] = p["text"]
            if p["text"] != p["ptext"]:
                rec["ptext_differs"] = True
                rec["ptext_missing_chars"] = len(p["text"]) - len(p["ptext"])
            if p.get("notes"):
                rec["notes"] = p["notes"]
            out.append(rec)
        return out

    def apply_withholding_to_items(self):
        wh = {w["para"] for w in self.withheld}
        for it in self.items:
            if it["kind"] == "請願文書表":
                for f in it["fields"]:
                    if f["para"] in wh:
                        f["lines"] = None
                        f["withheld"] = "請願者の欄（住所・氏名）は保存しない"
        for sp in self.speeches:
            if any(q in wh for q in range(sp["para_start"], sp["para_end"] + 1)):
                sp.setdefault("flags", []).append("発言の範囲に非公開の段落がある（本文の該当行は要確認）")


# ---------------------------------------------------------------- 小さな部品
def split_sentences(text):
    parts = re.split(r"(?<=[。？！])|\n", text)
    return [p for p in parts if p.strip(SP + " ")] or [""]


def find_refs(s):
    out = []
    for m in re.finditer(r"(議案|報告|諮問|請願|陳情|受理|発議)(?:受理)?第[　\s]*([0-9０-９]+)号", s):
        kind = m.group(1)
        if kind == "受理":
            kind = "請願"
        out.append(f"{kind}第{int(m.group(2).translate(DIG))}号")
    for m in re.finditer(rf"日程第([{NUMCH}]+)", s):
        out.append(f"日程第{kan2int(m.group(1))}")
    return out


def ref_form(w):
    w2 = re.sub(r"[0-9０-９]+", "N", w)
    w2 = re.sub(r"[「『][^」』]*[」』]", "「件名」", w2)
    return w2


REP_CONTEXT = r"相手方|代表者|構成員|共同企業体|指定管理者|受注者|契約"
REP_TITLE = (r"(?:代表取締役(?:社長|会長|専務)?|取締役(?:社長|会長|支店長|副社長)?|執行役員(?:支店長|支社長|本店長)?|常務執行役員"
             r"|代表執行役(?:社長)?|代表社員|代表理事|理事長|代表者|本店長|支店長|支社長|営業所長|事業所長|所長|社長|会長|代表)")
REP_NAME = r"[一-龥々〆ヶァ-ヶ](?:[\s　]?[一-龥々〆ヶぁ-んァ-ヶー]){1,7}?"
REP_RE = re.compile(r"(" + REP_TITLE + r")([\s　]*、?[\s　]*)(" + REP_NAME + r")(?=でございます|です|で、|で以下|。|、|，|）|\)|$|[\s　]*$)")
COMPANY_RE = re.compile(r"株式会社|有限会社|合同会社|合資会社|共同企業体|法人|組合|協会|事業団|センター")
ADDRESS_RE = re.compile(r"^(東京都|〒|北海道|大阪府|京都府|.{2,3}県)|[都道府県].{0,6}[区市町村]|[区市町村].{0,12}(丁目|番地|番|号)")


def mask_representatives(text):
    """契約の相手方の文の中で、代表者などの肩書のあとの人名を「［非公開：代表者の氏名］」に置き換える。

    企業名・共同企業体名・指定管理者の団体名・所在地は残す（企業の情報）。
    契約の相手方の文（「相手方」「代表者」「構成員」など）を含む段落だけを対象にする。
    返り値：(置き換えた文, [{company, address, title}...])
    """
    if not text or not re.search(REP_CONTEXT, text):
        return text, []
    parties = []
    out, pos = [], 0
    for m in REP_RE.finditer(text):
        # 直前の「、」区切りのかたまりから、企業名と所在地を拾う（なければ空欄。推測しない）
        name = m.group(3)
        if name.startswith("者") or re.search(r"[はがのをにでともへ]$", nospace(name)):
            continue  # 「代表者は」の「者は」などは人名ではない
        # 企業名・所在地は、すでに隠した後の文から拾う（前の人の名前が混ざらないように）
        head = ("".join(out) + text[pos:m.start()])[-120:]
        chunks = [c.strip(SP + " ") for c in re.split(r"[、，。\n]", head) if c.strip(SP + " ")]
        company = next((re.sub(REP_TITLE + r"$", "", c) for c in reversed(chunks[-3:]) if COMPANY_RE.search(c)), "")
        company = re.sub(r"^.*?(相手方|代表者|構成員)は、?", "", company)
        address = next((c for c in reversed(chunks[-4:]) if ADDRESS_RE.search(c) and not COMPANY_RE.search(c)), "")
        address = re.sub(r"^.*?(相手方|代表者|構成員)は、?", "", address)
        if not company:
            continue  # 企業名が見つからない肩書（「区長」の言い換えなど）には手を付けない
        out.append(text[pos:m.start(3)])
        out.append("［非公開：代表者の氏名］")
        pos = m.end(3)
        parties.append({"company": company, "address": address, "title": m.group(1)})
    out.append(text[pos:])
    return "".join(out), parties


def _bigrams(s):
    s = nospace(s)
    return {s[i:i + 2] for i in range(len(s) - 1)
            if re.search(r"[一-龥ァ-ヶＡ-Ｚａ-ｚA-Za-z]", s[i:i + 2])}


def attribute_answer(answer_text, pool, sp_text, nomination=""):
    """まとめて出た質問のどれへの答弁かを、答弁の書き出し（「１点目の…」など）・直前の委員長の指名の言葉
    （「教育費の流用については、○○課長」）と、質問の言葉の重なりで決める。
    どの項目にもある言葉は数えない（その項目にしかない言葉の重なりだけを数える）。
    はっきり決まらないときは、いちばん後の項目に入れて「決められず（要確認）」とする。推測で決め切らない。
    """
    head = re.sub(r"^(まず、?|次に、?|それから、?)?([０-９0-9一二三]点目の?|[０-９0-9一二三]つ目の?)", "", answer_text[:150])
    ab = _bigrams(head) | _bigrams(nomination)
    qbs = []
    for it in pool:
        qb = set()
        for q in it["question_seqs"]:
            qb |= _bigrams(sp_text.get(q, ""))
        qbs.append(qb)
    scores = []
    for i, qb in enumerate(qbs):
        others = set().union(*[x for j, x in enumerate(qbs) if j != i]) if len(qbs) > 1 else set()
        scores.append(len((ab & qb) - others))
    order = sorted(range(len(pool)), key=lambda i: -scores[i])
    best, second = order[0], (order[1] if len(order) > 1 else None)
    if scores[best] >= 3 and (second is None or scores[best] >= 2 * max(1, scores[second])):
        return pool[best], f"まとめて出た質問のうち、言葉の重なりで項目{pool[best]['no']}と推定（重なり{scores[best]}・次点{scores[second] if second is not None else 0}。要確認）"
    return pool[-1], f"まとめて出た質問のどれへの答弁か決められず、後の項目{pool[-1]['no']}に入れた（重なり{scores}。要確認）"


ACC_RE = r"一般会計|国民健康保険(?:事業)?(?:特別)?会計|介護保険(?:事業)?(?:特別)?会計|後期高齢者医療(?:特別)?会計|老人保健(?:特別)?会計"


def budget_scope(w, before=""):
    """款別・総括質疑の範囲。会計・歳入歳出が書かれていなければ、同じ発言の前の文から引き継ぐ（印を付ける）。"""
    acc = re.findall(ACC_RE, w)
    side = re.findall(r"歳入|歳出", w)
    inherited = []
    if not acc and before:
        prev = re.findall(ACC_RE, before)
        if prev:
            acc = [prev[-1]]
            inherited.append("会計")
    if not side and before:
        prev = re.findall(r"歳入|歳出", before)
        if prev:
            side = [prev[-1]]
            inherited.append("歳入歳出")
    # 款・項の名前：次の「の質疑」「の１項」「から」「まで」「及び＋数字」「、」で終わる（名前の中の「及び」は残す）
    stop = r"(?!の質疑|の[0-9０-９]|の部分|から|まで|及び[0-9０-９第]|並びに|、|。|，|～|〜|\s)"
    name = r"(?:「[^」]{1,24}」|(?:" + stop + r".){1,24})?"
    kan = re.findall(r"[0-9０-９]+款" + name, w)
    kou = re.findall(r"[0-9０-９]+項" + name, w)
    # 「…の質疑から始めたい」の「から」は範囲ではない
    return {"wording": w, "accounts": acc, "sides": side, "kan": kan, "kou": kou,
            # ページの「…ページから…ページまで」は款・項の範囲ではないので除いて判定する
            "is_range": bool(re.search(r"から(?!始め)|～|〜|まで", re.sub(
                r"それから|これから|昨日から|先週から|[0-9０-９]+ページ(から|～|〜)[0-9０-９]+ページ(まで)?|[0-9０-９]+ページまで", "", w))),
            "inherited_from_same_speech": inherited}


TITLE_LEAD = r"(?:まず(?:初めに|最初に|は)?、?|初めに、?|最初に、?|次に、?|続いて、?|それから、?|最後に、?|質問の初めに、?|私からは、?(?:まず)?、?|では、?|それでは、?)?"
TITLE_RES_HONKAIGI = [
    ("「について伺います」（本会議の見出し）",
     re.compile(r"(?:^|。|\n)" + TITLE_LEAD + r"([^。、\n]{2,50}?)について(?:、)?(?:伺います|お伺いします|質問します|お尋ねします|伺いたい)")),
]
TITLE_RES = [
    ("「について」＋伺う・質問など",
     re.compile(r"(?:^|。|、|\n)" + TITLE_LEAD +
                r"([^。、\n]{2,50}?)(?:のこと)?について(?:です|、?(?:少し|ちょっと|何点か|幾つか|２点|二点)?(?:お)?(?:伺い|質問|お聞き|お尋ね|聞き|確認|要望))")),
    ("「について」で始まる話題",
     re.compile(r"(?:^|。|\n)" + TITLE_LEAD + r"([^。、\n]{2,40})について[、。]")),
    ("「の件」",
     re.compile(r"(?:^|。|\n)" + TITLE_LEAD + r"([^。、\n]{2,40}?)の件(?:で|について|です)")),
]


def extract_title(text, limit=600, honkaigi=False):
    found = []
    for rule, rx in (TITLE_RES_HONKAIGI + TITLE_RES if honkaigi else TITLE_RES):
        for m in rx.finditer(text[:limit]):
            t = re.sub(r"^(まず|初めに|最初に|次に|続いて|私からは|では|それでは)[、]?", "", m.group(1)).strip(SP + "、 \n")
            if t and t not in [f[0] for f in found]:
                found.append((t, rule))
        if found:
            break
    if not found:
        return "", "", []
    return found[0][0], found[0][1], [f[0] for f in found]


def fingerprint(text, n):
    t = unicodedata.normalize("NFKC", text)
    t = re.sub(r"[\s、。，．・「」『』（）()〔〕［］【】!！?？…ー―\-]", "", t)
    return hashlib.sha1(t[:n].encode("utf-8")).hexdigest()[:12]


def sha256_file(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for b in iter(lambda: f.read(1 << 20), b""):
            h.update(b)
    return h.hexdigest()
