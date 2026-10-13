-- =============================================================
-- 会派の履歴データを、ingest_minutes.py の FACTION_OVERRIDES から移す
-- =============================================================
-- 元データ：ingest_minutes.py の FACTION_OVERRIDES（18行・議員12人・会派9つ）。
--           区議会への届出PDFで確認した事実（2026-09-14 反映）。
-- ここに書くのは、その18行と、18行を入れるために必要な議員12人・会派9つだけ。
-- それ以外の議員・会派は入れない（説明用の例や、推測で作ったデータは含めない）。
--
-- ・議員の名前は、会議録と FACTION_OVERRIDES に出てくる表記のまま登録する。
--   読み（yomi）は確認できていないので空のままにする。
-- ・開始日／終了日の NULL は「制限なし」（元データの "" と同じ意味）。

-- 1. 会派（履歴の18行に出てくる9つ。同じ名前がすでにあれば入れない）
insert into public.factions (name, display_name, is_active)
select v.name, v.name, v.is_active
from (values
  ('文京区議会都民ファーストの会', true),
  ('区民が主役の会',               true),
  -- 2025/5/1結成・2025/8/31解散（FACTION_OVERRIDES の注記より）
  ('希望のまち文京をつくる会',     false),
  ('日本維新の会文京区議団',       true),
  ('文京区議会日本維新の会',       true),
  ('市民フォーラム',               true),
  ('文京根っこの会',               true),
  ('自由民主党文京区議会',         true),
  ('自由民主党「誉」',             true)
) as v(name, is_active)
where not exists (
  select 1 from public.factions f where f.name = v.name
);

-- 2. 議員（履歴の18行に出てくる12人。同じ名前がすでにあれば入れない）
insert into public.members (name)
select v.name
from (values
  ('依田翼'),
  ('小林れい子'),
  ('海津敦子'),
  ('高山かずひろ'),
  ('宮崎こうき'),
  ('宮野ゆみこ'),
  ('ほかり吉紀'),
  ('豪一'),
  ('山田ひろこ'),
  ('浅川のぼる'),
  ('のぐちけんたろう'),
  ('市村やすとし')
) as v(name)
where not exists (
  select 1 from public.members m where m.name = v.name
);

-- 3. 表記（会議録に出てくる表記＝上の名前そのもの。12人に1つずつ）
insert into public.member_aliases (member_id, alias)
select m.id, m.name
from public.members m
where m.name in (
  '依田翼', '小林れい子', '海津敦子', '高山かずひろ', '宮崎こうき', '宮野ゆみこ',
  'ほかり吉紀', '豪一', '山田ひろこ', '浅川のぼる', 'のぐちけんたろう', '市村やすとし'
)
on conflict (alias_key) do nothing;

-- 4. 会派の履歴（FACTION_OVERRIDES の18行。順番も元のまま）
insert into public.member_faction_history (member_id, faction_id, start_date, end_date, basis, note)
select m.id, f.id, v.start_date, v.end_date,
       '区議会への届出PDFで確認（2026-09-14 反映）',
       v.note
from (values
  ('依田翼',           null::date,        date '2025-08-31', '文京区議会都民ファーストの会', null::text),
  ('依田翼',           date '2025-09-01', null::date,        '区民が主役の会',               null),
  ('小林れい子',       date '2025-05-01', date '2025-08-31', '希望のまち文京をつくる会',
     '「希望のまち文京をつくる会」は2025/5/1結成・2025/8/31解散。その期間だけに限定する。それ以前は本人の名乗りをそのまま使う'),
  ('小林れい子',       date '2025-09-01', null::date,        '区民が主役の会',               null),
  ('海津敦子',         date '2025-05-01', null::date,        '区民が主役の会',               null),
  ('高山かずひろ',     null::date,        date '2025-05-31', '日本維新の会文京区議団',       null),
  ('高山かずひろ',     date '2025-06-01', null::date,        '文京区議会日本維新の会',       null),
  ('宮崎こうき',       null::date,        date '2025-05-31', '日本維新の会文京区議団',       null),
  ('宮崎こうき',       date '2025-06-01', null::date,        '文京区議会日本維新の会',       null),
  ('宮野ゆみこ',       date '2025-05-01', null::date,        '市民フォーラム',               null),
  ('ほかり吉紀',       null::date,        date '2025-04-30', '文京根っこの会',               null),
  ('ほかり吉紀',       date '2025-05-01', null::date,        '市民フォーラム',               null),
  ('豪一',             null::date,        date '2026-01-04', '自由民主党文京区議会',         null),
  ('豪一',             date '2026-01-05', null::date,        '自由民主党「誉」',
     '2026/1/5の自民分裂で「自由民主党「誉」」へ移ったのは豪一議員のみ'),
  ('山田ひろこ',       null::date,        null::date,        '自由民主党文京区議会',
     '2026/1/5の分裂後も「自由民主党文京区議会」（確認済み）。期間の指定はしない'),
  ('浅川のぼる',       null::date,        null::date,        '自由民主党文京区議会',
     '2026/1/5の分裂後も「自由民主党文京区議会」（確認済み）。期間の指定はしない'),
  ('のぐちけんたろう', null::date,        null::date,        '自由民主党文京区議会',
     '2026/1/5の分裂後も「自由民主党文京区議会」（確認済み）。期間の指定はしない'),
  ('市村やすとし',     null::date,        null::date,        '自由民主党文京区議会',
     '2026/1/5の分裂後も「自由民主党文京区議会」（確認済み）。期間の指定はしない')
) as v(member_name, start_date, end_date, faction_name, note)
join public.members  m on m.name = v.member_name
join public.factions f on f.name = v.faction_name;

-- 5. 件数の確認。18行そろっていなければ、この設計図全体を取り消して止める。
do $$
declare
  v_count integer;
begin
  select count(*) into v_count from public.member_faction_history;
  if v_count <> 18 then
    raise exception '会派の履歴が18行になっていません（% 行）。名前の食い違いを確認してください', v_count;
  end if;
end;
$$;
