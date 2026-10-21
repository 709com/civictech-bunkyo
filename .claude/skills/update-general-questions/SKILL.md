---
name: update-general-questions
description: 一般質問データの更新手順。会議録検索システムから全文を取得し、要約・トピック分割して general_questions に取り込む際に必ず参照すること。
---

# 一般質問データ更新（general_questions）

福岡市議会 会議録検索システムから一般質問の全文を取得し、質問者ごとに分割・AI要約して `general_questions` に取り込む。

UI設計・カテゴリ分類・品質基準は `general-questions` スキルを必ず併読すること。DB接続は `db-access` スキルの規約に従う。

## データソース（会議録検索システム）

会議録検索システム: `https://www.city.fukuoka.fukuoka.dbsr.jp/`

> ⚠️ **URL中の `index.php/{数字}` はナビゲーション用の一時IDで、恒久URLではない**（同じ一覧ページでもアクセスごとに数字が変わる）。数字を固定でハードコードせず、必ずレスポンスHTML内のリンクから次のURLを拾うこと。

### ① 会議一覧の取得（ページ送りあり）

- 一覧: `https://www.city.fukuoka.fukuoka.dbsr.jp/index.php/{一時ID}?Template=list`（既知の一時IDでアクセスすれば表示される。例は 4942400 など過去に使えたもの）
- ページ送り: HTML内の `Template=list&Page={N}` リンクをたどる（10件/ページ・全9,000件超なので、対象会期の日が全部揃うまでたどる。一覧は新しい順）
- **1つの会議日につき「名簿」「本文」「資料」の3行**があり、それぞれ別の `DocumentID` を持つ。行のリンク（`...&DocumentID={ID}`）とラベル（例: `令和８年第１回定例会（第８日）　本文`）を抽出し、**「本文」の DocumentID を使う**

### ② 全文テキストのダウンロード（2ステップ・cookie必須）

`Template=doc-all-frame&VoiceType=all` はフレームセットHTMLで**本文を含まない**。本文はセッションcookieを維持したまま `Template=download` で取得する:

```bash
# 1. 全文表示フレームを開いてセッションを確立（DocumentIDは一覧で拾った「本文」のID）
curl -s -c cookies.txt -A "Mozilla/5.0" \
  "https://www.city.fukuoka.fukuoka.dbsr.jp/index.php/{一時ID}?Template=doc-all-frame&VoiceType=all&DocumentID={本文ID}" \
  -o frame.html

# 2. frameset応答に含まれる新しい一時IDを拾い、downloadテンプレートで全文テキストを取得
PID=$(grep -o 'index.php/[0-9]*' frame.html | head -1 | grep -o '[0-9]*')
curl -s -b cookies.txt -A "Mozilla/5.0" \
  "https://www.city.fukuoka.fukuoka.dbsr.jp/index.php/$PID?Template=download&Download=yes" \
  | iconv -f cp932 -t utf-8 > day.txt
```

- 返却テキストは **Shift_JIS** なので `iconv -f cp932 -t utf-8` で変換する
- `DocumentID` を付けずに開くと直前に見ていた文書（名簿など）が返ることがある。冒頭行が `YYYY年MM月DD日：令和…定例会（第N日）　本文` になっているか必ず確認する
- リクエスト間隔は1〜2秒空ける

### ③ まず会期の全日程を取得してから一般質問を判別する（重要）

**一覧の文書名からも議事日程からも一般質問の日は判別できない**。特に予算議会（第1回定例会）では会議録中に「一般質問」という語が一切登場しない。そのため、**対象会期の全日程の「本文」を先に全部ダウンロードして保存し、内容を解析して判別する**。

## 生テキストの保存先

取得した全文は会期ごとに `docs/fukuoka/meeting-minutes/<会期名>/` に保存する（例: `令和８年第１回定例会/2026-03-04_4日目.txt`）。再パース・検証時のソースとして残す。

## 中身の解析（日種別の判別とパース）

### 日種別の判別（実データで確認済みのシグナル）

| 日種別 | シグナル | 扱い |
|---|---|---|
| 一般質問の日 | 「日程第１、一般質問を行います」「一般質問を継続いたします」（12月議会などで明示される） | 取込対象 |
| 質疑の日（予算議会） | 「順次**質疑**を許します」＋議員と局長の応酬多数。「一般質問」の語は出ない | **一般質問相当として取込対象**（r8-1では第4〜7日目を取込済み） |
| 議案質疑（第1日） | 「順次質疑を許します」だが対象は上程直後の議案 | `bill_discussions` の対象（`update-bills` 参照） |
| 討論・採決の日 | 「討論の通告があります。順次これを許します」。登壇のみで局長答弁がほぼ0 | 対象外 |

機械的な目安: 局長答弁行 `^◯[^）]*局長（` の件数。一般質問・質疑の日は100件超になることもあり、討論・採決の日は0〜数件。判別に迷う日はユーザーに確認する。

### 発言者のパース

行パターンは `packages/seed/fukuoka/parse-minutes.ts` の正規表現を流用できる:

- 質問者: `◯57番（田中たかし）登壇` → 議席番号＋氏名（氏名内に全角スペースが入ることがある: `森　あやこ`）
- 答弁者: `◯農林水産局長（姉川雄一）`、`◯市長（高島宗一郎）`、`◯教育長（…）` など役職＋氏名
- 進行: `◯議長（…）`・`◯副議長（…）`（休憩をはさむと副議長進行に替わることがある）
- 会派: 登壇冒頭の「私は〜を代表して」から抽出（`extractParty`）

1質問者 = 1レコード。議長の指名（「○○議員。」）→ `◯N番（…）登壇` から次の質問者の指名までを1ブロックとして分割する。

## DBマッピング（general_questions）

| フィールド | 内容 |
|---|---|
| `council_session_id` | 会期ID（slug は `r8-1` 形式） |
| `session_day` | 何日目か（数値） |
| `question_order` | その日の中での質問順 |
| `questioner_name` / `questioner_number` / `questioner_party` | 質問者情報 |
| `raw_text` | 原文逐語録（その質問者の全発言＋答弁） |
| `summary` | 全体サマリー |
| `topics` | トピック配列（下記JSON） |
| `source_url` | 現状 null 運用（会議録検索システムのURLは一時IDを含みリンク切れしやすいため） |
| `publish_status` | 取込時 `draft` → 確認後 `published` |

### topics の JSON 形（`GeneralQuestionTopic`）

```json
{
  "title": "…",
  "question_summary": "…",
  "answer_summary": "…",
  "answerer_role": "○○局長（氏名）・市長（氏名）",
  "answerer_name": "",
  "block_summary": null
}
```

## 品質基準（要約生成時に必ず守る）

`general-questions` スキルの詳細を参照。要点:

- **タイトル**: 原文の行政用語・略語はそのまま使う（キーワードによるカテゴリ分類は廃止したので、分類のためにタイトルへキーワードを足す必要はない。一覧は登壇順で、並べ方は `speaking-order.ts`）
- **Qサマリー文体**: 「質した」「問いただした」はNG。「確認した」「求めた」「質問した」を使う
- **複数答弁者**: `answerer_role` に「役職（氏名）・役職（氏名）」形式でまとめ、`answerer_name` は空にする
- **答弁者の混入注意**: 同一質問者が複数トピックを質疑した場合、トピックAの答弁者がトピックBに混入しないよう照合する
- 中国語簡体字・繁体字の混入チェック（例: 议・务・该）

## 手順

1. 一覧ページ（ページ送りをたどる）から対象定例会の全日程の「本文」DocumentID を特定
2. **全日程の本文をダウンロード**（上記2ステップ手順）→ `docs/fukuoka/meeting-minutes/` に保存
3. 内容解析で一般質問（相当）の日を判別し、質問者ごとに分割・パース
4. AI要約（summary + topics）を生成
5. **ユーザーレビュー（必須）**: 生成内容を提示し確認を取ってから書き込む（CLAUDE.md「AI生成コンテンツのDB更新ルール」）
6. `publish_status: draft` で INSERT
7. web で表示確認（`/sessions/[session_slug]/questions` のテーマ別ビューでカテゴリ分類も目視確認）
8. 確認後、会期単位で `published` に PATCH:

```bash
source .env.production
curl -s -X PATCH "$SUPABASE_URL/rest/v1/general_questions?council_session_id=eq.<session_id>" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"publish_status": "published"}'
```

トップページの一般質問バナーは最新の公開済みセッションを自動で拾うため、追加作業は不要。

## 関連

- 機能リファレンス: `general-questions` スキル（UI設計・カテゴリ分類・品質基準）
- パーサー: `packages/seed/fukuoka/parse-minutes.ts`（議案質疑用だが行パターンは共通）
