"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  MessageCircle,
  Building2,
  Kanban,
  Briefcase,
  Users,
  ListChecks,
  CalendarClock,
  RefreshCw,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useProfile } from "@/hooks/use-profile";
import { signOut } from "@/services/profile";

const NAV = [
  { href: "/inbox", label: "Conversas", icon: MessageCircle },
  { href: "/empresas", label: "Empresas", icon: Building2 },
  { href: "/pipeline", label: "Pipeline", icon: Kanban },
  { href: "/negocios", label: "Negócios", icon: Briefcase },
  { href: "/contatos", label: "Contatos", icon: Users },
  { href: "/atividades", label: "Atividades", icon: ListChecks },
  { href: "/follow-ups", label: "Follow-ups de hoje", icon: CalendarClock },
  { href: "/renovacoes", label: "Renovações", icon: RefreshCw },
];

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="flex gap-1 md:flex-col">
      {NAV.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(href + "/");
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-2 whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { data: profile } = useProfile();

  async function handleSignOut() {
    await signOut();
    window.location.href = "/login";
  }

  return (
    <div className="flex min-h-screen">
      {/* Sidebar (desktop) */}
      <aside className="hidden w-64 flex-col border-r bg-background md:flex">
        <div className="border-b px-6 py-4">
          <p className="text-sm font-semibold">CRM — Agência Senna</p>
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          <NavLinks />
        </div>
        <div className="border-t p-3">
          <div className="mb-2 px-3 text-xs text-muted-foreground">
            <p className="truncate font-medium text-foreground">
              {profile?.nome ?? profile?.email ?? "Usuário"}
            </p>
            <p className="truncate capitalize">{profile?.papel}</p>
          </div>
          <Button
            variant="ghost"
            className="w-full justify-start gap-2 text-muted-foreground"
            onClick={handleSignOut}
          >
            <LogOut className="h-4 w-4" />
            Sair
          </Button>
        </div>
      </aside>

      {/* Conteúdo */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar (mobile) */}
        <header className="border-b bg-background md:hidden">
          <div className="flex items-center justify-between px-4 py-3">
            <p className="text-sm font-semibold">CRM — Agência Senna</p>
            <Button variant="ghost" size="icon" onClick={handleSignOut}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
          <div className="overflow-x-auto border-t px-3 py-2">
            <NavLinks />
          </div>
        </header>

        <main className="flex-1 p-4 md:p-8">
          <div className="mx-auto w-full max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
