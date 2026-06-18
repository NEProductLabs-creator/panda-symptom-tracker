import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useUser, useClerk } from "@clerk/react";
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
  Menu,
  X,
  MessageSquare,
  Cloud,
  CloudOff,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useChildBaseline } from "@/hooks/useChildBaseline";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { useQueueStatus } from "@/lib/apiQueue";
import FeedbackDialog from "@/components/FeedbackDialog";

// ─── Nav structure ────────────────────────────────────────────────────────────

interface NavChild {
  href: string;
  label: string;
  icon: React.ElementType;
}

interface NavSection {
  href: string;
  label: string;
  subtitle?: string;
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
    subtitle: "Quick daily symptom check",
    icon: ClipboardList,
    children: [
      { href: "/medications", label: "Medications", icon: Pill },
      { href: "/triggers", label: "Triggers", icon: Zap },
    ],
  },
  {
    href: "/ptec",
    label: "Weekly PTEC Check-In",
    subtitle: "PTEC clinical assessment",
    icon: ClipboardCheck,
  },
  {
    href: "/timeline",
    label: "Timeline",
    subtitle: "Your full symptom history",
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
    subtitle: "Reports for appointments",
    icon: FileText,
    children: [
      { href: "/school", label: "School Letters", icon: School },
      { href: "/print", label: "Print Summary", icon: Printer },
    ],
  },
  {
    href: "/wellbeing",
    label: "For You",
    subtitle: "Your wellbeing as a caregiver",
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

// ─── Sync status indicator ────────────────────────────────────────────────────

function SyncStatus() {
  const isOnline = useOnlineStatus();
  const { pending, failed } = useQueueStatus();
  const total = pending + failed;

  if (!isOnline) {
    return (
      <div className="flex items-center gap-1.5 text-[10px] text-amber-600 mt-0.5">
        <CloudOff className="w-3 h-3 flex-shrink-0" />
        <span>Offline</span>
      </div>
    );
  }

  if (total > 0) {
    return (
      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mt-0.5">
        <Loader2 className="w-3 h-3 flex-shrink-0 animate-spin" />
        <span>Syncing {total} item{total !== 1 ? "s" : ""}</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 text-[10px] text-green-600 mt-0.5">
      <Cloud className="w-3 h-3 flex-shrink-0" />
      <span>Synced</span>
    </div>
  );
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
            "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all cursor-pointer",
            isActive
              ? "bg-card font-semibold shadow-sm"
              : isSectionActive
              ? "font-medium text-foreground/80"
              : "font-medium text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          )}
          style={isActive ? { color: "var(--terracotta)" } : undefined}
        >
          <Icon
            className={cn(
              "w-4 h-4 flex-shrink-0",
              isActive ? "" : isSectionActive ? "opacity-80" : "opacity-60"
            )}
            style={isActive ? { color: "var(--terracotta)" } : undefined}
          />
          <div className="flex-1 min-w-0">
            <p className="truncate leading-tight">{section.label}</p>
            {section.subtitle && (
              <p className={cn(
                "text-[10px] leading-tight mt-0.5 truncate font-normal",
                isActive ? "opacity-70" : "text-muted-foreground/70"
              )}>
                {section.subtitle}
              </p>
            )}
          </div>
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
                      ? "bg-card font-semibold"
                      : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent"
                  )}
                  style={childActive ? { color: "var(--terracotta)" } : undefined}
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
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const { baseline } = useChildBaseline();
  const childName = baseline?.childName?.trim();
  const { user } = useUser();
  const { signOut } = useClerk();

  const displayName = user?.firstName || user?.emailAddresses?.[0]?.emailAddress?.split("@")[0] || null;
  const displayEmail = user?.emailAddresses?.[0]?.emailAddress || null;

  function closeMobile() {
    setMobileOpen(false);
  }

  function handleLogoClick(e: React.MouseEvent) {
    if (location === "/") {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  const navContent = (
    <>
      {/* Logo */}
      <Link
        href="/"
        onClick={handleLogoClick}
        className="block px-5 py-5 border-b border-border cursor-pointer hover:opacity-80 transition-opacity"
      >
        <p className="font-semibold text-[15px] leading-tight text-foreground" style={{ fontFamily: "Fraunces, serif", letterSpacing: "-0.02em" }}>
          PANS &amp; PANDAS
        </p>
        <p className="text-[12px] leading-snug mt-0.5 text-muted-foreground" style={{ fontFamily: "Newsreader, serif", fontStyle: "italic" }}>
          Symptom Tracker
        </p>
        {childName && (
          <p className="text-[11px] mt-1.5 font-medium" style={{ color: "var(--terracotta)" }}>
            Tracking for {childName}
          </p>
        )}
      </Link>

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

      {/* User menu */}
      <div className="px-4 py-4 border-t border-border space-y-3">
        {displayName && (
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[13px] font-semibold text-foreground truncate leading-tight" style={{ fontFamily: "Fraunces, serif" }}>
                {displayName}
              </p>
              {displayEmail && (
                <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                  {displayEmail}
                </p>
              )}
              <SyncStatus />
            </div>
            <button
              type="button"
              onClick={() => signOut()}
              className="text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors flex-shrink-0 px-2 py-1 rounded-md hover:bg-sidebar-accent whitespace-nowrap"
            >
              Log out
            </button>
          </div>
        )}
        <button
          type="button"
          onClick={() => setFeedbackOpen(true)}
          className="flex items-center gap-2 w-full text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors px-2 py-1.5 rounded-md hover:bg-sidebar-accent"
        >
          <MessageSquare className="w-3.5 h-3.5 flex-shrink-0" />
          Send Feedback
        </button>
      </div>

      <FeedbackDialog open={feedbackOpen} onOpenChange={setFeedbackOpen} />
    </>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col fixed top-0 left-0 h-screen w-60 bg-sidebar border-r border-sidebar-border z-30">
        {navContent}
      </aside>

      {/* Mobile header — sits at top, pads for Dynamic Island / notch via safe-area-inset-top */}
      <div
        className="md:hidden fixed top-0 left-0 right-0 bg-sidebar border-b border-sidebar-border z-30"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <div className="flex items-center justify-between px-4 h-14">
          <Link
            href="/"
            onClick={handleLogoClick}
            className="flex items-center min-w-0 cursor-pointer hover:opacity-80 transition-opacity"
          >
            <div className="min-w-0">
              <span className="font-semibold text-[14px] text-foreground leading-tight block truncate" style={{ fontFamily: "Fraunces, serif", letterSpacing: "-0.01em" }}>
                PANS &amp; PANDAS
              </span>
              {childName && (
                <span className="text-[11px] font-medium truncate block" style={{ color: "var(--terracotta)" }}>
                  Tracking for {childName}
                </span>
              )}
            </div>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileOpen(!mobileOpen)}
            data-testid="mobile-menu-toggle"
            className="w-8 h-8 flex-shrink-0"
          >
            {mobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <>
          <div
            className="md:hidden fixed inset-0 bg-black/20 z-40"
            onClick={closeMobile}
          />
          <aside
            className="md:hidden fixed top-0 left-0 h-screen w-72 bg-sidebar border-r border-sidebar-border z-50 flex flex-col"
            style={{ paddingTop: "env(safe-area-inset-top)" }}
          >
            {navContent}
          </aside>
        </>
      )}
    </>
  );
}
