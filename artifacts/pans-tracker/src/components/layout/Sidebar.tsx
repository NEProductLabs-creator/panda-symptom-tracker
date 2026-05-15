import { useState } from "react";
import { Link, useLocation } from "wouter";
import { LayoutDashboard, ClipboardList, Pill, Printer, Menu, X, Activity, BookOpen, Download, Flag } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/log", label: "Daily Log", icon: ClipboardList },
  { href: "/library", label: "Med Library", icon: BookOpen },
  { href: "/milestones", label: "Milestones", icon: Flag },
  { href: "/print", label: "Print Summary", icon: Printer },
  { href: "/export", label: "Export PDF", icon: Download },
];

export default function Sidebar() {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navContent = (
    <>
      <div className="flex items-center gap-2.5 px-4 py-5 border-b border-border">
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
          <Activity className="w-4 h-4 text-primary-foreground" />
        </div>
        <div>
          <p className="font-semibold text-sm leading-tight text-foreground" style={{ fontFamily: "Outfit, sans-serif" }}>
            PANS Tracker
          </p>
          <p className="text-[11px] text-muted-foreground leading-tight">Symptom Journal</p>
        </div>
      </div>
      <nav className="flex flex-col gap-1 p-3 flex-1" data-testid="sidebar-nav">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = location === href;
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setMobileOpen(false)}
              data-testid={`nav-link-${label.toLowerCase().replace(/\s/g, "-")}`}
            >
              <div
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                {label}
              </div>
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t border-border space-y-2">
        <p className="text-[11px] text-muted-foreground text-center leading-relaxed">
          All data stored locally on this device
        </p>
        <div className="flex justify-center">
          <Link href="/about" onClick={() => setMobileOpen(false)}>
            <span className="text-[11px] text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2 cursor-pointer">
              About PANS/PANDAS
            </span>
          </Link>
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col fixed top-0 left-0 h-screen w-60 bg-sidebar border-r border-sidebar-border z-30">
        {navContent}
      </aside>

      {/* Mobile header bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-14 bg-sidebar border-b border-sidebar-border flex items-center justify-between px-4 z-30">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center">
            <Activity className="w-3.5 h-3.5 text-primary-foreground" />
          </div>
          <span className="font-semibold text-sm text-foreground" style={{ fontFamily: "Outfit, sans-serif" }}>
            PANS Tracker
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setMobileOpen(!mobileOpen)}
          data-testid="mobile-menu-toggle"
          className="w-8 h-8"
        >
          {mobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
        </Button>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <>
          <div
            className="md:hidden fixed inset-0 bg-black/20 z-40"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="md:hidden fixed top-0 left-0 h-screen w-72 bg-sidebar border-r border-sidebar-border z-50 flex flex-col">
            {navContent}
          </aside>
        </>
      )}

      {/* Mobile top spacer */}
      <div className="md:hidden h-14" />
    </>
  );
}
