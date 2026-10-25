"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export interface NavItem {
  href: string;
  label: string;
}

export function Nav({ items, label }: { items: NavItem[]; label: string }) {
  const pathname = usePathname();
  return (
    <nav aria-label={label}>
      <ul className="nav">
        {items.map((item) => (
          <li key={item.href}>
            <Link href={item.href} aria-current={pathname === item.href ? "page" : undefined}>
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
