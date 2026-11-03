"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, ClipboardList, FolderTree, History, Package, Ticket, Users } from "lucide-react";
import { cn } from "@/components/ui/cn";
import { useI18n } from "@/lib/i18n/client";

const ITEMS = [
  { href: "/admin", key: "dashboard", icon: BarChart3, exact: true },
  { href: "/admin/siparisler", key: "orders", icon: ClipboardList },
  { href: "/admin/urunler", key: "products", icon: Package },
  { href: "/admin/kategoriler", key: "categories", icon: FolderTree },
  { href: "/admin/musteriler", key: "customers", icon: Users },
  { href: "/admin/kuponlar", key: "coupons", icon: Ticket, adminOnly: true },
  { href: "/admin/denetim", key: "audit", icon: History, adminOnly: true },
] as const;

export function AdminNav({ isAdmin }: { isAdmin: boolean }) {
  const { dict } = useI18n();
  const pathname = usePathname();
  return (
    <ul className="flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
      {ITEMS.filter((i) => isAdmin || !("adminOnly" in i)).map((item) => {
        const active = "exact" in item ? pathname === item.href : pathname.startsWith(item.href);
        const Icon = item.icon;
        return (
          <li key={item.href} className="shrink-0">
            <Link
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm whitespace-nowrap",
                active ? "bg-ink text-canvas" : "text-ink-2 hover:bg-surface-2 hover:text-ink",
              )}
            >
              <Icon aria-hidden className="size-4" />
              {dict.admin.nav[item.key]}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
