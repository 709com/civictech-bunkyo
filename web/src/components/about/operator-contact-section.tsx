import {
  LegalParagraph,
  LegalSectionTitle,
} from "@/components/layouts/legal-page-layout";

type OperatorContact = {
  address: string;
  phone: string;
  email: string;
};

type OperatorContactSectionProps = {
  /** 会派の名前（例：会派「ぶんきょう子育て.ネット」） */
  operatorName: string;
  contact: OperatorContact;
};

/** 連絡先のうち、値が入っているものだけを残す（空欄は出さない。推測で埋めない） */
export function pickOperatorContacts(contact: OperatorContact) {
  return [
    { label: "所在地", value: contact.address },
    { label: "電話", value: contact.phone },
    { label: "メール", value: contact.email },
  ].filter((item) => item.value.trim() !== "");
}

/**
 * 運営者情報ページの「会派の連絡先」。
 * 2026-10-28 運営者の判断で、会派の連絡先は住所だけにした（電話・メールは載せない。事務所と共通の表記はやめた）。
 * 値が1つも入っていないときは、見出しごと表示しない。
 */
export function OperatorContactSection({
  operatorName,
  contact,
}: OperatorContactSectionProps) {
  const items = pickOperatorContacts(contact);
  if (items.length === 0) return null;

  return (
    <section className="space-y-3">
      <LegalSectionTitle>会派の連絡先</LegalSectionTitle>
      <LegalParagraph>
        {operatorName}の連絡先は、次のとおりです。
      </LegalParagraph>
      <dl className="space-y-2 text-base leading-relaxed">
        {items.map((item) => (
          <div
            key={item.label}
            className="flex flex-col gap-1 sm:flex-row sm:gap-3"
          >
            <dt className="shrink-0 font-bold text-slate-900">{item.label}</dt>
            <dd className="break-all">{item.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
