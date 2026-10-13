-- =============================================================
-- 議員マスタに、区議会HPの会派別名簿（令和8年1月5日現在）の33人を登録する
-- =============================================================
-- ・名簿の表記のとおりを正式名とし、現職として登録する。読み（yomi）は空のまま。
-- ・すでに登録済みの12人（会派の履歴のために登録した議員）と重なる人は、重複させない。
-- ・この名簿は「誰が議員か」を決めるためだけに使う。
--   会派の履歴（member_faction_history）には1行も足さない
--   （履歴は、区議会への届出と本人の名乗りで決めたものを正とする）。
-- ・名簿にいない質問者は、新しい議員として確定させず「仮登録」にする。

-- 仮登録の印。本人確認（運営者による確認）が済むまで true にしておく。
alter table public.members
  add column is_provisional boolean not null default false;

comment on column public.members.is_provisional is
  '仮登録の印。名簿で確認できていない議員を、確認が済むまで true にしておく';

-- 1. 名簿の33人（同じ名前がすでにあれば入れない）
insert into public.members (name, is_current)
select v.name, true
from (values
  -- 自由民主党文京区議会（9人）
  ('白石英行'), ('名取顕一'), ('田中としかね'), ('市村やすとし'), ('山田ひろこ'),
  ('浅川のぼる'), ('松平雄一郎'), ('吉村美紀'), ('のぐちけんたろう'),
  -- 日本共産党文京区議会議員団（5人）
  ('板倉美千代'), ('関川けさ子'), ('金子てるよし'), ('千田恵美子'), ('石沢のりゆき'),
  -- 公明党文京区議団（4人）
  ('岡崎義顕'), ('松丸昌史'), ('田中香澄'), ('宮本伸一'),
  -- 政策チーム AGORA（4人）
  ('品田ひでこ'), ('浅田保雄'), ('上田ゆきこ'), ('沢田けいじ'),
  -- 区民が主役の会（3人）
  ('依田翼'), ('小林れい子'), ('海津敦子'),
  -- 文京区議会日本維新の会（2人）
  ('高山かずひろ'), ('宮崎こうき'),
  -- 文京永久の会（2人）
  ('山本一仁'), ('高山泰三'),
  -- 市民フォーラム（2人）
  ('宮野ゆみこ'), ('ほかり吉紀'),
  -- ぶんきょう子育て.ネット（1人）
  ('たかはまなおき'),
  -- 自由民主党「誉」（1人）
  ('豪一')
) as v(name)
where not exists (
  select 1 from public.members m where m.name = v.name
);

-- 2. 表記（名簿の表記そのもの。すでにある表記は入れない）
insert into public.member_aliases (member_id, alias)
select m.id, m.name
from public.members m
where m.is_provisional = false
on conflict (alias_key) do nothing;

-- 3. 別表記（名簿は「たかはまなおき」。漢字表記の「高浜直樹」も同じ議員に結ぶ）
insert into public.member_aliases (member_id, alias)
select m.id, '高浜直樹'
from public.members m
where m.name = 'たかはまなおき'
on conflict (alias_key) do nothing;

-- 4. 名簿にいない質問者（本会議の会議録に質問者として出てくるが、名簿には載っていない）
--    現職ではない扱い・仮登録として登録する。運営者の確認が済んだら is_provisional を false にする。
insert into public.members (name, is_current, is_provisional)
select v.name, false, true
from (values
  ('西村修')
) as v(name)
where not exists (
  select 1 from public.members m where m.name = v.name
);

insert into public.member_aliases (member_id, alias)
select m.id, m.name
from public.members m
where m.is_provisional = true
on conflict (alias_key) do nothing;

-- 5. 件数の確認。合わなければ、この設計図全体を取り消して止める。
do $$
declare
  v_members     integer;
  v_current     integer;
  v_provisional integer;
  v_aliases     integer;
  v_history     integer;
begin
  select count(*),
         count(*) filter (where is_current and not is_provisional),
         count(*) filter (where is_provisional)
    into v_members, v_current, v_provisional
    from public.members;
  select count(*) into v_aliases from public.member_aliases;
  select count(*) into v_history from public.member_faction_history;

  if v_members <> 34 or v_current <> 33 or v_provisional <> 1 then
    raise exception '議員マスタの人数が想定と違います（全体 % 人／現職 % 人／仮登録 % 人。想定は 34／33／1）',
      v_members, v_current, v_provisional;
  end if;
  if v_aliases <> 35 then
    raise exception '表記の件数が想定と違います（% 件。想定は 35：議員34人＋別表記1つ）', v_aliases;
  end if;
  if v_history <> 18 then
    raise exception '会派の履歴が18行から変わっています（% 行）。この設計図は履歴を変えてはいけません', v_history;
  end if;
end;
$$;
