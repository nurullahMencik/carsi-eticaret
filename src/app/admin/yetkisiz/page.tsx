import { ShieldX } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { getI18n } from "@/lib/i18n/server";

export default async function ForbiddenPage() {
  const { dict } = await getI18n();
  return (
    <div className="flex flex-col items-center py-24 text-center" data-testid="forbidden">
      <ShieldX aria-hidden className="size-12 text-danger" strokeWidth={1.4} />
      <h1 className="mt-4 text-2xl font-semibold">403</h1>
      <p className="mt-2 text-ink-2">{dict.errors.FORBIDDEN}</p>
      <ButtonLink href="/" className="mt-8" variant="outline">
        {dict.admin.backToStore}
      </ButtonLink>
    </div>
  );
}
