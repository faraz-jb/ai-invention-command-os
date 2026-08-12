"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const LINKS = [
  { href: "/", label: "Dashboard" },
  { href: "/projects", label: "Pipeline" },
  { href: "/tasks", label: "Tasks" },
  { href: "/agents", label: "Agents" },
  { href: "/sites", label: "Sites" },
];

export default function Nav() {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="border-b border-border bg-surface sticky top-0 z-10">
      <div className="mx-auto max-w-6xl flex items-center justify-between px-4 py-3 gap-4">
        <div className="flex items-center gap-6 overflow-x-auto">
          <span className="text-accent font-semibold tracking-tight whitespace-nowrap">
            🛰️ Command OS
          </span>
          <nav className="flex items-center gap-1">
            {LINKS.map((link) => {
              const active = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-3 py-1.5 rounded-md text-sm whitespace-nowrap transition-colors ${
                    active
                      ? "bg-accent/15 text-accent"
                      : "text-text-dim hover:text-text hover:bg-surface-2"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <button
          onClick={logout}
          className="text-sm text-text-dim hover:text-danger transition-colors whitespace-nowrap"
        >
          Log out
        </button>
      </div>
    </header>
  );
}
