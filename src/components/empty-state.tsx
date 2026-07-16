import Link from "next/link";

import { SuiteIcon } from "@/components/suite-icon";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type EmptyStateProps = {
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
};

export function EmptyState({
  title,
  description,
  actionLabel,
  actionHref,
}: EmptyStateProps) {
  return (
    <Card className="border-dashed border-border bg-card/45 shadow-none">
      <CardContent className="flex min-h-64 flex-col items-center justify-center px-6 py-10 text-center">
      <div className="suite-empty-mark">
        <SuiteIcon name="sparkle" className="h-5 w-5" />
      </div>
      <p className="mt-5 text-lg font-medium">{title}</p>
      <p className="mt-2 max-w-md text-sm leading-6 text-[var(--muted)]">
        {description}
      </p>
      {actionLabel && actionHref ? (
        <Button asChild variant="outline" className="mt-5">
          <Link href={actionHref}>
            {actionLabel}
            <SuiteIcon name="arrow" className="h-4 w-4" />
          </Link>
        </Button>
      ) : null}
      </CardContent>
    </Card>
  );
}
