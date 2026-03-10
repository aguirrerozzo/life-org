"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Menu, CheckSquare } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { UserMenu } from "@/components/auth/user-menu";
import { LocaleSwitcher } from "./locale-switcher";
import { ThemeToggle } from "./theme-toggle";
import { FloatingChat } from "@/components/chat/floating-chat";

export function AppShell({ children, sidebarSlot }: { children: React.ReactNode; sidebarSlot?: React.ReactNode }) {
  const t = useTranslations();
  const [open, setOpen] = useState(false);

  const sidebarContent = (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2.5 px-5 py-5 border-b border-border/50">
        <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-primary/10">
          <CheckSquare className="h-4.5 w-4.5 text-primary" />
        </div>
        <span className="font-bold text-lg tracking-tight">{t("common.appName")}</span>
      </div>
      <nav className="flex-1 p-3 flex flex-col gap-4 overflow-y-auto w-full">
        {sidebarSlot && (
          <div className="w-full">
            {sidebarSlot}
          </div>
        )}
      </nav>
      <div className="border-t border-border/50 p-3 flex items-center justify-between">
        <div className="flex items-center gap-1">
          <LocaleSwitcher />
          <ThemeToggle />
        </div>
        <UserMenu />
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:w-60 md:flex-col border-r border-border/50 bg-sidebar">
        {sidebarContent}
      </aside>

      {/* Mobile header + sheet */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="md:hidden flex items-center justify-between border-b border-border/50 px-4 py-3 bg-sidebar">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger className="inline-flex items-center justify-center rounded-md h-9 w-9 hover:bg-accent hover:text-accent-foreground transition-colors">
              <Menu className="h-5 w-5" />
            </SheetTrigger>
            <SheetContent side="left" className="w-60 p-0">
              <SheetTitle className="sr-only">Navigation</SheetTitle>
              {sidebarContent}
            </SheetContent>
          </Sheet>
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center h-7 w-7 rounded-lg bg-primary/10">
              <CheckSquare className="h-4 w-4 text-primary" />
            </div>
            <span className="font-bold tracking-tight">{t("common.appName")}</span>
          </div>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <LocaleSwitcher />
            <UserMenu />
          </div>
        </header>

        <main className="flex-1 overflow-hidden">
          {children}
        </main>
      </div>
      {/* Floating Chat UI */}
      <FloatingChat />
    </div>
  );
}
