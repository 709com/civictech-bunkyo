-- 公開前の権限の締め直し（2026-10-22）
--
-- 1. set_active_council_session(uuid)
--    SECURITY DEFINER（作成者の権限で動く）なのに、anon（だれでも）と
--    authenticated（ログインした人）が実行できたため、公開されている anon キーで
--    「今の会期」の印（council_sessions.is_active）を外から書き換えられた。
--    呼び出し元は管理画面（admin）の setActiveCouncilSessionRecord だけで、
--    service_role の鍵（createAdminClient）で呼んでいるので、service_role だけに絞る。
--    （CREATE OR REPLACE FUNCTION で作り直しても、この権限はそのまま残る）
revoke execute on function public.set_active_council_session(uuid)
  from public, anon, authenticated;
grant execute on function public.set_active_council_session(uuid)
  to service_role;

-- 2. 事務事業評価のビュー2つ
--    ビューは既定では作成者（postgres）の権限で元の表を読むため、
--    元の表の RLS（ポリシー無し＝全拒否）を飛び越えて anon からも読めた。
--    - security_invoker = true：呼んだ人の権限で元の表を読む（RLS が効く）
--    - anon / authenticated の権限も外す（念のための二重の締め）
--    コードの中でこの2つのビューを使っている所は無く、事務事業評価の読み込みは
--    すべて service_role（RLS を通らない）なので、既存の動きは変わらない。
alter view public.jimu_jigyo_latest set (security_invoker = true);
alter view public.jimu_jigyo_budget_timeline set (security_invoker = true);

revoke all on public.jimu_jigyo_latest from anon, authenticated;
revoke all on public.jimu_jigyo_budget_timeline from anon, authenticated;
