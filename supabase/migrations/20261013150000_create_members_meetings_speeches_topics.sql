-- =============================================================
-- 文京区版：議員マスタ／会派の履歴／1発言1行の層／論点の階層
-- =============================================================
-- このファイルは「表の形」だけを作る。データは1行も入れない。
-- （届出に基づく会派の履歴データは、次のファイル 20261013150100 に分けてある）
--
-- 作るもの
--   1. members / member_aliases          … 議員マスタと表記ゆれ
--   2. member_faction_history            … 会派の履歴（同じ議員の期間の重なりを禁止）
--   3. meetings / sections / speeches    … 会議 → 区切り → 発言（1発言1行）
--   4. topic_nodes / topic_speeches      … 章・論点の2階層と、発言との結び付け
--   5. general_questions への列追加      … 速報版／正式版などの印と、正本への結び付け
--
-- 方針
--   ・今後は speeches（発言の層）を正本とし、general_questions は画面表示用の写しとする。
--   ・既存の表（council_members, factions, general_questions など）は削除も改名もしない。
--   ・新しい表はすべて RLS を有効にし、ポリシーは作らない
--     （既存の表と同じく、サーバー側の Service Role Key からのみ読み書きできる）。

-- 「同じ議員の期間が重ならない」を表の決まりとして書くために必要な拡張機能
create extension if not exists btree_gist with schema extensions;


-- =============================================================
-- 1. 議員マスタ
-- =============================================================

create table public.members (
  id                uuid primary key default gen_random_uuid(),
  name              text not null check (btrim(name) <> ''),
  yomi              text,
  is_current        boolean not null default true,
  -- 既存の画面が使っている council_members との結び付け（1対1）。
  -- 結び付けてある議員だけ、会派の履歴から council_members.faction_id が自動で埋まる。
  council_member_id uuid unique references public.council_members(id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

comment on table public.members is '議員マスタ（1人1行）';
comment on column public.members.name is '正式名';
comment on column public.members.yomi is '読み（ひらがな）。分からない間は空';
comment on column public.members.is_current is '現職か';
comment on column public.members.council_member_id is '既存の council_members の行との結び付け（任意・1対1）';

-- 表記を比べるときの「そろえ方」。全角英数字を半角にし、空白をすべて取り除く。
-- 例：姓と名の間に空白がある表記と無い表記を、同じものとして扱う。
create function public.member_alias_key(p_text text)
returns text
language sql
immutable
set search_path = ''
as $$
  select regexp_replace(normalize(p_text, NFKC), '\s+', '', 'g');
$$;

create table public.member_aliases (
  id         uuid primary key default gen_random_uuid(),
  member_id  uuid not null references public.members(id) on delete cascade,
  alias      text not null check (btrim(alias) <> ''),
  alias_key  text generated always as (public.member_alias_key(alias)) stored,
  created_at timestamptz not null default now(),
  -- 同じ表記を2人に付けない（空白の有無だけが違う表記も同じとみなす）
  constraint member_aliases_alias_key_unique unique (alias_key)
);

create index member_aliases_member_id_idx on public.member_aliases (member_id);

comment on table public.member_aliases is '議員名の表記ゆれ。会議録に出てくる表記を1人の議員に結ぶ';
comment on column public.member_aliases.alias is '会議録などに出てくる表記（ひらがな表記・漢字表記など）';
comment on column public.member_aliases.alias_key is '比較用にそろえた表記（自動計算）。これが重複しないことで「同じ表記を2人に付けない」を守る';

-- 表記から議員を探す。見つからなければ NULL を返す。
-- 取り込みはこの関数を使い、NULL のときは新しい議員を作らず「未確認」のまま保存する。
create function public.find_member_id(p_notation text)
returns uuid
language sql
stable
set search_path = ''
as $$
  select a.member_id
    from public.member_aliases a
   where a.alias_key = public.member_alias_key(p_notation);
$$;


-- =============================================================
-- 2. 会派の履歴
-- =============================================================

create table public.member_faction_history (
  id         uuid primary key default gen_random_uuid(),
  member_id  uuid not null references public.members(id) on delete restrict,
  faction_id uuid not null references public.factions(id) on delete restrict,
  -- 両端とも「その日を含む」。NULL は「制限なし」（開始が不明／現在も継続）。
  start_date date,
  end_date   date,
  basis      text not null check (btrim(basis) <> ''),
  note       text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint member_faction_history_dates_check
    check (start_date is null or end_date is null or start_date <= end_date),
  -- 同じ議員の期間が1日でも重なる行は入れられない
  constraint member_faction_history_no_overlap
    exclude using gist (
      member_id with =,
      daterange(start_date, end_date, '[]') with &&
    )
);

create index member_faction_history_faction_id_idx on public.member_faction_history (faction_id);

comment on table public.member_faction_history is '会派の履歴。議員がいつからいつまでどの会派にいたか';
comment on column public.member_faction_history.start_date is '開始日（その日を含む）。NULL は制限なし';
comment on column public.member_faction_history.end_date is '終了日（その日を含む）。NULL は制限なし';
comment on column public.member_faction_history.basis is '根拠（例：区議会への届出）';
comment on column public.member_faction_history.note is '補足';

-- 発言日から会派を引く。該当する期間が無ければ NULL を返す。
-- NULL のときは、発言時の本人の名乗り（speeches.stated_faction）をそのまま使う。
create function public.member_faction_id_on(p_member_id uuid, p_date date)
returns uuid
language sql
stable
set search_path = ''
as $$
  select h.faction_id
    from public.member_faction_history h
   where h.member_id = p_member_id
     and daterange(h.start_date, h.end_date, '[]') @> p_date;
$$;

-- council_members.faction_id（既存の会派列）を、履歴表の「今日時点の会派」で埋める。
-- 今日を含む期間が履歴に無い議員は、何も書き換えない。
create function public.refresh_council_member_faction(p_member_id uuid)
returns void
language plpgsql
set search_path = ''
as $$
begin
  update public.council_members cm
     set faction_id = h.faction_id
    from public.members m
    join public.member_faction_history h
      on h.member_id = m.id
     and daterange(h.start_date, h.end_date, '[]') @> current_date
   where m.id = p_member_id
     and cm.id = m.council_member_id
     and cm.faction_id is distinct from h.faction_id;
end;
$$;

-- 全員分をまとめて埋め直す（日付が進んで期間が切り替わったときに手動で呼ぶ用）
create function public.refresh_all_council_member_factions()
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_member_id uuid;
begin
  for v_member_id in
    select m.id from public.members m where m.council_member_id is not null
  loop
    perform public.refresh_council_member_faction(v_member_id);
  end loop;
end;
$$;

create function public.member_faction_history_sync_council_member()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op in ('INSERT', 'UPDATE') then
    perform public.refresh_council_member_faction(new.member_id);
  end if;
  if tg_op in ('UPDATE', 'DELETE') then
    perform public.refresh_council_member_faction(old.member_id);
  end if;
  return null;
end;
$$;

create trigger member_faction_history_sync_council_member
  after insert or update or delete on public.member_faction_history
  for each row execute function public.member_faction_history_sync_council_member();

create function public.members_sync_council_member()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  perform public.refresh_council_member_faction(new.id);
  return null;
end;
$$;

create trigger members_sync_council_member
  after insert or update of council_member_id on public.members
  for each row execute function public.members_sync_council_member();


-- =============================================================
-- 3. 1発言1行の共通の層（会議 → 区切り → 発言）
-- =============================================================

create table public.meetings (
  id                 uuid primary key default gen_random_uuid(),
  kind               text not null check (kind in ('plenary', 'committee')),
  committee_name     text,
  meeting_date       date not null,
  session_name       text,
  day_label          text,
  council_session_id uuid references public.council_sessions(id) on delete set null,
  source_type        text not null check (source_type in ('seishiki', 'sokuhou')),
  source_file        text not null check (btrim(source_file) <> ''),
  source_url         text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  -- 同じ元ファイルを二重に取り込まない
  constraint meetings_source_file_key unique (source_file),
  -- 委員会なら委員会名が必須、本会議なら委員会名は空
  constraint meetings_committee_name_check
    check ((kind = 'committee') = (committee_name is not null))
);

create index meetings_meeting_date_idx on public.meetings (meeting_date);
create index meetings_council_session_id_idx on public.meetings (council_session_id);

comment on table public.meetings is '会議1回分（本会議の1日、または委員会の1回）';
comment on column public.meetings.kind is '種類。plenary＝本会議／committee＝委員会';
comment on column public.meetings.committee_name is '委員会名（委員会のときだけ）';
comment on column public.meetings.meeting_date is '開催日';
comment on column public.meetings.session_name is '定例会名（例：令和8年2月定例議会）';
comment on column public.meetings.day_label is '何日目か（例：2日目）。元ファイル名から取る';
comment on column public.meetings.council_session_id is '既存の council_sessions（会期）との結び付け（任意）';
comment on column public.meetings.source_type is 'seishiki＝正式版／sokuhou＝速報版';
comment on column public.meetings.source_file is '元ファイル名';
comment on column public.meetings.source_url is '原典のURL（任意）';

create table public.sections (
  id            uuid primary key default gen_random_uuid(),
  meeting_id    uuid not null references public.meetings(id) on delete cascade,
  section_order integer not null,
  kind          text not null check (kind in ('general_question', 'report_qa', 'other')),
  title         text,
  -- 「その他」（委員会記録について 等）は保存するが、分析対象外。種類から自動で決まる。
  excluded_from_analysis boolean generated always as (kind = 'other') stored,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint sections_meeting_order_key unique (meeting_id, section_order),
  -- speeches から「同じ会議の区切りであること」を保証するための組
  constraint sections_id_meeting_key unique (id, meeting_id)
);

comment on table public.sections is
  '会議の中の区切り。'
  '本会議の一般質問は、質問者1人分（質問・答弁・再質問）を1区切りとする。'
  '委員会の一般質問は「続いて一般質問に入ります」から「以上で一般質問を終わります」までを1区切りとする。'
  '報告事項の質疑（report_qa）は枠だけ用意し、始まりと終わりの合図は後日決める。';
comment on column public.sections.kind is '種類。general_question＝一般質問／report_qa＝報告事項の質疑／other＝その他';
comment on column public.sections.title is '区切りの見出し（任意。例：委員会記録について）';
comment on column public.sections.excluded_from_analysis is '分析対象外の印。kind が other のとき自動で true';

create table public.speeches (
  id               uuid primary key default gen_random_uuid(),
  meeting_id       uuid not null references public.meetings(id) on delete cascade,
  section_id       uuid,
  speech_order     integer not null,
  speaker_kind     text not null check (speaker_kind in ('member', 'executive', 'chair', 'other')),
  member_id        uuid references public.members(id) on delete restrict,
  speaker_name_raw text not null,
  speaker_role_raw text,
  stated_faction   text,
  body             text not null,
  -- 議員の発言なのに、表記が議員マスタで見つからなかった行の印（自動計算）
  member_unconfirmed boolean generated always as (speaker_kind = 'member' and member_id is null) stored,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint speeches_meeting_order_key unique (meeting_id, speech_order),
  -- 区切りは必ず同じ会議のもの
  constraint speeches_section_fkey
    foreign key (section_id, meeting_id)
    references public.sections (id, meeting_id) on delete cascade,
  -- 議員IDを付けられるのは、議員か議長・委員長の発言だけ
  constraint speeches_member_kind_check
    check (member_id is null or speaker_kind in ('member', 'chair'))
);

create index speeches_section_id_idx on public.speeches (section_id, speech_order);
create index speeches_member_id_idx on public.speeches (member_id);
create index speeches_member_unconfirmed_idx on public.speeches (meeting_id) where member_unconfirmed;

comment on table public.speeches is '発言（1発言1行）。これが正本';
comment on column public.speeches.speech_order is '会議の中での発言の順番';
comment on column public.speeches.speaker_kind is '発言者の区分。member＝議員／executive＝区長・部長など答弁者／chair＝議長・委員長／other＝その他';
comment on column public.speeches.member_id is '議員ID。表記が議員マスタで見つからない場合は空のまま（新しい議員を勝手に作らない）';
comment on column public.speeches.speaker_name_raw is '原文の表記（会議録に書かれていた名前そのまま）';
comment on column public.speeches.speaker_role_raw is '原文の役職の表記（答弁者のとき。例：区長）';
comment on column public.speeches.stated_faction is '発言時の本人の名乗りから読み取った会派名。会派の履歴に該当期間が無いときに使う';
comment on column public.speeches.body is '本文';
comment on column public.speeches.member_unconfirmed is '「未確認」の印。議員の発言で、議員IDが空のとき自動で true';

-- 発言ごとの会派。履歴に該当期間があればそれを使い、無ければ本人の名乗りを使う。
create view public.speech_factions
with (security_invoker = true)
as
select
  s.id             as speech_id,
  s.member_id,
  m.meeting_date,
  s.stated_faction,
  h.faction_id     as history_faction_id,
  coalesce(f.name, s.stated_faction) as faction_name,
  case
    when f.id is not null then 'history'
    when s.stated_faction is not null then 'stated'
    else 'unknown'
  end              as faction_source
from public.speeches s
join public.meetings m on m.id = s.meeting_id
left join public.member_faction_history h
       on h.member_id = s.member_id
      and daterange(h.start_date, h.end_date, '[]') @> m.meeting_date
left join public.factions f on f.id = h.faction_id
where s.speaker_kind = 'member';

comment on view public.speech_factions is
  '議員の発言ごとの会派。faction_source は history＝会派の履歴から／stated＝本人の名乗り／unknown＝不明';


-- =============================================================
-- 4. 論点の階層（章 → 論点 の2階層）
-- =============================================================
-- ・あいさつだけの部分（各質問の冒頭）は保存しない。
-- ・大見出しの宣言は「章」（chapter）として保持する。章そのものは発言と結び付けない。
-- ・発言と結び付くのは「論点」（topic）だけ。

create table public.topic_nodes (
  id         uuid primary key default gen_random_uuid(),
  section_id uuid not null references public.sections(id) on delete cascade,
  parent_id  uuid references public.topic_nodes(id) on delete cascade,
  level      text not null check (level in ('chapter', 'topic')),
  node_order integer not null,
  title      text not null check (btrim(title) <> ''),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- 章は親を持たない（論点は、章の下に置くか、章なしで区切りの直下に置く）
  constraint topic_nodes_chapter_has_no_parent check (level = 'topic' or parent_id is null),
  constraint topic_nodes_order_key unique nulls not distinct (section_id, parent_id, node_order)
);

create index topic_nodes_parent_id_idx on public.topic_nodes (parent_id);

comment on table public.topic_nodes is '論点の階層。章（chapter）と論点（topic）の2階層';
comment on column public.topic_nodes.section_id is 'どの区切りの中の章・論点か';
comment on column public.topic_nodes.parent_id is '論点が属する章。章自身と、章を持たない論点は空';
comment on column public.topic_nodes.level is 'chapter＝章（大見出し）／topic＝論点';
comment on column public.topic_nodes.node_order is '並び順（同じ親の中で）';
comment on column public.topic_nodes.title is '見出し（原文から抜き出したもの）';

-- 2階層までに保つ：論点の親は、同じ区切りの「章」でなければならない
create function public.topic_nodes_check_hierarchy()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_parent_level   text;
  v_parent_section uuid;
begin
  if new.parent_id is null then
    return new;
  end if;

  select p.level, p.section_id
    into v_parent_level, v_parent_section
    from public.topic_nodes p
   where p.id = new.parent_id;

  if v_parent_level is distinct from 'chapter' then
    raise exception '論点の親は章（chapter）でなければなりません（階層は2段まで）';
  end if;
  if v_parent_section is distinct from new.section_id then
    raise exception '論点と章は、同じ区切り（section）に属している必要があります';
  end if;
  return new;
end;
$$;

create trigger topic_nodes_check_hierarchy
  before insert or update on public.topic_nodes
  for each row execute function public.topic_nodes_check_hierarchy();

create table public.topic_speeches (
  id            uuid primary key default gen_random_uuid(),
  topic_node_id uuid not null references public.topic_nodes(id) on delete cascade,
  speech_id     uuid not null references public.speeches(id) on delete cascade,
  -- 発言の本文のうち、この論点に当たる範囲（先頭を0とした文字の位置。end はその直前まで）。
  -- 両方 NULL のときは「発言全体」。本文そのものは speeches.body にしか持たない。
  char_start    integer,
  char_end      integer,
  created_at    timestamptz not null default now(),
  constraint topic_speeches_range_check
    check (
      (char_start is null and char_end is null)
      or (char_start is not null and char_end is not null and char_start >= 0 and char_start < char_end)
    ),
  constraint topic_speeches_unique unique nulls not distinct (topic_node_id, speech_id, char_start)
);

create index topic_speeches_speech_id_idx on public.topic_speeches (speech_id);

comment on table public.topic_speeches is '論点と発言の結び付け';
comment on column public.topic_speeches.char_start is '発言本文の中での開始位置（先頭が0）。NULL は発言全体';
comment on column public.topic_speeches.char_end is '発言本文の中での終了位置（この位置の直前まで）。NULL は発言全体';

-- 結び付けられるのは「論点」だけ。かつ、論点と発言は同じ会議のものに限る。
create function public.topic_speeches_check_link()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_level          text;
  v_topic_meeting  uuid;
  v_speech_meeting uuid;
begin
  select n.level, sec.meeting_id
    into v_level, v_topic_meeting
    from public.topic_nodes n
    join public.sections sec on sec.id = n.section_id
   where n.id = new.topic_node_id;

  select sp.meeting_id
    into v_speech_meeting
    from public.speeches sp
   where sp.id = new.speech_id;

  if v_level is distinct from 'topic' then
    raise exception '発言と結び付けられるのは論点（topic）だけです。章（chapter）は結び付けません';
  end if;
  if v_topic_meeting is distinct from v_speech_meeting then
    raise exception '論点と発言は、同じ会議のものでなければなりません';
  end if;
  return new;
end;
$$;

create trigger topic_speeches_check_link
  before insert or update on public.topic_speeches
  for each row execute function public.topic_speeches_check_link();


-- =============================================================
-- 5. general_questions（既存・画面表示用の写し）への列追加
-- =============================================================
-- 既定値は「書き忘れても危なくない側」にしてある。
--   source_type    … 速報版を正式版と表示してしまう方が危ないので、既定は速報版
--   content_origin … AI生成を原文の抜き出しと表示してしまう方が危ないので、既定はAI生成
-- 取り込みスクリプトは、どちらも必ず明示して書き込む。

alter table public.general_questions
  add column source_type text not null default 'sokuhou'
    constraint general_questions_source_type_check
    check (source_type in ('seishiki', 'sokuhou')),
  add column review_status text not null default 'unreviewed'
    constraint general_questions_review_status_check
    check (review_status in ('unreviewed', 'reviewed')),
  add column content_origin text not null default 'ai_generated'
    constraint general_questions_content_origin_check
    check (content_origin in ('extracted', 'ai_generated')),
  add column meeting_date date,
  add column source_file text,
  -- 正本（発言の層）のどの区切りの写しか。1区切りにつき写しは1件まで。
  add column section_id uuid unique references public.sections(id) on delete set null;

create index general_questions_review_status_idx on public.general_questions (review_status);

comment on column public.general_questions.source_type is 'seishiki＝正式版／sokuhou＝速報版';
comment on column public.general_questions.review_status is 'unreviewed＝未確認／reviewed＝確認済み';
comment on column public.general_questions.content_origin is 'extracted＝原文からの抜き出し／ai_generated＝AIが生成';
comment on column public.general_questions.meeting_date is '開催日';
comment on column public.general_questions.source_file is '元ファイル名';
comment on column public.general_questions.section_id is '正本（sections）との結び付け。この行は、その区切りの画面表示用の写し';


-- =============================================================
-- 共通：更新日時の自動更新と RLS
-- =============================================================

create trigger update_members_updated_at
  before update on public.members
  for each row execute function update_updated_at_column();

create trigger update_member_faction_history_updated_at
  before update on public.member_faction_history
  for each row execute function update_updated_at_column();

create trigger update_meetings_updated_at
  before update on public.meetings
  for each row execute function update_updated_at_column();

create trigger update_sections_updated_at
  before update on public.sections
  for each row execute function update_updated_at_column();

create trigger update_speeches_updated_at
  before update on public.speeches
  for each row execute function update_updated_at_column();

create trigger update_topic_nodes_updated_at
  before update on public.topic_nodes
  for each row execute function update_updated_at_column();

-- ポリシーは作らないので、すべてのアクセスは既定で拒否される。
-- サーバー側の Service Role Key からのみ読み書きできる。
alter table public.members enable row level security;
alter table public.member_aliases enable row level security;
alter table public.member_faction_history enable row level security;
alter table public.meetings enable row level security;
alter table public.sections enable row level security;
alter table public.speeches enable row level security;
alter table public.topic_nodes enable row level security;
alter table public.topic_speeches enable row level security;
