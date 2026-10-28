-- 権限の締め直しの残り（2026-10-28。引き継ぎ書 8章1の「後日でよいもの」）
--
-- refresh_council_member_faction(uuid)・refresh_all_council_member_factions() は、
-- 議員一覧の会派（council_members.faction_id）を会派の履歴から埋め直す関数。
-- 初期設定のまま anon（だれでも）と authenticated（ログインした人）が実行できた。
-- 今は RLS ですべて拒否されるので何も起きないが、念のため service_role だけに絞る。
--
-- ・呼んでいるのは、会派の履歴（member_faction_history）と議員（members）の表の仕掛け（トリガー）だけ。
--   アプリのコード（admin・web）から直接呼んでいる所は無い。
-- ・仕掛けは、表を書き換えた人の権限で動く。書き換えるのは service_role（管理画面・取り込みの道具）と
--   postgres（マイグレーション）だけなので、service_role に許しておけば今の動きは変わらない。
revoke execute on function public.refresh_council_member_faction(uuid) from public, anon, authenticated;
revoke execute on function public.refresh_all_council_member_factions() from public, anon, authenticated;
grant execute on function public.refresh_council_member_faction(uuid) to service_role;
grant execute on function public.refresh_all_council_member_factions() to service_role;
