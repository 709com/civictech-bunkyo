---
name: general-questions
description: 一般質問機能の設計・データ管理・UI決定事項のリファレンス
---

# 一般質問機能 リファレンス

## UI設計の決定事項

### セッション一覧ページ `/sessions/[session_slug]/questions`
**登壇順の一覧**を採用（2026-10-19 文京版で変更。テーマ別ビューは廃止）。

- `SessionQuestionList` コンポーネント（Server Component）
- 並べ方は `shared/utils/speaking-order.ts`：定例会の中は日付順 → その日の登壇順（`meeting_date`・`session_day`・`question_order`）
- テーマなどでまとめ直さない（掲載順は登壇順で固定。`ListOrderNotice` で「掲載順・表示順は支持や評価を示すものではありません」を表示）
- ページの下に `SessionSwitcher`（一般質問のある定例会の一覧、新しい順）
- 各カードから個人ページへ遷移

### 個人詳細ページ `/questions/[id]`
**要約／原文の切り替えトグル**を採用（2026-05-08 確定）。

- `raw_text` と `topics` 両方ある場合 → `QuestionViewToggle`（Client Component）でトグル切り替え
  - デフォルト「要約」: `QuestionChatView`（トピックAIサマリーのチャット形式）
  - 「詳しく（原文）」: `RawTranscriptContent`（原文逐語録、トピックタイトルが区切りとして挿入される）
- どちらか一方のみの場合は従来通り単体表示
- トピックタイトルの挿入位置はターン数をトピック数で等分した比例配置（近似）

## カテゴリ分類（廃止）

キーワード表（`CATEGORY_MAP`）によるテーマ分け（`build-topic-groups.ts`）は、文京版では取り除いた（2026-10-19 公開サイト、2026-10-21 開発用ページ）。一覧は登壇順で並べ、テーマでまとめ直さない。

## 関連ファイル

```
web/src/features/general-questions/
├── shared/
│   ├── types/index.ts                          # GeneralQuestion 型定義
│   └── utils/
│       ├── speaking-order.ts                   # 登壇順の並べ方・日ごとのまとめ（純粋関数）
│       └── speaking-order.test.ts              # テスト
├── server/
│   ├── repositories/general-questions-repository.ts
│   ├── loaders/
│   │   ├── get-general-questions-by-session.ts
│   │   ├── get-general-question-by-id.ts
│   │   ├── get-sessions-with-questions.ts      # 一般質問のある定例会の一覧
│   │   └── get-latest-session-with-questions.ts  # トップページバナー用
│   └── components/
│       ├── session-question-list.tsx           # 登壇順の一覧（採用デザイン）
│       ├── session-switcher.tsx                # 定例会の切り替え（新しい順）
│       ├── list-order-notice.tsx               # 掲載順の注意書き
│       ├── raw-transcript-view.tsx             # 原文表示（raw_textのみの場合）
│       └── general-question-list.tsx           # 旧リスト（未使用）
└── client/
    └── components/
        ├── question-chat-view.tsx              # チャット形式（採用デザイン）
        ├── question-view-toggle.tsx            # 要約/原文切り替えトグル（採用デザイン）
        └── general-question-topics.tsx         # 旧アコーディオン（未使用）
```

## データ管理

### データの取込・更新手順
新しい定例会の一般質問を取り込む手順は `update-general-questions` スキルを参照。

### 生データ（会議録テキスト）の場所
```text
docs/fukuoka/meeting-minutes/<会期名>/   # 会議録全文テキスト（会期・日別）
```
（旧: mirai-gikai-fukuoka-master-data リポジトリの output/ に r7-5 の中間JSONがあったが、現在ローカルに存在しない）

### publish_status の管理
現状は **admin UIなし**。DBを直接更新する（2026-04-28 時点の設計書あり）。

```bash
# 本番DBで公開状態に変更（.env.production の値を使用）
source .env.production
curl -s -X PATCH "$SUPABASE_URL/rest/v1/general_questions?council_session_id=eq.<session_id>" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"publish_status": "published"}'
```

### トップページバナー
`GeneralQuestionsBanner` が `get-latest-session-with-questions.ts` で最新の公開済みセッションを動的取得し、`/sessions/[session_slug]/questions` へリンクする。

## トピックタイトル・サマリーの市民向け品質基準

`topics` のタイトル・Qサマリー・Aサマリーは **市民が読む前提** で記述する。

### タイトルの品質基準
- **原文（会議録）に登場する語は変えない**: 「住市総」「公衆衛生医師」「プッシュ型採用広報」など、元の会議録で使われている行政略語・専門用語はそのまま使うこと。誤った言い換えは事実誤認になり、専門語のままの方が安全
- **AI生成で追加した要約語は平易に**: あくまで会議録に存在しないAI生成の補足語・タイトル補完部分を平易にする
- **複合専門語の連続**: タイトルが著しく長くて難解な場合は、原文の語を保ちつつ短くすることを検討する

### タイトルとカテゴリ分類
キーワードによるカテゴリ分類は廃止した（上の「カテゴリ分類（廃止）」）。分類のためにタイトルへキーワードを足す必要はない。

### Qサマリーの文体
- NG: 「〜を**質した**」「〜を**問いただした**」（議会報告調・対立的ニュアンス）
- OK: 「〜を確認した」「〜を求めた」「〜について質問した」

### 複数答弁者の書き方
- `answerer_role`: 「○○局長（氏名）・市長（氏名）」のように役職と氏名をセットで格納
- `answerer_name`: 空にする（UIで `role` と `name` を連結表示するため二重になる）

## AI生成コンテンツの更新ルール

`general_questions.topics` の JSON（要約・答弁者など）を更新する際は **必ずユーザーにレビューを提示してからPATCHを実行すること**。

確認観点：
1. 日本語の自然さ（語尾・助詞・文体）
2. 答弁者の役職と担当内容が一致しているか
3. 中国語漢字の混入がないか
4. 複数トピックをまたぐ場合、A議案の情報がB議案に混入していないか

（CLAUDE.md「AI生成コンテンツのDB更新ルール」も参照）

## 今後の課題（設計書参照）

- Admin UIによる publish_status 管理（設計書: `docs/fukuoka/20260428_1100_一般質問管理画面設計書.md`）

※ 新定例会データのインポートフローは `update-general-questions` スキルに整備済み。
