"""今期分の中間ファイルから、版ごとの比べ合わせに使う「要点」だけを書き出す（本文は書き出さない）。

使い方: py -3 tools/committee_term_snapshot.py <出力の json>
"""
import glob
import json
import os
import sys
from collections import Counter

D = os.path.join(os.path.dirname(__file__), "..", "data", "今期分")


def main(out):
    snap = {}
    for f in sorted(glob.glob(os.path.join(D, "*.json"))):
        if os.path.basename(f).startswith("_"):
            continue
        r = json.load(open(f, encoding="utf-8"))
        g = r["general_question"]
        snap[os.path.basename(f)] = {
            "meeting_id": r["meeting"]["meeting_id"], "date": r["meeting"]["date_iso"],
            "is_rep": r.get("dedupe", {}).get("is_representative", True),
            "speeches": len(r["speeches"]),
            "identified": sum(1 for s in r["speeches"] if s["speaker"]["full_name"]),
            "gq": [g.get("start_seq"), g.get("end_seq"), g.get("end_marker")] if g.get("found") else None,
            "gq_items": len(g.get("items", [])),
            "gq_decl_bad": bool(g.get("needs_check")),
            "withheld": dict(Counter(w["reason"][:16] for w in r["personal_info_withheld"])),
            "parties": len(r.get("contract_parties", [])),
            "disorder_cand": sum(1 for d in r["disorder_words"] if d["category"] == "乱れた場面の候補"),
        }
    json.dump(snap, open(out, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(len(snap))


if __name__ == "__main__":
    main(sys.argv[1])
