"use client";

import { PageTitle, Card, CardHead } from "@/components/kit";
import { Editable } from "@/components/ui/editable";
import { useSettings } from "@/lib/store";

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="grid gap-1 border-b border-border/60 py-3.5 last:border-0 sm:grid-cols-[180px_1fr] sm:items-center sm:gap-4"><span className="text-xs text-muted-foreground">{label}</span><div className="text-[13px]">{children}</div></div>;
}

export default function Page() {
  const { settings: s, update } = useSettings();
  return (
    <>
      <PageTitle title="Settings" sub="Click any value to change it." />
      <Card className="max-w-3xl">
        <CardHead title="Business" />
        <Row label="Business name"><Editable value={s.businessName} onSave={(v) => update({ businessName: v })} /></Row>
        <Row label="Owner"><Editable value={s.ownerName} onSave={(v) => update({ ownerName: v })} /></Row>
        <Row label="Business phone"><Editable value={s.phone} onSave={(v) => update({ phone: v })} /></Row>
        <Row label="Hours"><Editable value={s.hours} onSave={(v) => update({ hours: v })} /></Row>
        <Row label="Monthly marketing spend"><Editable value={s.adSpend ? `$${s.adSpend.toLocaleString("en-US")}` : ""} placeholder="Add to see ROI" onSave={(v) => update({ adSpend: Number(v.replace(/[^0-9.]/g, "")) || 0 })} /></Row>
        <Row label="Service area"><Editable value={s.serviceArea} onSave={(v) => update({ serviceArea: v })} multiline /></Row>
      </Card>
      <Card className="mt-4 max-w-3xl">
        <CardHead title="Receptionist" sub="What callers hear and where alerts go" />
        <Row label="Greeting"><Editable value={s.greeting} onSave={(v) => update({ greeting: v })} multiline /></Row>
        <Row label="Job alerts go to"><Editable value={s.alertEmail} onSave={(v) => update({ alertEmail: v })} /></Row>
        <Row label="Transfers go to"><Editable value={s.phone} onSave={(v) => update({ phone: v })} /></Row>
      </Card>
    </>
  );
}
