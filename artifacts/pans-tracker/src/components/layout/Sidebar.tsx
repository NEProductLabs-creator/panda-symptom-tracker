import { useState } from "react";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  ClipboardList,
  ClipboardCheck,
  CalendarRange,
  Heart,
  HeartHandshake,
  Sparkles,
  FileText,
  School,
  Pill,
  Zap,
  Flag,
  BookOpen,
  Printer,
  Home,
  Settings2,
  Activity,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useChildBaseline } from "@/hooks/useChildBaseline";

// ─── Nav structure ────────────────────────────────────────────────────────────

interface NavChild {
  href: string;
  label: string;
  icon: React.ElementType;
}

interface NavSection {
  href: string;
  label: string;
  icon: React.ElementType;
  children?: NavChild[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    href: "/",
    label: "Home",
    icon: Home,
  },
  {
    href: "/log",
    label: "Log Today",
    icon: ClipboardList,
    children: [
      { href: "/medications", label: "Medications", icon: Pill },
      { href: "/triggers", label: "Triggers", icon: Zap },
    ],
  },
  {
    href: "/ptec",
    label: "Weekly Check-In",
    icon: ClipboardCheck,
  },
  {
    href: "/timeline",
    label: "Timeline",
    icon: CalendarRange,
  },
  {
    href: "/baseline",
    label: "My Child",
    icon: Heart,
    children: [
      { href: "/milestones", label: "Milestones", icon: Flag },
      { href: "/library", label: "Med Library", icon: BookOpen },
    ],
  },
  {
    href: "/export",
    label: "Doctor Ready",
    icon: FileText,
    children: [
      { href: "/school", label: "School Letters", icon: School },
      { href: "/print", label: "Print Summary", icon: Printer },
    ],
  },
  {
    href: "/wellbeing",
    label: "For You",
    icon: HeartHandshake,
    children: [
      { href: "/hope", label: "Hope Board", icon: Sparkles },
    ],
  },
  {
    href: "/settings",
    label: "Settings",
    icon: Settings2,
  },
];

// Which child routes belong to which parent section
function getSectionForPath(path: string): string {
  for (const s of NAV_SECTIONS) {
    if (s.href === path) return s.href;
    if (s.children?.some((c) => c.href === path)) return s.href;
  }
  return path;
}

// ─── Nav item ─────────────────────────────────────────────────────────────────

function NavItem({
  section,
  location,
  onNavigate,
}: {
  section: NavSection;
  location: string;
  onNavigate: () => void;
}) {
  const activeSection = getSectionForPath(location);
  const isActive = location === section.href;
  const isSectionActive = activeSection === section.href;
  const Icon = section.icon;
  const hasChildren = !!section.children?.length;

  return (
    <div>
      <Link href={section.href} onClick={onNavigate} data-testid={`nav-${section.label.toLowerCase().replace(/\s/g, "-")}`}>
        <div
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer",
            isActive
              ? "bg-primary text-primary-foreground shadow-sm"
              : isSectionActive
              ? "bg-primary/10 text-primary"
              : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          )}
        >
          <Icon
            className={cn(
              "w-4 h-4 flex-shrink-0",
              isActive
                ? "text-primary-foreground"
                : isSectionActive
                ? "text-primary"
                : "opacity-70"
            )}
          />
          <span className="flex-1 truncate">{section.label}</span>
        </div>
      </Link>

      {/* Sub-items — shown when section is active */}
      {hasChildren && isSectionActive && (
        <div className="ml-4 mt-0.5 space-y-0.5 border-l-2 border-primary/20 pl-3">
          {section.children!.map((child) => {
            const ChildIcon = child.icon;
            const childActive = location === child.href;
            return (
              <Link key={child.href} href={child.href} onClick={onNavigate} data-testid={`nav-${child.label.toLowerCase().replace(/\s/g, "-")}`}>
                <div
                  className={cn(
                    "flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer",
                    childActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent"
                  )}
                >
                  <ChildIcon className="w-3.5 h-3.5 flex-shrink-0" />
                  {child.label}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Sidebar component ────────────────────────────────────────────────────────

export default function Sidebar() {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { baseline } = useChildBaseline();
  const childName = baseline?.childName?.trim();

  function closeMobile() {
    setMobileOpen(false);
  }

  const navContent = (
    <>
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 py-5 border-b border-border">
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
          <Activity className="w-4 h-4 text-primary-foreground" />
        </div>
        <div className="min-w-0">
          <p className="font-bold text-sm leading-tight text-foreground truncate" style={{ fontFamily: "Outfit, sans-serif" }}>
            PANS &amp; PANDAS Tracker
          </p>
          {childName ? (
            <p className="text-[11px] text-primary font-medium leading-tight truncate">
              Tracking for {childName}
            </p>
          ) : (
            <p className="text-[11px] text-muted-foreground leading-tight">Symptom Journal</p>
          )}
        </div>
      </div>

      {/* Nav */}
      <nav className="flex flex-col gap-1 p-3 flex-1 overflow-y-auto" data-testid="sidebar-nav">
        {NAV_SECTIONS.map((section) => (
          <NavItem
            key={section.href}
            section={section}
            location={location}
            onNavigate={closeMobile}
          />
        ))}
      </nav>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-border">
        <p className="text-[11px] text-muted-foreground text-center leading-relaxed">
          All data stored locally on this device
        </p>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col fixed top-0 left-0 h-screen w-60 bg-sidebar border-r border-sidebar-border z-30">
        {navContent}
      </aside>

      {/* Mobile header */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-14 bg-sidebar border-b border-sidebar-border flex items-center justify-between px-4 z-30">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center">
            <Activity className="w-3.5 h-3.5 text-primary-foreground" />
          </div>
          <span className="font-bold text-sm text-foreground" style={{ fontFamily: "Outfit, sans-serif" }}>
            {childName ? `Tracking for ${childName}` : "PANS & PANDAS Tracker"}
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
            onClick={closeMobile}
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
