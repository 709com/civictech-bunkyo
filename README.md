# ぶんきょう議会ナビ

文京区議会の本会議で行われた一般質問を、検索・閲覧できる議会報告サイトです。文京区議会の会派「ぶんきょう子育て.ネット」が運営しています。

- 第1段階として、本会議の一般質問（直近1期分）を掲載します。
- 一般質問は、定例会ごとに日付順・登壇した順に並べています。掲載順・表示順は支持や評価を示すものではありません。

## 運営と費用について

本サイトは文京区および文京区議会の公式サービスではありません。文京区議会の会派「ぶんきょう子育て.ネット」（区議会議員 高浜直樹）が、政務活動費（広報費）を使って運営する議会報告サイトです。本サイトの作成・運営に、文京区および文京区議会事務局は関与していません。政党チームみらいとは関係ありません。

## 掲載内容について

- 一般質問の見出しと本文は、会議録の原文からプログラムで機械的に抜き出したもので、AI による要約ではありません。
- 抜き出しの誤りがありうるため、正確な表現は公式の会議録（文京区議会 会議録検索システム https://www.city.bunkyo.tokyo.dbsr.jp/ ）でご確認ください。

## お問い合わせ

内容の誤りのご報告やお問い合わせは、サイトの問い合わせフォームからお願いします。

https://docs.google.com/forms/d/e/1FAIpQLScM_PEshV6o6yq02lMlFljpgjg3DX0sFC0SP4kOidLYXwxi2g/viewform

## ライセンスとクレジット

- ライセンス：AGPL-3.0（[LICENSE](LICENSE)）。改変したソースコードもこのリポジトリで公開しています。
- team-mirai/mirai-gikai（AGPL-3.0）を改変して利用しています。
- Fork の系譜：team-mirai/mirai-gikai → bakumon1107/mirai-gikai-fukuoka-city → 川崎版 → wakuwakumirailab/mirai-gikai-adachi → 709com/civictech-bunkyo（このリポジトリ）

---

## 開発者向け

### 前提

- Node.js 20 以上 / pnpm 9 以上 / Docker

### ローカルでの起動

```bash
# 1. パッケージのインストール
pnpm install

# 2. 環境変数の設定（必要に応じて .env の内容を変更してください）
cp .env.example .env

# 3. ローカルの Supabase を起動
npx supabase start

# 4. データベースの初期化と開発用シードデータの投入
#    （ローカルのデータベースの中身はすべて消えて作り直されます。
#      公開用のデータベースに対しては実行しないでください）
pnpm db:reset

# 5. 開発サーバーの起動
pnpm dev   # 公開サイト web（:3002）＋ 管理画面 admin（:3001）
```

- ローカルの Supabase：API `127.0.0.1:54421`、データベース `127.0.0.1:54432`、管理画面（Studio）http://127.0.0.1:54423
- 開発用の管理者アカウント（ローカル専用）は `supabase/seed.sql` の冒頭を参照してください。
- 会議録のデータはリポジトリに含めていません。シードデータだけでは一般質問は表示されません。

### よく使うコマンド

| コマンド | 内容 |
|---------|------|
| `pnpm dev` | web と admin を同時に起動 |
| `pnpm test` | すべてのテストを実行 |
| `pnpm lint` | Biome による書式と Lint の確認 |
| `pnpm typecheck` | TypeScript の型チェック |
| `npx supabase migration new <名前>` | マイグレーションファイルの作成 |
| `npx supabase migration up` | マイグレーションの適用（ローカル） |
| `npx supabase@2.116.0 gen types typescript --local > packages/supabase/types/supabase.types.ts` | Supabase の型定義の再生成 |

> [!NOTE]
> 型定義は Supabase CLI 2.116.0 で生成してください。新しい版で生成すると書式と型が変わり、既存のコードの型チェックが通らなくなります。

### サイトの設定

サイト名・運営者・公式サービスではないことの表示・問い合わせフォームなどの設定は `web/src/config/site.config.ts` にまとめています。一般質問以外の機能（議案・委員会・予算など）は、同じファイルの `features.showOtherSections` で表示を止めています。

### プロジェクト構成

```
web/src/
├── app/            # Next.js のルーティング
├── components/     # 共通の UI 部品
├── config/         # サイトの設定
├── features/       # 機能別のモジュール（general-questions など）
└── lib/            # 共通のユーティリティ

admin/src/          # データ管理用の管理画面

packages/
├── supabase/       # Supabase クライアント・型定義
└── seed/           # 開発用の初期データ投入スクリプト

supabase/migrations/ # データベースのマイグレーション
docs/                # 上流（Fork 元）から引き継いだ設計資料
```
