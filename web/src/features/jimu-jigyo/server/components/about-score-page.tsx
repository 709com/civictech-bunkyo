import "server-only";
import Link from "next/link";
import { siteConfig } from "@/config/site.config";

export function AboutScorePage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-10">
      <Link
        href="/jimu-jigyo"
        className="text-sm text-grade-b flex items-center gap-1"
      >
        ← 事務事業分析トップに戻る
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-mirai-text">
          この分析の見方について
        </h1>
        <p className="text-sm text-mirai-text-secondary mt-2">
          {siteConfig.cityName}
          が公開する「事務事業マネジメントシート」（令和6年度実施分）をもとに、
          KPI・予算・効率の3軸で事業の動向を自動分析しています。
        </p>
        <div className="mt-3 p-3 bg-mirai-surface-warm border border-mirai-border rounded-lg text-sm text-mirai-text-secondary">
          ⚠️
          この分析はあくまで公開データをもとにした参考情報です。事業の優劣を断定するものではありません。
        </div>
      </div>

      <hr className="border-mirai-border" />

      <section className="space-y-4">
        <h2 className="text-lg font-bold text-mirai-text">① KPI達成状況</h2>
        <p className="text-sm text-mirai-text-secondary">
          行政が設定した成果指標・活動指標の達成状況を分析します。
          令和5年度から令和6年度にかけて実績がどう変化したかを示します。
        </p>
        <div className="bg-mirai-surface border border-mirai-border rounded-lg p-4 text-sm space-y-2">
          <div className="flex items-center gap-3">
            <span className="text-grade-a font-bold w-16">↑ 改善</span>
            <span className="text-mirai-text-secondary">
              前年度比+5%超の改善が確認できた
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-mirai-text-muted font-bold w-16">
              → 横ばい
            </span>
            <span className="text-mirai-text-secondary">
              前年度比±5%以内で横ばい
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-grade-d font-bold w-16">↓ 悪化</span>
            <span className="text-mirai-text-secondary">
              前年度比-5%超の悪化が確認できた
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-mirai-text-muted w-16">─ 不明</span>
            <span className="text-mirai-text-secondary">
              実績データが数値でない、または不足している
            </span>
          </div>
        </div>
        <div className="bg-mirai-surface-warm border border-mirai-border rounded-lg p-3 text-sm text-mirai-text-secondary">
          <p className="font-medium text-mirai-text mb-1">
            「調査未実施」について
          </p>
          一部の指標は3年に1度など定期調査のため、当該年度に実績が存在しない場合があります。
          この場合は「定期調査年外」として評価の対象から除外しています。
        </div>
      </section>

      <hr className="border-mirai-border" />

      <section className="space-y-4">
        <h2 className="text-lg font-bold text-mirai-text">② 予算の動き</h2>
        <p className="text-sm text-mirai-text-secondary">
          令和5年度決算から令和6年度決算見込みにかけての歳出変化を示します。
          令和7年度予算の方向性も参考として表示します。
        </p>
        <div className="bg-mirai-surface border border-mirai-border rounded-lg p-4 text-sm space-y-2">
          <div className="flex items-center gap-3">
            <span className="text-grade-a font-bold w-16">↓ 削減</span>
            <span className="text-mirai-text-secondary">
              歳出が前年度比-5%超の削減
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-mirai-text-muted font-bold w-16">→ 維持</span>
            <span className="text-mirai-text-secondary">
              歳出が前年度比±5%以内で横ばい
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-mirai-text-muted font-bold w-16">↑ 増加</span>
            <span className="text-mirai-text-secondary">
              歳出が前年度比+5%超の増加
            </span>
          </div>
        </div>
        <p className="text-xs text-mirai-text-muted">
          ※
          予算増加自体が問題なのではなく、後述の「予算効率」とあわせて判断することが重要です。
        </p>
      </section>

      <hr className="border-mirai-border" />

      <section className="space-y-4">
        <h2 className="text-lg font-bold text-mirai-text">
          ③ 予算効率（KPI/予算）
        </h2>
        <p className="text-sm text-mirai-text-secondary">
          「同じ予算でどれだけの成果を得られたか」を示す指標です。
          達成率の平均を歳出で割った値の変化率で評価します。
        </p>
        <div className="bg-mirai-surface border border-mirai-border rounded-lg p-4 text-sm space-y-3">
          <div>
            <p className="font-medium text-mirai-text">計算式</p>
            <p className="text-mirai-text-secondary mt-1">
              コスト効率 = 成果指標の達成率平均（%） ÷ 歳出（千円）
            </p>
            <p className="text-mirai-text-secondary">
              効率変化率 = (R6効率 ─ R5効率) ÷ R5効率
            </p>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <span className="text-grade-a font-bold w-16">↑ 改善</span>
              <span className="text-mirai-text-secondary">
                効率変化率が+5%超（予算増以上にKPIが改善）
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-mirai-text-muted font-bold w-16">
                → 維持
              </span>
              <span className="text-mirai-text-secondary">
                効率変化率が±5%以内（予算とKPIがほぼ比例）
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-grade-d font-bold w-16">↓ 悪化</span>
              <span className="text-mirai-text-secondary">
                効率変化率が-5%超（予算増に対しKPIが改善していない）
              </span>
            </div>
          </div>
        </div>
        <div className="bg-mirai-surface-warm border border-mirai-border rounded-lg p-3 text-sm text-mirai-text-secondary">
          <p className="font-medium text-mirai-text mb-1">
            達成率データがない場合
          </p>
          指標の達成率が「達成」「未達成」等のテキストのみの場合、
          「達成」=100%、「未達成」=60%相当として計算します。
          定量的な達成率がない事業は、予算変化量のみで参考値を示します。
        </div>
      </section>

      <hr className="border-mirai-border" />

      <div className="text-sm text-mirai-text-secondary">
        <p>
          この分析に関するご意見・フィードバックは GitHub Issues
          へお寄せください。
        </p>
      </div>
    </div>
  );
}
