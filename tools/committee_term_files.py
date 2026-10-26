"""今期分（会議の日付が 2023-05-01 以降）の会議録ファイルを、ドライブから一覧にする（読むだけ）。

日付はファイル名とフォルダ名から決める（本文の日付は、分解のあとで照らし合わせる）。
- 本会議：「23.06.08　文京区令和5年…」→ 2023-06-08
- 委員会：「R50207予算.docx」→ 令和5年2月7日／フォルダ「R5」の中の「0726厚生.docx」→ 令和5年7月26日
年の分からないものは「要確認」として一覧に残す（推測で入れない・外さない）。
"""
import os
import re

DRIVE = r"G:\マイドライブ\2_会議録データ"
TREES = ["★会議録委員会", "★会議録本会議"]
START = "2023-05-01"


def infer_date(tree, rel):
    base = os.path.basename(rel)
    z = str.maketrans("０１２３４５６７８９", "0123456789")
    era = re.search(r"(平成|令和)(\d+|元)年", rel.translate(z))
    m = re.match(r"^(\d\d)\.(\d\d)\.(\d\d)", base)
    if m:
        # 「23.06.13　文京区平成23年…」のように先頭が和暦の年のこともあるので、和暦が書かれていればそれを使う
        if era:
            n = 1 if era.group(2) == "元" else int(era.group(2))
            y = (1988 if era.group(1) == "平成" else 2018) + n
            return f"{y}-{m.group(2)}-{m.group(3)}", "ファイル名・フォルダ名の和暦＋MM.DD"
        return f"20{m.group(1)}-{m.group(2)}-{m.group(3)}", "ファイル名（YY.MM.DD）"
    m = re.match(r"^R(\d)(\d\d)(\d\d)", base)
    if m:
        return f"{2018 + int(m.group(1))}-{m.group(2)}-{m.group(3)}", "ファイル名（R年MMDD）"
    # 親フォルダの年（R5・R6・…、「R3厚生」など）＋ファイル名の MMDD
    year = None
    for part in reversed(os.path.dirname(rel).split(os.sep)):
        y = re.match(r"^R(\d+)", part)
        if y:
            year = 2018 + int(y.group(1))
            break
        y = re.match(r"^H(\d+)", part)
        if y:
            year = 1988 + int(y.group(1))
            break
    md = re.search(r"(\d\d)(\d\d)", base)
    if year and md:
        return f"{year}-{md.group(1)}-{md.group(2)}", "フォルダの年＋ファイル名の月日"
    return None, "年または月日が分からない"


def list_term_files():
    rows = []
    for tree in TREES:
        top = os.path.join(DRIVE, tree)
        for dp, dn, fn in os.walk(top):
            for f in sorted(fn):
                if not f.lower().endswith((".doc", ".docx")) or f.startswith("~$"):
                    continue
                rel = os.path.relpath(os.path.join(dp, f), top)
                d, how = infer_date(tree, rel)
                rows.append({"tree": tree, "rel": rel, "path": os.path.join(top, rel), "date": d, "date_rule": how,
                             "in_term": bool(d and d >= START)})
    return rows


if __name__ == "__main__":
    import collections
    rows = list_term_files()
    t = [r for r in rows if r["in_term"]]
    print("all", len(rows), "term", len(t), "unknown", sum(1 for r in rows if not r["date"]))
    print(collections.Counter((r["tree"], r["path"].lower().endswith(".doc")) for r in t))
    for r in rows:
        if not r["date"]:
            print("  unknown:", r["tree"], r["rel"])
