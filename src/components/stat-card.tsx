type StatCardProps = {
  label: string;
  value: string;
  helper: string;
};

export function StatCard({ label, value, helper }: StatCardProps) {
  return (
    <Card className="border-border/80 bg-card/75 shadow-none">
      <CardContent className="px-5 py-5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--muted-dim)]">
        {label}
      </p>
      <p className="mt-5 text-4xl font-semibold tracking-[-0.06em] tabular-nums">{value}</p>
      <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{helper}</p>
      </CardContent>
    </Card>
  );
}
import { Card, CardContent } from "@/components/ui/card";
