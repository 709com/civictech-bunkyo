-- =============================================================
-- 管理画面の「一般質問の検索」用の関数
-- =============================================================
-- 表もデータも変えない。検索のための関数を2つ足すだけ。
--
-- ・検索の単位は「箇所」。
--     topic  … 答弁の中の論点1つ分（章と論点の見出し付き）
--     speech … 論点に結び付いていない発言まるごと（質問・再質問など）
-- ・キーワードは、文字そのものの部分一致で探す（単語の区切りに左右されない）。
--   複数のキーワードは「すべて含む」箇所だけを返す。
--   探す場所は、章の見出し・論点の見出し・本文。
-- ・会派は「その発言時点の会派」（speech_factions。履歴に期間があればそれ、無ければ名乗り）。
-- ・管理画面（サーバー側の Service Role Key）からだけ呼べるようにする。

create function public.search_general_question_passages(
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
  -- 区切り（質問者1人分）と、その質問者・発言時点の会派
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
  '一般質問の検索。キーワード（すべて含む）と絞り込み条件に合う箇所を、新しい日付順に返す';

-- 絞り込みの選択肢（定例会・質問者・会派・答弁者）を、実際にデータがあるものだけ返す
create function public.general_question_search_options()
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'sessions', coalesce((
      select jsonb_agg(jsonb_build_object('id', cs.id, 'name', cs.name) order by cs.start_date desc)
        from public.council_sessions cs
       where exists (select 1 from public.meetings m where m.council_session_id = cs.id)
    ), '[]'::jsonb),
    'members', coalesce((
      select jsonb_agg(jsonb_build_object('id', x.id, 'name', x.name) order by x.name)
        from (
          select distinct mb.id, mb.name
            from public.members mb
            join public.speeches sp on sp.member_id = mb.id and sp.speaker_kind = 'member'
        ) x
    ), '[]'::jsonb),
    'factions', coalesce((
      select jsonb_agg(x.faction_name order by x.faction_name)
        from (
          select distinct sf.faction_name
            from public.speech_factions sf
           where sf.faction_name is not null
        ) x
    ), '[]'::jsonb),
    'answerer_roles', coalesce((
      select jsonb_agg(x.role order by x.n desc, x.role)
        from (
          select sp.speaker_role_raw as role, count(*) as n
            from public.speeches sp
           where sp.speaker_kind = 'executive'
             and sp.speaker_role_raw is not null
           group by sp.speaker_role_raw
        ) x
    ), '[]'::jsonb)
  );
$$;

comment on function public.general_question_search_options is
  '一般質問の検索の絞り込み選択肢（定例会・質問者・会派・答弁者）';

-- 管理画面のサーバー側（Service Role Key）からだけ呼べるようにする
revoke execute on function public.search_general_question_passages(text[], uuid, uuid, text, text, integer)
  from public, anon, authenticated;
revoke execute on function public.general_question_search_options()
  from public, anon, authenticated;
grant execute on function public.search_general_question_passages(text[], uuid, uuid, text, text, integer)
  to service_role;
grant execute on function public.general_question_search_options()
  to service_role;
