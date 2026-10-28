-- =============================================================
-- 会議録の全文（本会議・委員会）を入れるための表と列
-- =============================================================
-- 設計案：data/設計案_会議録データベース_2026-10-27.md（第2版・2026-10-27 先生の決定つき）
--
-- このファイルは「表の形」だけを作る。会議録のデータは1行も入れない
-- （入れるのは tools/load_term_minutes.py が作る命令書。先生の承認のあと）。
-- 区切りの種類の表（section_kinds）だけは、決まりの一覧なのでここで入れる。
--
-- 守ること
--   ・今ある表は消さない・名前を変えない。今ある列も変えない（列を足すだけ）。
--     今の一般質問97件（meetings・sections・speeches・論点・general_questions）の行と ID はそのまま。
--   ・新しい表はすべて RLS を有効にし、ポリシーは作らない（だれでも拒否）。
--     さらに anon（だれでも）と authenticated（ログインした人）の権限を取り上げる（二重の守り）。
--     読み書きはサーバー側の service_role の鍵からだけ（20261022120000 の締め直しと同じ考え方）。
--   ・公開してよい候補の表も、今は読み取りのポリシーを作らない。
--     内部専用の表（設計案 3-2）には、将来も公開の読み取りを付けない（表のコメントに書いた）。
--   ・隠すと決めた個人情報は、入れる場所を作らない：
--     契約の相手方の代表者の氏名の列は作らない／請願者・陳情者の欄の列は作らない。
--   ・非公開の段落の決まり（minutes_paragraphs）を表の決まり（check）で守る：
--     丸ごと隠した段落は本文が必ず空／一部だけ隠した段落は「［非公開」の置き換えの数が masked_count と一致／
--     両方の印を同じ段落に付けない。
--   ・管理画面の検索の関数2つ（search_general_question_passages・general_question_search_options）は、
--     本会議の一般質問だけを見るように作り直す（12a。委員会の全文を入れても今の検索の結果が変わらないように）。
--   ・sections.excluded_from_analysis（自動計算の列）には触らない。
--     分析の対象外かどうかは、区切りの種類の表とつないだビュー sections_analysis で判定する（設計案 2-4 の案②）。


-- =============================================================
-- 0. 字体の揺れをそろえる「ゆるい鍵」
-- =============================================================
-- 分解の道具（tools/split_committee_minutes.py の VARIANTS）と同じそろえ方。
-- 照らし合わせのときだけ使う。重複禁止にはしない（本当に別人の可能性を残す）。
-- 記録する名前は名簿の字のまま。
create function public.alias_key_loose(p_text text)
returns text
language sql
immutable
set search_path = ''
as $$
  select translate(public.member_alias_key(p_text),
                   '﨑髙邊邉齋齊濵德瀨栁曵冨嶋眞',
                   '崎高辺辺斎斉浜徳瀬柳曳富島真');
$$;

comment on function public.alias_key_loose(text) is
  '字体の揺れ（髙→高、﨑→崎 など）をそろえた比較用の鍵。同じ人の候補を探すときだけ使い、自動ではまとめない';

revoke execute on function public.alias_key_loose(text) from public, anon, authenticated;
grant execute on function public.alias_key_loose(text) to service_role;


-- =============================================================
-- 1. 投入の記録・会議体・元ファイル
-- =============================================================

-- ★ ingest_runs（投入の記録）― 内部専用
create table public.ingest_runs (
  id            uuid primary key default gen_random_uuid(),
  run_at        timestamptz not null default now(),
  tool_name     text not null check (btrim(tool_name) <> ''),
  tool_version  text not null check (btrim(tool_version) <> ''),
  source_tool_versions text[] not null default '{}',
  file_count    integer not null check (file_count >= 0),
  counts_before jsonb,
  counts_after  jsonb,
  mode          text not null check (mode in ('dry_run', 'apply')),
  approved_on   date,
  note          text
);

comment on table public.ingest_runs is
  '投入の記録（内部専用。将来も公開の読み取りは付けない）';
comment on column public.ingest_runs.source_tool_versions is '中間ファイルを作った分解の道具の版（混ざっていないことの記録）';
comment on column public.ingest_runs.mode is 'dry_run＝試し刷り（rollback する）／apply＝本番';
comment on column public.ingest_runs.approved_on is '先生が承認した日（本番のとき）';

-- ★ meeting_bodies（会議体の名簿）― 公開してよい候補
-- 名前を committees にしないのは、議案の付託先の表 committees がすでにあるため（設計案 2-0）。
create table public.meeting_bodies (
  id               uuid primary key default gen_random_uuid(),
  name             text not null unique check (btrim(name) <> ''),
  body_type        text not null check (body_type in (
                     '本会議', '常任委員会', '特別委員会（調査など）', '議会運営委員会',
                     '予算審査特別委員会', '決算審査特別委員会', '全員協議会')),
  drive_folder_no  text,
  active_from      date,
  active_to        date,
  predecessor_id   uuid references public.meeting_bodies(id) on delete set null,
  committee_id     uuid references public.committees(id) on delete set null,
  note             text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint meeting_bodies_active_check
    check (active_from is null or active_to is null or active_from <= active_to)
);

comment on table public.meeting_bodies is
  '会議体の名簿（本会議・各委員会・全員協議会）。議案の付託先の表 committees とは別に持つ。公開してよい候補（今は読み取りのポリシーなし）';
comment on column public.meeting_bodies.drive_folder_no is 'ドライブのフォルダ番号（例：02）';
comment on column public.meeting_bodies.active_from is 'この名前が使われた期間の始まり（分かるときだけ）';
comment on column public.meeting_bodies.active_to is 'この名前が使われた期間の終わり（分かるときだけ）';
comment on column public.meeting_bodies.predecessor_id is '前身の会議体（名前が変わったとき）';
comment on column public.meeting_bodies.committee_id is '今ある committees（議案の付託先）との任意の結び付け';

-- ★ source_files（元ファイルの目録）― 内部専用（ドライブのフォルダ名が出るため）
create table public.source_files (
  id                    uuid primary key default gen_random_uuid(),
  file_name             text not null check (btrim(file_name) <> ''),
  drive_path            text,
  format                text not null check (format in ('doc', 'docx', 'pdf')),
  converted             boolean not null default false,
  conversion            text,
  sha256_source         text not null check (sha256_source ~ '^[0-9a-f]{64}$'),
  size_source           bigint check (size_source >= 0),
  parsed_file           text,
  sha256_parsed         text check (sha256_parsed is null or sha256_parsed ~ '^[0-9a-f]{64}$'),
  source_type           text not null check (source_type in ('seishiki', 'sokuhou')),
  meeting_key           text not null check (btrim(meeting_key) <> ''),
  volume                text,
  date_from_name        date,
  date_source           text,
  date_check            text,
  selected_because      text,
  is_representative     boolean not null,
  duplicate_of          uuid references public.source_files(id) on delete set null,
  same_text_as_representative boolean,
  dedupe_rule           text,
  format_issues         jsonb not null default '[]'::jsonb,
  tool_name             text,
  tool_version          text,
  intermediate_sha256   text check (intermediate_sha256 is null or intermediate_sha256 ~ '^[0-9a-f]{64}$'),
  ingest_run_id         uuid references public.ingest_runs(id) on delete set null,
  created_at            timestamptz not null default now(),
  -- 同じファイルの二重投入を、表の決まりで拒否する
  constraint source_files_sha256_source_key unique (sha256_source),
  -- 代表のファイルは「何の重複か」を持たない
  constraint source_files_duplicate_check check (not (is_representative and duplicate_of is not null))
);

create index source_files_meeting_key_idx on public.source_files (meeting_key);

comment on table public.source_files is
  '元ファイルの目録（1ファイル1行）。内部専用（ドライブのフォルダ名が出るため。将来も公開の読み取りは付けない）。'
  '代表でないファイルは目録には載せるが、中身は入れない';
comment on column public.source_files.drive_path is '元の場所（ドライブのパス）';
comment on column public.source_files.conversion is '変換の方法（.doc を Word で .docx にした、など）';
comment on column public.source_files.sha256_source is '元ファイルのハッシュ（重複禁止）';
comment on column public.source_files.parsed_file is '分解の道具が実際に読んだファイル';
comment on column public.source_files.meeting_key is '会議の鍵（例：委員会:厚生委員会:2023-05-26）。速報版→正式版でも変わらない';
comment on column public.source_files.volume is '分冊（①②など）';
comment on column public.source_files.is_representative is '同じ会議の鍵のファイルの中で、データベースに中身を入れる代表か';
comment on column public.source_files.duplicate_of is '代表でないとき、どの代表の重複か';
comment on column public.source_files.format_issues is '分解の道具が見つけた書式の問題';
comment on column public.source_files.intermediate_sha256 is '分解の道具の中間ファイル（JSON）のハッシュ';


-- =============================================================
-- 2. 人の名簿（議員は今の members のまま）
-- =============================================================

-- ★ officials（理事者・事務局・講師などの人の名簿）― 内部専用
create table public.officials (
  id             uuid primary key default gen_random_uuid(),
  name           text not null check (btrim(name) <> ''),
  name_key_loose text generated always as (public.alias_key_loose(name)) stored,
  yomi           text,
  official_kind  text not null check (official_kind in ('理事者', '事務局', '講師・参考人', '公の機関の代表')),
  is_provisional boolean not null default true,
  note           text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index officials_name_key_loose_idx on public.officials (name_key_loose);

comment on table public.officials is
  '理事者・事務局職員・講師などの人の名簿（1人1行）。議員は members。内部専用（将来も公開の読み取りは付けない）。'
  '字体の揺れ（ゆるい鍵）が同じだけでは自動でまとめず、同じ人の候補として先生が確かめる';
comment on column public.officials.name is '名前（名簿の字のまま）';
comment on column public.officials.name_key_loose is '字体の揺れをそろえた鍵（自動計算。重複禁止にしない）';
comment on column public.officials.is_provisional is '仮登録の印（人が確かめるまでは true）';

-- ★ official_aliases（その表記ゆれ）― 内部専用。member_aliases と同じ作り
create table public.official_aliases (
  id              uuid primary key default gen_random_uuid(),
  official_id     uuid not null references public.officials(id) on delete cascade,
  alias           text not null check (btrim(alias) <> ''),
  alias_key       text generated always as (public.member_alias_key(alias)) stored,
  alias_key_loose text generated always as (public.alias_key_loose(alias)) stored,
  created_at      timestamptz not null default now(),
  constraint official_aliases_alias_key_unique unique (alias_key)
);

create index official_aliases_official_id_idx on public.official_aliases (official_id);
create index official_aliases_alias_key_loose_idx on public.official_aliases (alias_key_loose);

comment on table public.official_aliases is '理事者などの名前の表記ゆれ。内部専用（将来も公開の読み取りは付けない）';
comment on column public.official_aliases.alias_key_loose is '字体の揺れをそろえた鍵（自動計算。重複禁止にしない）';

-- member_aliases に「ゆるい鍵」を足す（今の alias_key と重複禁止の決まりは変えない）
alter table public.member_aliases
  add column alias_key_loose text generated always as (public.alias_key_loose(alias)) stored;

create index member_aliases_alias_key_loose_idx on public.member_aliases (alias_key_loose);

comment on column public.member_aliases.alias_key_loose is
  '字体の揺れ（髙→高 など）をそろえた鍵（自動計算）。重複禁止にしない。一致しただけでは同じ人とみなさない';

-- ☆ official_posts（肩書の移り変わり）― 内部専用
create table public.official_posts (
  id               uuid primary key default gen_random_uuid(),
  official_id      uuid not null references public.officials(id) on delete cascade,
  post_title       text not null check (btrim(post_title) <> ''),
  department       text,
  first_meeting_id uuid references public.meetings(id) on delete set null,
  last_meeting_id  uuid references public.meetings(id) on delete set null,
  start_date       date,
  end_date         date,
  basis            text,
  created_at       timestamptz not null default now(),
  constraint official_posts_dates_check check (start_date is null or end_date is null or start_date <= end_date)
);

create index official_posts_official_id_idx on public.official_posts (official_id);

comment on table public.official_posts is '理事者などの肩書の移り変わり（始まりと終わりは、最初と最後に名簿に出た会議）。内部専用（将来も公開の読み取りは付けない）';

-- ☆ member_terms（議員の任期と議席）― 内部専用
create table public.member_terms (
  id          uuid primary key default gen_random_uuid(),
  member_id   uuid not null references public.members(id) on delete cascade,
  term_number integer check (term_number >= 1),
  start_date  date,
  end_date    date,
  seat_number integer check (seat_number >= 1),
  basis       text,
  created_at  timestamptz not null default now(),
  constraint member_terms_dates_check check (start_date is null or end_date is null or start_date <= end_date)
);

create index member_terms_member_id_idx on public.member_terms (member_id);

comment on table public.member_terms is '議員の任期（何期目）と議席番号。内部専用（将来も公開の読み取りは付けない）';


-- =============================================================
-- 3. 区切りの種類の表
-- =============================================================

-- ★ section_kinds（区切りの種類）― 公開してよい候補（決まりの一覧）
create table public.section_kinds (
  kind                   text primary key check (btrim(kind) <> ''),
  base_kind              text not null check (base_kind in ('general_question', 'report_qa', 'other')),
  excluded_from_analysis boolean not null,
  sort_order             integer not null unique,
  note                   text,
  -- sections から（細目, 3分類）の組で参照し、細目と3分類の食い違いを表の決まりで防ぐ
  constraint section_kinds_kind_base_key unique (kind, base_kind)
);

comment on table public.section_kinds is
  '区切りの種類（細目）の表。今の sections.kind の3分類のどれに当たるか、分析の対象外かを決める';
comment on column public.section_kinds.base_kind is '今の sections.kind の3分類（general_question／report_qa／other）のどれに当たるか';
comment on column public.section_kinds.excluded_from_analysis is
  '分析の対象外か。sections.excluded_from_analysis（kind = other で自動）ではなく、この値で判定する（ビュー sections_analysis）';

insert into public.section_kinds (kind, base_kind, excluded_from_analysis, sort_order, note) values
  ('開会・委員会運営', 'other',            true,  10, '開会、正副委員長の互選の進め方など'),
  ('付議事件の件名',   'other',            false, 20, '委員会の付議事件の審査'),
  ('日程',             'other',            true,  30, '日程の宣言'),
  ('提案説明',         'other',            false, 40, null),
  ('議案',             'other',            false, 50, null),
  ('議案質疑',         'other',            false, 60, null),
  ('付託議案審査',     'other',            false, 70, null),
  ('委員長報告',       'other',            false, 80, null),
  ('委員会報告',       'other',            false, 90, null),
  ('理事者報告',       'report_qa',        false, 100, '理事者からの報告とその質疑（報告事項の質疑）'),
  ('請願・陳情',       'other',            false, 110, '請願・陳情は第1段階では扱わない（引き継ぎ書 3-5）'),
  ('付託請願審査',     'other',            false, 120, '請願・陳情は第1段階では扱わない（引き継ぎ書 3-5）'),
  ('代表質問',         'other',            false, 130, null),
  ('一般質問',         'general_question', false, 140, null),
  ('一般質問の進行',   'other',            true,  150, '本会議の一般質問の範囲の中で、質問者と質問者の間などの議長の進行（今の97件の区切りに入っていない発言）。データベースで足した種類'),
  ('総括質疑',         'other',            false, 160, '予算・決算特別委員会'),
  ('款別質疑',         'other',            false, 170, '予算・決算特別委員会。kind は other だが分析の対象'),
  ('態度表明',         'other',            false, 180, null),
  ('採決',             'other',            false, 190, null),
  ('選挙・人事',       'other',            false, 200, '互選・選任・選挙。今の分解の道具は互選・選任の区切りを「採決」にしている例がある（設計案 2-4）'),
  ('研究会・講演',     'other',            false, 210, null),
  ('委員会記録',       'other',            true,  220, '委員会記録について 等'),
  ('その他',           'other',            true,  230, null),
  ('閉会',             'other',            true,  240, null);


-- =============================================================
-- 4. meetings（会議）に足す列
-- =============================================================

alter table public.meetings
  add column meeting_key            text,
  add column meeting_body_id        uuid references public.meeting_bodies(id) on delete set null,
  add column session_kind           text check (session_kind in ('招集', '定例', '臨時')),
  add column session_number         integer check (session_number >= 1),
  add column day_number             integer check (day_number >= 1),
  add column volume                 text,
  add column place                  text,
  add column title_raw              text,
  add column date_text              text,
  add column current_source_file_id uuid references public.source_files(id) on delete set null,
  add column content_scope          text not null default 'general_question_only'
    check (content_scope in ('general_question_only', 'full')),
  add column publish_status         text not null default 'draft'
    check (publish_status in ('draft', 'published')),
  add constraint meetings_meeting_key_key unique (meeting_key);

create index meetings_meeting_body_id_idx on public.meetings (meeting_body_id);

comment on column public.meetings.meeting_key is '会議の鍵（重複禁止）。速報版→正式版でも変わらない（例：委員会:厚生委員会:2023-05-26）';
comment on column public.meetings.meeting_body_id is '会議体の名簿（meeting_bodies）';
comment on column public.meetings.session_kind is '会期の種類（招集／定例／臨時）。本会議のとき';
comment on column public.meetings.session_number is '回次（分かるときだけ）';
comment on column public.meetings.day_number is '何日目（数字）';
comment on column public.meetings.volume is '分冊（①②など）';
comment on column public.meetings.place is '場所（委員会室など）';
comment on column public.meetings.title_raw is '会議録の題名（原文のまま）';
comment on column public.meetings.date_text is '本文の日付の書き方そのまま';
comment on column public.meetings.current_source_file_id is 'いま正本にしている元ファイル（source_files）';
comment on column public.meetings.content_scope is
  '何が入っているか。general_question_only＝一般質問の部分だけ（2026-10-13 の取り込み）／full＝全文';
comment on column public.meetings.publish_status is '会議単位の公開の印。最初は全部 draft（下書き）。公開サイトは今は general_questions だけを読む';


-- =============================================================
-- 5. 会議ごとの名簿・時刻
-- =============================================================

-- ★ meeting_attendance（会議ごとの名簿）― 内部専用
create table public.meeting_attendance (
  id             uuid primary key default gen_random_uuid(),
  meeting_id     uuid not null references public.meetings(id) on delete cascade,
  roster_order   integer not null,
  roster_section text not null check (roster_section in (
                   '出席委員', '欠席委員', '委員外議員', '出席議員', '欠席議員',
                   '出席説明員', '事務局職員', '講師・参考人（付議事件の欄）', '欠員')),
  role_raw       text,
  name_raw       text,
  name_key_loose text,
  seat_number    integer check (seat_number >= 1),
  affiliation    text,
  para           integer,
  raw_line       text,
  note           text,
  member_id      uuid references public.members(id) on delete restrict,
  official_id    uuid references public.officials(id) on delete restrict,
  match_status   text not null default 'unconfirmed' check (match_status in ('confirmed', 'candidate', 'unconfirmed')),
  created_at     timestamptz not null default now(),
  constraint meeting_attendance_order_key unique (meeting_id, roster_order),
  constraint meeting_attendance_one_person check (member_id is null or official_id is null)
);

create index meeting_attendance_member_id_idx on public.meeting_attendance (member_id);
create index meeting_attendance_official_id_idx on public.meeting_attendance (official_id);

comment on table public.meeting_attendance is
  '会議ごとの名簿（1会議×1人で1行。名前は名簿の字のまま）。内部専用（将来も公開の読み取りは付けない）';
comment on column public.meeting_attendance.roster_section is '名簿の区分';
comment on column public.meeting_attendance.name_key_loose is '字体の揺れをそろえた名前（照らし合わせ用）';
comment on column public.meeting_attendance.affiliation is '講師などの所属（名簿に書かれていたとき）';
comment on column public.meeting_attendance.match_status is
  '議員・理事者の名簿との照合の状態。confirmed＝表記が一致／candidate＝候補／unconfirmed＝未確認';

-- ★ meeting_times（時刻の目印）― 公開してよい候補
create table public.meeting_times (
  id            uuid primary key default gen_random_uuid(),
  meeting_id    uuid not null references public.meetings(id) on delete cascade,
  para          integer not null,
  event         text check (event in ('開会', '開議', '休憩', '再開', '閉会', '散会')),
  hh            integer check (hh between 0 and 47),
  mm            integer check (mm between 0 and 59),
  hhmm          text,
  text_raw      text not null,
  possible_typo text,
  created_at    timestamptz not null default now(),
  constraint meeting_times_meeting_para_key unique (meeting_id, para)
);

comment on table public.meeting_times is
  '時刻の目印（開会・休憩・再開・閉会など）。発言ごとの時刻は会議録に無いので持たない。公開してよい候補（今は読み取りのポリシーなし）';
comment on column public.meeting_times.event is '出来事。読み取れないときは空';
comment on column public.meeting_times.possible_typo is '原文の時刻の誤りの可能性（分解の道具の指摘）';


-- =============================================================
-- 6. speeches（発言）に足す列
-- =============================================================

alter table public.speeches
  add column speech_key          text,
  add column key_head20_sha1     text,
  add column key_dup_no          integer check (key_dup_no >= 1),
  add column speaker_label_raw   text,
  add column speaker_detail      text check (speaker_detail in ('議長', '委員長', '議員', '理事者', '事務局', '講師・参考人', '不明')),
  add column attendance_id       uuid references public.meeting_attendance(id) on delete set null,
  add column official_id         uuid references public.officials(id) on delete restrict,
  add column identify_how        text,
  add column identify_note       text,
  add column is_presiding        boolean,
  add column presiding_class     text check (presiding_class in ('進行', '役職としての報告・あいさつ', '質問・意見')),
  add column is_related_question boolean not null default false,
  add column chars               integer check (chars >= 0),
  add column chars_nospace       integer check (chars_nospace >= 0),
  add column para_start          integer,
  add column para_end            integer,
  add column line_start          integer,
  add column line_end            integer,
  add column starts_mid_section  boolean not null default false,
  add column sections_spanned    integer[],
  add column in_general_question boolean not null default false,
  add column flags               text[],
  -- 本文の中に隠した部分（［非公開…］の置き換え）があるか。本文から自動で決まる
  add column has_masked          boolean generated always as (strpos(body, '［非公開') > 0) stored,
  add column status              text not null default 'normal' check (status in ('normal', 'removed_in_seishiki')),
  add column source_file_id      uuid references public.source_files(id) on delete set null,
  add constraint speeches_speech_key_key unique (speech_key),
  -- 正式版で消えた発言（取り消しの候補）は、行を残して本文を空にする（設計案 2-7）
  add constraint speeches_removed_body_check check (status <> 'removed_in_seishiki' or body = ''),
  add constraint speeches_one_person_check check (member_id is null or official_id is null);

create index speeches_official_id_idx on public.speeches (official_id);

comment on column public.speeches.speech_key is
  '発言の鍵：会議の鍵｜話し手の原文の表記｜本文の先頭20字の指紋（sha1の12桁）＋重複の番号。速報版→正式版の対応に使う';
comment on column public.speeches.key_head20_sha1 is '本文の先頭20字の指紋（sha1 の先頭12桁）';
comment on column public.speeches.key_dup_no is '同じ会議・同じ話し手・同じ書き出しの発言の何番目か';
comment on column public.speeches.speaker_label_raw is '原文の話し手の表記そのまま（例：白石議長）';
comment on column public.speeches.speaker_detail is
  '分解の道具の話し手の区分（細かい区分）。speaker_kind の4区分は変えず、事務局・講師・不明は other に入れる';
comment on column public.speeches.attendance_id is 'その会議の名簿（meeting_attendance）のどの人か';
comment on column public.speeches.official_id is '理事者などの人の名簿（officials）';
comment on column public.speeches.identify_how is '名簿とどう照らし合わせたか（分解の道具の記録）';
comment on column public.speeches.presiding_class is '議長・委員長の発言の印（進行／役職としての報告・あいさつ／質問・意見）';
comment on column public.speeches.is_related_question is '関連質問';
comment on column public.speeches.chars is '文字数（隠した部分も含む。表・ト書きは含まない）';
comment on column public.speeches.chars_nospace is '空白を除いた文字数';
comment on column public.speeches.para_start is '原文の段落番号（始まり）';
comment on column public.speeches.para_end is '原文の段落番号（終わり）';
comment on column public.speeches.starts_mid_section is '1つの発言が2つ以上の区切りにまたがる印';
comment on column public.speeches.sections_spanned is 'またがる区切りの番号（分解の道具の番号）';
comment on column public.speeches.in_general_question is '一般質問の範囲の中の発言';
comment on column public.speeches.flags is '分解の道具の要確認の印';
comment on column public.speeches.has_masked is '本文の中に隠した部分（［非公開…］）がある（自動計算）';
comment on column public.speeches.status is 'normal＝ふつう／removed_in_seishiki＝正式版で消えた（取り消しの候補。本文は空）';
comment on column public.speeches.source_file_id is 'どの元ファイルから入れたか';


-- =============================================================
-- 7. 一般質問の範囲と、区切りに足す列
-- =============================================================

-- ★ general_question_ranges（一般質問の範囲）― 内部専用
create table public.general_question_ranges (
  id                 uuid primary key default gen_random_uuid(),
  meeting_id         uuid not null unique references public.meetings(id) on delete cascade,
  start_speech_id    uuid references public.speeches(id) on delete set null,
  end_speech_id      uuid references public.speeches(id) on delete set null,
  start_seq          integer,
  end_seq            integer,
  start_wording      text,
  end_marker         text,
  end_wording        text,
  start_declarations integer,
  end_declarations   integer,
  speech_count       integer,
  declared           jsonb not null default '[]'::jsonb,
  declared_check     jsonb,
  needs_check        text,
  notices            jsonb not null default '[]'::jsonb,
  created_at         timestamptz not null default now(),
  constraint general_question_ranges_seq_check check (start_seq is null or end_seq is null or start_seq <= end_seq)
);

comment on table public.general_question_ranges is
  '一般質問の範囲（会議ごと）。範囲は区切りの集まりとして持つ（sections.range_id）。'
  '内部専用（委員会の一般質問を議員ごとに並べる一覧は著作権法40条但書のため。将来も公開の読み取りは付けない）';
comment on column public.general_question_ranges.end_marker is
  '終わりの目印の種類（①終了宣言／②「その他」に入る宣言／③閉会宣言／本日の日程の終了・散会 など）';
comment on column public.general_question_ranges.declared is '委員長が宣言した件数・人数（「５名の方から、７件の質問」など）';

alter table public.sections
  add column kind_detail          text,
  add column start_seq            integer,
  add column end_seq              integer,
  add column start_para           integer,
  add column start_sentence       integer,
  add column start_char           integer,
  add column start_sentence_head  text,
  add column range_id             uuid references public.general_question_ranges(id) on delete set null,
  add column range_role           text check (range_role in ('main', 'interposed', 'progress')),
  add column source_section_no    integer,
  -- 細目は種類の表にあるものだけ。しかも細目の3分類と kind が一致すること
  add constraint sections_kind_detail_fkey
    foreign key (kind_detail, kind) references public.section_kinds (kind, base_kind),
  add constraint sections_range_pair_check check ((range_id is null) = (range_role is null)),
  add constraint sections_seq_check check (start_seq is null or end_seq is null or start_seq <= end_seq);

create index sections_range_id_idx on public.sections (range_id);

comment on column public.sections.kind_detail is '区切りの種類の細目（section_kinds）。kind（3分類）はそのまま';
comment on column public.sections.start_seq is '発言の番号の範囲（始まり）';
comment on column public.sections.end_seq is '発言の番号の範囲（終わり）';
comment on column public.sections.start_para is '原文の段落番号（始まり）';
comment on column public.sections.start_sentence is '発言の途中から始まるとき、その発言の何文目か';
comment on column public.sections.start_char is '発言の途中から始まるとき、その発言の何文字目か（先頭が0）';
comment on column public.sections.range_id is '一般質問の範囲（general_question_ranges）';
comment on column public.sections.range_role is
  'main＝範囲の本体／interposed＝途中に挟まった別の議事（理事者報告など）／progress＝本会議の質問者の間の議長の進行';
comment on column public.sections.source_section_no is '分解の道具の区切りの番号（0から）';

-- 分析の対象外かどうかは、種類の表から決める（今の自動計算の列 excluded_from_analysis には触らない）
create view public.sections_analysis
with (security_invoker = true)
as
select
  s.id                         as section_id,
  s.meeting_id,
  s.kind,
  s.kind_detail,
  coalesce(k.excluded_from_analysis, s.excluded_from_analysis) as excluded_from_analysis,
  case when k.kind is not null then 'section_kinds' else 'kind_other' end as excluded_basis
from public.sections s
left join public.section_kinds k on k.kind = s.kind_detail;

comment on view public.sections_analysis is
  '区切りごとの「分析の対象外」の判定。細目（kind_detail）があれば種類の表、無ければ今の列（kind = other）で決める';

revoke all on public.sections_analysis from anon, authenticated;

-- ★ general_question_items（一般質問の項目）― 内部専用
create table public.general_question_items (
  id                    uuid primary key default gen_random_uuid(),
  range_id              uuid not null references public.general_question_ranges(id) on delete cascade,
  item_no               integer not null check (item_no >= 1),
  -- 本会議の97件は、今の区切り（質問者1人分）と1対1で結ぶ
  section_id            uuid unique references public.sections(id) on delete set null,
  questioner_label      text,
  questioner_full_name  text,
  member_id             uuid references public.members(id) on delete restrict,
  is_related_question   boolean not null default false,
  title                 text,
  title_rule            text,
  -- 項目名の出どころ（10-27 先生の決定⑩）。空欄は null
  title_source          text check (title_source in ('質問', '答弁', '言葉から推定')),
  title_field           text,
  titles_found          text[],
  title_from_seq        integer,
  first_sentence        text,
  needs_check           boolean not null default false,
  needs_check_reasons   text[],
  count_hint            text,
  created_at            timestamptz not null default now(),
  constraint general_question_items_no_key unique (range_id, item_no),
  -- 見つからない項目名は空欄のまま（推測で埋めない）。出どころが空なら項目名も空
  constraint general_question_items_title_check check (title is null or btrim(title) <> '')
);

create index general_question_items_member_id_idx on public.general_question_items (member_id);

comment on table public.general_question_items is
  '一般質問の項目（質問者1人の1項目）。委員会の一般質問を議員ごとに並べる一覧は、著作権法40条但書のため内部専用。'
  '将来も公開の読み取りは付けない';
comment on column public.general_question_items.title is '項目名。見つからなければ空欄のまま（推測で埋めない）';
comment on column public.general_question_items.title_source is
  '項目名の出どころ：質問＝質問者の名乗り／答弁＝最初の答弁の前置き／言葉から推定＝分野を「（教育）」のようにかっこ付きで（AI は使わない）。空欄は null';
comment on column public.general_question_items.title_field is '言葉から推定した分野（title_source が「言葉から推定」のとき）';
comment on column public.general_question_items.needs_check_reasons is '要確認の理由';

-- ★ general_question_item_speeches（項目と発言の対応）― 内部専用
create table public.general_question_item_speeches (
  id          uuid primary key default gen_random_uuid(),
  item_id     uuid not null references public.general_question_items(id) on delete cascade,
  speech_id   uuid not null references public.speeches(id) on delete cascade,
  role        text not null check (role in ('question', 'answer')),
  attribution text,
  created_at  timestamptz not null default now(),
  constraint general_question_item_speeches_key unique (item_id, speech_id)
);

create index general_question_item_speeches_speech_id_idx on public.general_question_item_speeches (speech_id);

comment on table public.general_question_item_speeches is '一般質問の項目と発言の対応。内部専用（将来も公開の読み取りは付けない）';
comment on column public.general_question_item_speeches.attribution is '答弁がどの質問者のものかの決め方（「直前の質問者」など）';


-- =============================================================
-- 8. 原文の段落（非公開の印つき）
-- =============================================================

-- ★ minutes_paragraphs（原文の段落）― 内部専用
create table public.minutes_paragraphs (
  id                  uuid primary key default gen_random_uuid(),
  meeting_id          uuid not null references public.meetings(id) on delete cascade,
  source_file_id      uuid references public.source_files(id) on delete set null,
  para                integer not null,
  pd_index            integer,
  part                text not null check (btrim(part) <> ''),
  text                text not null default '',
  chars               integer generated always as (char_length(text)) stored,
  speech_id           uuid references public.speeches(id) on delete set null,
  table_cell          integer[],
  stage_inside_speech_id uuid references public.speeches(id) on delete set null,
  stage_after_speech_id  uuid references public.speeches(id) on delete set null,
  also_contains       text,
  ptext_differs       boolean not null default false,
  ptext_missing_chars integer,
  notes               jsonb,
  -- 丸ごと隠した段落：理由だけを持ち、本文は必ず空
  withheld_reason     text check (withheld_reason is null or btrim(withheld_reason) <> ''),
  withheld_orig_chars integer check (withheld_orig_chars >= 0),
  -- 一部だけ隠した段落：本文は「［非公開：…］」に置き換えた文字で持つ
  masked_reason       text check (masked_reason is null or btrim(masked_reason) <> ''),
  masked_count        integer check (masked_count >= 1),
  masked_orig_chars   integer check (masked_orig_chars >= 0),
  created_at          timestamptz not null default now(),
  constraint minutes_paragraphs_meeting_para_key unique (meeting_id, para),
  -- 丸ごと隠した段落は、本文が必ず空
  constraint minutes_paragraphs_withheld_empty check (withheld_reason is null or text = ''),
  -- 両方の印を同じ段落に付けない
  constraint minutes_paragraphs_one_mark check (withheld_reason is null or masked_reason is null),
  -- 一部だけ隠した段落は、理由と数がそろっていること
  constraint minutes_paragraphs_masked_pair check ((masked_reason is null) = (masked_count is null)),
  -- 「［非公開」の置き換えの数が masked_count と一致すること。印の無い段落に置き換えがあってもいけない
  constraint minutes_paragraphs_masked_count_matches check (
    coalesce(masked_count, 0)
      = (char_length(text) - char_length(replace(text, '［非公開', ''))) / char_length('［非公開')
  )
);

create index minutes_paragraphs_speech_id_idx on public.minutes_paragraphs (speech_id);

comment on table public.minutes_paragraphs is
  '原文の段落（1段落1行）。発言の段落の本文は speeches.body と二重に持つ（設計案⑨②）。'
  '内部専用（原文の層。将来も公開の読み取りは付けない）';
comment on column public.minutes_paragraphs.para is '段落番号（分解の道具の番号。表の中の段落も含む）';
comment on column public.minutes_paragraphs.pd_index is 'Word の中の段落の位置（表の中の段落は空）';
comment on column public.minutes_paragraphs.part is '部分の種類（冒頭（名簿・付議事件）／時刻／発言／ト書き／区切り線／空行／付属資料／表／請願文書表 など）';
comment on column public.minutes_paragraphs.table_cell is '表の中の段落のとき [表の番号, 行, 列]';
comment on column public.minutes_paragraphs.withheld_reason is '丸ごと隠した段落の理由。これがあれば本文は必ず空（表の決まり）';
comment on column public.minutes_paragraphs.withheld_orig_chars is '丸ごと隠した段落の元の文字数';
comment on column public.minutes_paragraphs.masked_reason is '一部だけ隠した段落の理由';
comment on column public.minutes_paragraphs.masked_count is '一部だけ隠した数。本文の中の「［非公開」の数と一致（表の決まり）';
comment on column public.minutes_paragraphs.masked_orig_chars is '一部だけ隠した段落の元の文字数';


-- =============================================================
-- 9. 予算・決算の欄、議題、採決、態度表明
-- =============================================================

-- ☆ section_budget_scopes（予算・決算の欄）― 内部専用（公開の判断は区切りの公開とあわせて先生が決める）
create table public.section_budget_scopes (
  id                         uuid primary key default gen_random_uuid(),
  section_id                 uuid not null references public.sections(id) on delete cascade,
  scope_order                integer not null default 1,
  wording                    text not null,
  accounts                   text[],
  sides                      text[],
  kan                        jsonb,
  kou                        jsonb,
  is_range                   boolean not null default false,
  inherited_from_same_speech boolean not null default false,
  created_at                 timestamptz not null default now(),
  constraint section_budget_scopes_order_key unique (section_id, scope_order)
);

comment on table public.section_budget_scopes is
  '予算・決算の欄（会計・歳入／歳出・款・項・範囲）。区切りの側（中間ファイルの sections[].budget_scope）から取る。'
  '会議の側の budget_review_parts は使わない（設計案 2-4）';
comment on column public.section_budget_scopes.wording is '宣言の文言そのまま';
comment on column public.section_budget_scopes.inherited_from_same_speech is '前の区切りから引き継いだ印（推測ではなく引き継ぎ）';

-- ☆ agenda_items（議題）― 公開してよい候補
create table public.agenda_items (
  id         uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.meetings(id) on delete cascade,
  item_order integer not null,
  para       integer,
  paras      integer[],
  label      text,
  level      integer,
  title      text,
  raw        text not null,
  refs       text[],
  item_kind  text check (item_kind in ('議案', '報告', '請願', '陳情', '選挙・人事', 'その他')),
  bill_id    uuid references public.bills(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint agenda_items_order_key unique (meeting_id, item_order)
);

comment on table public.agenda_items is
  '予定の議題（会議録の冒頭の付議事件・日程）。公開してよい候補（今は読み取りのポリシーなし）';
comment on column public.agenda_items.label is '番号（(1)、日程第一 など。原文のまま）';
comment on column public.agenda_items.refs is '分解の道具が読み取った参照（日程第N など）';
comment on column public.agenda_items.item_kind is '議題の種類（分かるときだけ。推測で埋めない）';
comment on column public.agenda_items.bill_id is '今ある議案の表（bills）との任意の結び付け';

-- ☆ section_agenda_items（区切りと議題の対応。多対多）― 公開してよい候補
create table public.section_agenda_items (
  section_id     uuid not null references public.sections(id) on delete cascade,
  agenda_item_id uuid not null references public.agenda_items(id) on delete cascade,
  created_at     timestamptz not null default now(),
  primary key (section_id, agenda_item_id)
);

create index section_agenda_items_agenda_item_id_idx on public.section_agenda_items (agenda_item_id);

comment on table public.section_agenda_items is '区切りと議題の対応（一括で議題にしたときは1区切りに複数）。公開してよい候補（今は読み取りのポリシーなし）';

-- ☆ votes（採決）― 公開してよい候補
create table public.votes (
  id               uuid primary key default gen_random_uuid(),
  section_id       uuid references public.sections(id) on delete cascade,
  speech_id        uuid references public.speeches(id) on delete cascade,
  vote_order       integer not null,
  meeting_id       uuid not null references public.meetings(id) on delete cascade,
  method_wording   text,
  result_wording   text not null check (btrim(result_wording) <> ''),
  -- 機械で「可決／否決」などに分けたときだけ。文言は消さない
  result_machine   text,
  result_machine_by text check (result_machine_by in ('機械で判定', '人が確認')),
  created_at       timestamptz not null default now(),
  constraint votes_order_key unique (meeting_id, vote_order),
  constraint votes_machine_check check ((result_machine is null) = (result_machine_by is null))
);

create index votes_section_id_idx on public.votes (section_id);

comment on table public.votes is
  '採決（結果は文言のまま）。会派・議員ごとの賛否は会議録に無いので持たない。公開してよい候補（今は読み取りのポリシーなし）';
comment on column public.votes.method_wording is '採決の方法の文言（直前の「採決」の印の文言。無ければ空）';
comment on column public.votes.result_wording is '結果の文言のまま（「起立多数と認めます」など）';

-- ☆ vote_agenda_items（採決と議題の対応。多対多）― 公開してよい候補
create table public.vote_agenda_items (
  vote_id        uuid not null references public.votes(id) on delete cascade,
  agenda_item_id uuid not null references public.agenda_items(id) on delete cascade,
  created_at     timestamptz not null default now(),
  primary key (vote_id, agenda_item_id)
);

create index vote_agenda_items_agenda_item_id_idx on public.vote_agenda_items (agenda_item_id);

comment on table public.vote_agenda_items is '採決と議題の対応。公開してよい候補（今は読み取りのポリシーなし）';

-- ☆ stated_stances（態度表明で本人が明言した賛否）― 内部専用
create table public.stated_stances (
  id          uuid primary key default gen_random_uuid(),
  section_id  uuid not null references public.sections(id) on delete cascade,
  speech_id   uuid references public.speeches(id) on delete cascade,
  stance_order integer not null,
  label_raw   text,
  full_name   text,
  member_id   uuid references public.members(id) on delete restrict,
  wording     text not null check (btrim(wording) <> ''),
  created_at  timestamptz not null default now(),
  constraint stated_stances_order_key unique (section_id, stance_order)
);

comment on table public.stated_stances is
  '態度表明で本人が明言した賛否（文言のまま。推測では埋めない）。内部専用（議員ごとに集め直せるため。将来も公開の読み取りは付けない）';


-- =============================================================
-- 10. 参照資料・契約の相手方・議事の言葉・乱れの候補・請願文書表
-- =============================================================

-- ☆ speech_references（参照資料）― 内部専用
create table public.speech_references (
  id           uuid primary key default gen_random_uuid(),
  speech_id    uuid not null references public.speeches(id) on delete cascade,
  section_id   uuid references public.sections(id) on delete set null,
  ref_order    integer not null,
  wording      text not null check (btrim(wording) <> ''),
  form         text,
  section_kind text,
  by_presider  boolean,
  created_at   timestamptz not null default now(),
  constraint speech_references_order_key unique (speech_id, ref_order)
);

comment on table public.speech_references is '発言の中の参照資料（「資料１」など）。内部専用（将来も公開の読み取りは付けない）';

-- ☆ contract_parties（契約の相手方）― 内部専用
-- 代表者の氏名の列は作らない（2026-10-27 先生：代表者の名前は不要＝隠す）。
create table public.contract_parties (
  id                   uuid primary key default gen_random_uuid(),
  meeting_id           uuid not null references public.meetings(id) on delete cascade,
  speech_id            uuid references public.speeches(id) on delete set null,
  party_order          integer not null,
  para                 integer,
  company              text,
  address              text,
  representative_title text,
  is_individual        boolean not null default false,
  note                 text,
  bill_nearby          text,
  section_refs         text[],
  created_at           timestamptz not null default now(),
  constraint contract_parties_order_key unique (meeting_id, party_order),
  -- 個人が契約の相手方のときは、企業名・所在地も空（住所・氏名を隠す）
  constraint contract_parties_individual_check check (not is_individual or (company is null and address is null))
);

comment on table public.contract_parties is
  '契約の相手方（企業名・所在地・代表者の肩書）。代表者の氏名の列は作らない。個人のときは企業名・所在地も空。'
  '内部専用（将来も公開の読み取りは付けない）';

-- ☆ procedural_markers（議事の言葉の印）― 内部専用
create table public.procedural_markers (
  id           uuid primary key default gen_random_uuid(),
  meeting_id   uuid not null references public.meetings(id) on delete cascade,
  speech_id    uuid references public.speeches(id) on delete cascade,
  section_id   uuid references public.sections(id) on delete set null,
  marker_order integer not null,
  sentence_index integer,
  kind         text not null check (btrim(kind) <> ''),
  wording      text not null,
  refs         text[],
  opens        boolean,
  agenda_item_id uuid references public.agenda_items(id) on delete set null,
  created_at   timestamptz not null default now(),
  constraint procedural_markers_order_key unique (meeting_id, marker_order)
);

create index procedural_markers_speech_id_idx on public.procedural_markers (speech_id);

comment on table public.procedural_markers is '議事の言葉の印（採決・選挙・人事・日程・提案説明など。文言そのまま）。内部専用（将来も公開の読み取りは付けない）';

-- ☆ disorder_candidates（議事が乱れた場面の候補）― 内部専用（2026-10-26 先生。評価は付けない）
create table public.disorder_candidates (
  id             uuid primary key default gen_random_uuid(),
  meeting_id     uuid not null references public.meetings(id) on delete cascade,
  cand_order     integer not null,
  where_found    text not null check (where_found in ('ト書き', '発言')),
  para           integer,
  after_speech_id uuid references public.speeches(id) on delete set null,
  speech_id      uuid references public.speeches(id) on delete set null,
  sentence_index integer,
  label_raw      text,
  by_presider    boolean,
  wording        text not null,
  word           text not null,
  signals        text[],
  category       text not null check (category in ('ふつうの使われ方', '乱れた場面の候補')),
  retract        text,
  caution        boolean,
  created_at     timestamptz not null default now(),
  constraint disorder_candidates_order_key unique (meeting_id, cand_order)
);

comment on table public.disorder_candidates is
  '議事が乱れた場面の候補（文言のまま。評価は付けない）。内部専用（評価に見えるため。将来も公開の読み取りは付けない）';

-- ☆ petition_documents（請願文書表）― 内部専用
-- 請願者・陳情者の欄（住所・氏名）の列は作らない（請願・陳情は第1段階では扱わない＝引き継ぎ書 3-5）。
create table public.petition_documents (
  id                  uuid primary key default gen_random_uuid(),
  meeting_id          uuid not null references public.meetings(id) on delete cascade,
  doc_order           integer not null,
  kind                text not null,
  para_start          integer,
  para_end            integer,
  received            text,
  title               text,
  introducing_members text,
  summary             text,
  referred_committee  text,
  reason              text,
  requested_items     text,
  -- 上の欄に当てはまらない見出し（請願理由の中の小見出しなど）。請願者・陳情者の欄は入れない
  extra_fields        jsonb not null default '{}'::jsonb,
  created_at          timestamptz not null default now(),
  constraint petition_documents_order_key unique (meeting_id, doc_order),
  constraint petition_documents_no_petitioner check (
    jsonb_typeof(extra_fields) = 'object'
    and not (extra_fields ?| array['請願者', '陳情者'])
  )
);

comment on table public.petition_documents is
  '請願文書表（受理年月日と番号・件名・紹介議員・要旨・付託委員会・理由・事項）。請願者・陳情者の欄の列は作らない。'
  '内部専用（将来も公開の読み取りは付けない）';
comment on column public.petition_documents.reason is '請願理由（陳情理由）。個人名は無いが請願者が書いた文章（設計案⑧：内部専用で保存）';


-- =============================================================
-- 11. 速報版→正式版の発言の対応
-- =============================================================

-- ◇ speech_key_map ― 内部専用
create table public.speech_key_map (
  id             uuid primary key default gen_random_uuid(),
  old_speech_key text not null,
  new_speech_id  uuid references public.speeches(id) on delete set null,
  match_how      text not null check (match_how in ('key', 'text_similarity', 'manual')),
  result         text not null check (result in ('same', 'text_changed', 'removed', 'added')),
  checked_by     text,
  checked_on     date,
  created_at     timestamptz not null default now()
);

create index speech_key_map_old_key_idx on public.speech_key_map (old_speech_key);

comment on table public.speech_key_map is
  '速報版→正式版の発言の対応（鍵が一致／本文の近さ／手作業）。内部専用（将来も公開の読み取りは付けない）';


-- =============================================================
-- 12a. 管理画面の「一般質問の検索」の関数を、本会議の一般質問だけに絞る
-- =============================================================
-- 委員会の全文を入れると、委員会の一般質問の区切り（kind = general_question）も検索の対象になり、
-- 「区切りの最初の議員の発言＝質問者」の作りでは正しく出ない（設計案 6-1）。
-- 委員会の分は、項目（general_question_items）を単位にした別の関数をあとで作る（設計案⑨④）。
-- 今の97件（本会議）だけが入っている今は、結果は1件も変わらない（絞り込みの選択肢も同じ）。
-- 変えたのは「m.kind = 'plenary'」の条件と、選択肢を本会議の一般質問の区切りの中から集める部分だけ。

create or replace function public.search_general_question_passages(
  p_terms              text[]  default '{}',
  p_council_session_id uuid    default null,
  p_member_id          uuid    default null,
  p_faction_name       text    default null,
  p_answerer_role      text    default null,
  p_limit              integer default 200
)
returns table (
  passage_kind       text,
  section_id         uuid,
  meeting_date       date,
  session_name       text,
  questioner_name    text,
  questioner_faction text,
  faction_source     text,
  speech_id          uuid,
  speech_order       integer,
  speaker_kind       text,
  speaker_name       text,
  speaker_role       text,
  chapter_title      text,
  topic_title        text,
  snippet            text,
  snippet_has_before boolean,
  snippet_has_after  boolean,
  passage_length     integer,
  total_passages     bigint,
  total_sections     bigint
)
language sql
stable
set search_path = ''
as $$
  with terms as (
    select lower(t) as term
      from unnest(coalesce(p_terms, '{}')) as t
     where btrim(t) <> ''
  ),
  -- 区切り（質問者1人分）と、その質問者・発言時点の会派。本会議の一般質問だけ
  sec as (
    select s.id as section_id,
           s.section_order,
           m.meeting_date,
           m.session_name,
           q.speaker_name_raw as questioner_name,
           sf.faction_name as questioner_faction,
           sf.faction_source
      from public.sections s
      join public.meetings m on m.id = s.meeting_id
      join lateral (
        select sp.id, sp.member_id, sp.speaker_name_raw
          from public.speeches sp
         where sp.section_id = s.id
           and sp.speaker_kind = 'member'
         order by sp.speech_order
         limit 1
      ) q on true
      left join public.speech_factions sf on sf.speech_id = q.id
     where s.kind = 'general_question'
       and m.kind = 'plenary'
       and (p_council_session_id is null or m.council_session_id = p_council_session_id)
       and (p_member_id is null or q.member_id = p_member_id)
       and (p_faction_name is null or sf.faction_name = p_faction_name)
  ),
  passages as (
    -- 答弁の中の論点
    select 'topic'::text as passage_kind,
           sec.section_id, sec.section_order, sec.meeting_date, sec.session_name,
           sec.questioner_name, sec.questioner_faction, sec.faction_source,
           sp.id as speech_id, sp.speech_order, sp.speaker_kind,
           sp.speaker_name_raw as speaker_name, sp.speaker_role_raw as speaker_role,
           ch.title as chapter_title, n.title as topic_title,
           case
             when ts.char_start is null then sp.body
             else substr(sp.body, ts.char_start + 1, ts.char_end - ts.char_start)
           end as passage_text,
           coalesce(ts.char_start, 0) as char_start
      from sec
      join public.topic_nodes n on n.section_id = sec.section_id and n.level = 'topic'
      left join public.topic_nodes ch on ch.id = n.parent_id
      join public.topic_speeches ts on ts.topic_node_id = n.id
      join public.speeches sp on sp.id = ts.speech_id
    union all
    -- 論点に結び付いていない発言（質問・再質問など）
    select 'speech'::text,
           sec.section_id, sec.section_order, sec.meeting_date, sec.session_name,
           sec.questioner_name, sec.questioner_faction, sec.faction_source,
           sp.id, sp.speech_order, sp.speaker_kind,
           sp.speaker_name_raw, sp.speaker_role_raw,
           null, null,
           sp.body,
           0
      from sec
      join public.speeches sp on sp.section_id = sec.section_id
     where not exists (
       select 1 from public.topic_speeches ts where ts.speech_id = sp.id
     )
  ),
  hits as (
    select p.*,
           -- 本文の中で、最初にキーワードが出てくる位置（見出しだけに当たった場合は NULL）
           (select min(strpos(lower(p.passage_text), t.term))
              from terms t
             where strpos(lower(p.passage_text), t.term) > 0) as first_pos
      from passages p
     where (p_answerer_role is null
            or (p.speaker_kind = 'executive' and p.speaker_role = p_answerer_role))
       -- すべてのキーワードが、見出しか本文のどこかに含まれている
       and not exists (
         select 1
           from terms t
          where strpos(
                  lower(coalesce(p.chapter_title, '') || ' ' || coalesce(p.topic_title, '')
                        || ' ' || p.passage_text),
                  t.term
                ) = 0
       )
  )
  select h.passage_kind, h.section_id, h.meeting_date, h.session_name,
         h.questioner_name, h.questioner_faction, h.faction_source,
         h.speech_id, h.speech_order, h.speaker_kind, h.speaker_name, h.speaker_role,
         h.chapter_title, h.topic_title,
         -- 該当箇所の前後（前40字・全体160字）
         substr(h.passage_text, greatest(coalesce(h.first_pos, 1) - 40, 1), 160) as snippet,
         coalesce(h.first_pos, 1) - 40 > 1 as snippet_has_before,
         greatest(coalesce(h.first_pos, 1) - 40, 1) + 160 <= length(h.passage_text) as snippet_has_after,
         length(h.passage_text) as passage_length,
         count(*) over () as total_passages,
         (select count(distinct h2.section_id) from hits h2) as total_sections
    from hits h
   order by h.meeting_date desc, h.section_order, h.speech_order, h.char_start
   limit greatest(coalesce(p_limit, 200), 1);
$$;

comment on function public.search_general_question_passages is
  '本会議の一般質問の検索。キーワード（すべて含む）と絞り込み条件に合う箇所を、新しい日付順に返す。委員会の一般質問は含めない';

-- 絞り込みの選択肢も、本会議の一般質問の区切りの中から集める（委員会の発言を入れても選択肢が変わらないように）
create or replace function public.general_question_search_options()
returns jsonb
language sql
stable
set search_path = ''
as $$
  with gq_speeches as (
    select sp.id, sp.member_id, sp.speaker_kind, sp.speaker_role_raw
      from public.speeches sp
      join public.sections s on s.id = sp.section_id and s.kind = 'general_question'
      join public.meetings m on m.id = s.meeting_id and m.kind = 'plenary'
  )
  select jsonb_build_object(
    'sessions', coalesce((
      select jsonb_agg(jsonb_build_object('id', cs.id, 'name', cs.name) order by cs.start_date desc)
        from public.council_sessions cs
       where exists (
         select 1
           from public.meetings m
           join public.sections s on s.meeting_id = m.id and s.kind = 'general_question'
          where m.council_session_id = cs.id and m.kind = 'plenary'
       )
    ), '[]'::jsonb),
    'members', coalesce((
      select jsonb_agg(jsonb_build_object('id', x.id, 'name', x.name) order by x.name)
        from (
          select distinct mb.id, mb.name
            from public.members mb
            join gq_speeches sp on sp.member_id = mb.id and sp.speaker_kind = 'member'
        ) x
    ), '[]'::jsonb),
    'factions', coalesce((
      select jsonb_agg(x.faction_name order by x.faction_name)
        from (
          select distinct sf.faction_name
            from public.speech_factions sf
            join gq_speeches sp on sp.id = sf.speech_id
           where sf.faction_name is not null
        ) x
    ), '[]'::jsonb),
    'answerer_roles', coalesce((
      select jsonb_agg(x.role order by x.n desc, x.role)
        from (
          select sp.speaker_role_raw as role, count(*) as n
            from gq_speeches sp
           where sp.speaker_kind = 'executive'
             and sp.speaker_role_raw is not null
           group by sp.speaker_role_raw
        ) x
    ), '[]'::jsonb)
  );
$$;

comment on function public.general_question_search_options is
  '本会議の一般質問の検索の絞り込み選択肢（定例会・質問者・会派・答弁者）';

-- CREATE OR REPLACE でも権限は残るが、念のため同じ締め方をもう一度書く
revoke execute on function public.search_general_question_passages(text[], uuid, uuid, text, text, integer)
  from public, anon, authenticated;
revoke execute on function public.general_question_search_options()
  from public, anon, authenticated;
grant execute on function public.search_general_question_passages(text[], uuid, uuid, text, text, integer)
  to service_role;
grant execute on function public.general_question_search_options()
  to service_role;


-- =============================================================
-- 12. 更新日時・RLS・権限
-- =============================================================

create trigger update_meeting_bodies_updated_at
  before update on public.meeting_bodies
  for each row execute function update_updated_at_column();

create trigger update_officials_updated_at
  before update on public.officials
  for each row execute function update_updated_at_column();

-- ポリシーは作らないので、すべてのアクセスは既定で拒否される（service_role だけが読み書きできる）。
-- さらに anon / authenticated の権限そのものを取り上げる（RLS の付け忘れに備えた二重の守り）。
do $$
declare
  t text;
  new_tables text[] := array[
    -- 公開してよい候補（今は読み取りのポリシーなし。公開するときは先生の判断のあと、別のマイグレーションで）
    'meeting_bodies', 'section_kinds', 'meeting_times', 'agenda_items', 'section_agenda_items',
    'votes', 'vote_agenda_items',
    -- 内部専用（設計案 3-2。将来も公開の読み取りは付けない）
    'ingest_runs', 'source_files', 'officials', 'official_aliases', 'official_posts', 'member_terms',
    'meeting_attendance', 'general_question_ranges', 'general_question_items',
    'general_question_item_speeches', 'minutes_paragraphs', 'section_budget_scopes',
    'stated_stances', 'speech_references', 'contract_parties', 'procedural_markers',
    'disorder_candidates', 'petition_documents', 'speech_key_map'
  ];
begin
  if array_length(new_tables, 1) <> 26 then
    raise exception '新しい表の数が26ではありません: %', array_length(new_tables, 1);
  end if;
  foreach t in array new_tables loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
  end loop;
end;
$$;


-- =============================================================
-- 13. 最後の確かめ（ここで止まれば、このマイグレーションは何も残さない）
-- =============================================================
do $$
declare
  v_names text;
begin
  -- public の表で RLS が無効なものが0件
  select string_agg(c.relname, ', ' order by c.relname) into v_names
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relkind in ('r', 'p') and not c.relrowsecurity;
  if v_names is not null then
    raise exception 'RLS が無効な public の表があります: %', v_names;
  end if;

  -- 新しい表に anon / authenticated の権限が残っていない
  select string_agg(distinct g.table_name || '(' || g.grantee || ')', ', ') into v_names
    from information_schema.role_table_grants g
   where g.table_schema = 'public'
     and g.grantee in ('anon', 'authenticated')
     and g.table_name in (
       'meeting_bodies', 'section_kinds', 'meeting_times', 'agenda_items', 'section_agenda_items',
       'votes', 'vote_agenda_items', 'ingest_runs', 'source_files', 'officials', 'official_aliases',
       'official_posts', 'member_terms', 'meeting_attendance', 'general_question_ranges',
       'general_question_items', 'general_question_item_speeches', 'minutes_paragraphs',
       'section_budget_scopes', 'stated_stances', 'speech_references', 'contract_parties',
       'procedural_markers', 'disorder_candidates', 'petition_documents', 'speech_key_map',
       'sections_analysis');
  if v_names is not null then
    raise exception 'anon / authenticated の権限が残っています: %', v_names;
  end if;

  -- 隠すと決めた個人情報の列を作っていない（代表者の氏名・請願者の欄）
  select string_agg(c.table_name || '.' || c.column_name, ', ') into v_names
    from information_schema.columns c
   where c.table_schema = 'public'
     and (c.column_name ilike '%representative_name%'
          or c.column_name ilike '%petitioner%'
          or c.column_name in ('請願者', '陳情者'));
  if v_names is not null then
    raise exception '隠すと決めた個人情報の列があります: %', v_names;
  end if;
end;
$$;
