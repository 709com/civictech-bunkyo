-- =============================================================
-- 管理画面の検索を、委員会の会議録にも広げる関数（2026-10-28）
-- =============================================================
-- 表もデータも変えない。管理画面（admin）用の関数を2つ足すだけ。
--
-- ・今ある本会議の検索の関数（search_general_question_passages・general_question_search_options）には
--   手を付けない。委員会は、この別の関数で探す。
-- ・探す範囲は委員会の会議（meetings.kind = 'committee'）の発言の本文だけ。
--   単位は「発言」1つ。委員会の一般質問の項目（general_question_items）に結び付いた発言なら、
--   その項目名と、項目名の出どころ（title_source）を一緒に返す。
-- ・キーワードは文字そのものの部分一致（今の検索と同じ strpos）。複数のキーワードは「すべて含む」。
--   委員会の本文は全角の英数字のまま入っている（ＩＣＴ など）ので、
--   キーワードの半角の英数字を全角にした形でも探す（どちらかに当たれば当たり）。
-- ・本文はそのまま返す。非公開にした部分は「［非公開：…］」の置き換えのまま。
-- ・内部用の表（乱れの候補・請願文書表・名簿の原文など）は読まない。
-- ・管理画面のサーバー側（service_role）からだけ呼べるようにする。anon・authenticated には許さない。

-- 半角の英数字を全角に直す（キーワードの全角の形を作る用）
create function public.to_fullwidth_alnum(p_text text)
returns text
language sql
immutable
set search_path = ''
as $$
  select translate(
    p_text,
    'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789%',
    'ａｂｃｄｅｆｇｈｉｊｋｌｍｎｏｐｑｒｓｔｕｖｗｘｙｚＡＢＣＤＥＦＧＨＩＪＫＬＭＮＯＰＱＲＳＴＵＶＷＸＹＺ０１２３４５６７８９％'
  );
$$;

comment on function public.to_fullwidth_alnum(text) is
  '半角の英数字と % を全角にする（委員会の本文は全角のまま入っているため、キーワードの全角の形を作る用）';

create function public.search_committee_minutes(
  p_terms           text[]  default '{}',
  p_meeting_body_id uuid    default null,
  p_gq_only         boolean default false,
  p_member_id       uuid    default null,
  p_limit           integer default 200
)
returns table (
  speech_id          uuid,
  meeting_id         uuid,
  meeting_date       date,
  body_name          text,
  section_kind       text,
  speech_order       integer,
  speaker_kind       text,
  speaker_detail     text,
  speaker_name       text,
  speaker_role       text,
  item_no            integer,
  item_title         text,
  item_title_source  text,
  item_questioner    text,
  snippet            text,
  snippet_has_before boolean,
  snippet_has_after  boolean,
  passage_length     integer,
  total_passages     bigint,
  total_meetings     bigint
)
language sql
stable
set search_path = ''
as $$
  with terms as (
    select lower(t) as term,
           lower(public.to_fullwidth_alnum(t)) as term_fw
      from unnest(coalesce(p_terms, '{}')) as t
     where btrim(t) <> ''
  ),
  hits as (
    select sp.id as speech_id, m.id as meeting_id, m.meeting_date,
           coalesce(mb.name, m.committee_name) as body_name,
           sec.kind_detail as section_kind,
           sp.speech_order, sp.speaker_kind, sp.speaker_detail,
           sp.speaker_name_raw as speaker_name, sp.speaker_role_raw as speaker_role,
           sp.body,
           -- 本文の中で、最初にキーワードが出てくる位置
           (select min(p)
              from terms t
             cross join lateral (values
               (nullif(strpos(lower(sp.body), t.term), 0)),
               (nullif(strpos(lower(sp.body), t.term_fw), 0))
             ) as v(p)) as first_pos
      from public.speeches sp
      join public.meetings m on m.id = sp.meeting_id and m.kind = 'committee'
      left join public.meeting_bodies mb on mb.id = m.meeting_body_id
      left join public.sections sec on sec.id = sp.section_id
     where (p_meeting_body_id is null or m.meeting_body_id = p_meeting_body_id)
       and (not coalesce(p_gq_only, false) or sec.kind_detail = '一般質問')
       and (p_member_id is null or sp.member_id = p_member_id)
       and sp.status = 'normal'
       -- すべてのキーワードが本文のどこかに含まれている（半角・全角のどちらかで）
       and not exists (
         select 1
           from terms t
          where strpos(lower(sp.body), t.term) = 0
            and strpos(lower(sp.body), t.term_fw) = 0
       )
  )
  select h.speech_id, h.meeting_id, h.meeting_date, h.body_name, h.section_kind,
         h.speech_order, h.speaker_kind, h.speaker_detail, h.speaker_name, h.speaker_role,
         it.item_no, it.title, it.title_source, it.questioner_full_name,
         -- 該当箇所の前後（前40字・全体160字）
         substr(h.body, greatest(coalesce(h.first_pos, 1) - 40, 1), 160) as snippet,
         coalesce(h.first_pos, 1) - 40 > 1 as snippet_has_before,
         greatest(coalesce(h.first_pos, 1) - 40, 1) + 160 <= length(h.body) as snippet_has_after,
         length(h.body) as passage_length,
         count(*) over () as total_passages,
         (select count(distinct h2.meeting_id) from hits h2) as total_meetings
    from hits h
    left join lateral (
      select i.item_no, i.title, i.title_source, i.questioner_full_name
        from public.general_question_item_speeches gis
        join public.general_question_items i on i.id = gis.item_id
       where gis.speech_id = h.speech_id
       order by i.item_no
       limit 1
    ) it on true
   order by h.meeting_date desc, h.body_name, h.speech_order
   limit greatest(coalesce(p_limit, 200), 1);
$$;

comment on function public.search_committee_minutes is
  '委員会の会議録の検索（管理画面用）。キーワード（すべて含む）と条件に合う発言を、新しい日付順に返す';

-- 絞り込みの選択肢（委員会名・発言した議員）を、実際にデータがあるものだけ返す
create function public.committee_minutes_search_options()
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'bodies', coalesce((
      select jsonb_agg(jsonb_build_object('id', x.id, 'name', x.name) order by x.sort_type, x.name)
        from (
          select distinct mb.id, mb.name,
                 case mb.body_type
                   when '常任委員会' then 1 when '議会運営委員会' then 2
                   when '特別委員会（調査など）' then 3 when '予算審査特別委員会' then 4
                   when '決算審査特別委員会' then 5 else 6 end as sort_type
            from public.meeting_bodies mb
            join public.meetings m on m.meeting_body_id = mb.id and m.kind = 'committee'
        ) x
    ), '[]'::jsonb),
    'members', coalesce((
      select jsonb_agg(jsonb_build_object('id', x.id, 'name', x.name) order by x.name)
        from (
          select distinct mb.id, mb.name
            from public.members mb
            join public.speeches sp on sp.member_id = mb.id and sp.speaker_kind = 'member'
            join public.meetings m on m.id = sp.meeting_id and m.kind = 'committee'
        ) x
    ), '[]'::jsonb)
  );
$$;

comment on function public.committee_minutes_search_options is
  '委員会の会議録の検索の絞り込み選択肢（委員会名・発言した議員）。管理画面用';

-- 管理画面のサーバー側（service_role）からだけ呼べるようにする
revoke execute on function public.to_fullwidth_alnum(text) from public, anon, authenticated;
revoke execute on function public.search_committee_minutes(text[], uuid, boolean, uuid, integer)
  from public, anon, authenticated;
revoke execute on function public.committee_minutes_search_options() from public, anon, authenticated;
grant execute on function public.to_fullwidth_alnum(text) to service_role;
grant execute on function public.search_committee_minutes(text[], uuid, boolean, uuid, integer) to service_role;
grant execute on function public.committee_minutes_search_options() to service_role;
