import { ButtonLink } from "@/components/ui/button";
import { getI18n } from "@/lib/i18n/server";

export async function NotFoundContent() {
  const { dict } = await getI18n();
  return (
    <div className="container-page flex flex-col items-center py-24 text-center">
      <p className="font-display text-7xl text-accent">404</p>
      <h1 className="mt-4 font-display text-3xl">{dict.common.notFoundTitle}</h1>
      <p className="mt-2 max-w-md text-ink-2">{dict.common.notFoundText}</p>
      <ButtonLink href="/" className="mt-8">
        {dict.common.backHome}
      </ButtonLink>
    </div>
  );
}
