import { Link } from "wouter";
import {
  Megaphone, FileText, MessageSquare, GraduationCap, Map, ChevronRight,
} from "lucide-react";

const SECTIONS = [
  {
    href: "/advocate/reports",
    icon: FileText,
    title: "Reports for your appointment",
    description:
      "Three PDF variants — first appointment, ER visit, or follow-up with your PANS provider. Generated locally from your tracked data.",
  },
  {
    href: "/advocate/scripts",
    icon: MessageSquare,
    title: "Scripts for hard conversations",
    description:
      "Copy-ready language for dismissive doctors, neurology referrals, school accommodations, and family members who don't believe PANS is real.",
  },
  {
    href: "/advocate/school",
    icon: GraduationCap,
    title: "School communication templates",
    description:
      "Five email templates for teachers and school staff — intro to PANS, flare notification, 504 request, homework flexibility, and substitute briefing.",
  },
  {
    href: "/advocate/providers",
    icon: Map,
    title: "Provider directory",
    description:
      "Find a PANS-literate clinician near you via the PANDAS Physicians Network. Tips on what to look for, including telehealth options.",
  },
];

export default function Advocate() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-xl mx-auto px-5 py-12">

        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center mb-6"
          style={{ backgroundColor: "hsl(var(--primary) / 0.12)" }}
        >
          <Megaphone className="w-6 h-6" style={{ color: "var(--terracotta)" }} />
        </div>

        <h1
          className="text-[32px] font-bold text-foreground leading-snug mb-4"
          style={{ fontFamily: "Newsreader, serif" }}
        >
          Advocacy toolkit
        </h1>

        <p className="text-[17px] text-muted-foreground leading-[1.75] mb-10 max-w-md">
          Language, documents, and tools to help you communicate with doctors, hospitals,
          schools, and family — so you can be your child's most confident advocate.
        </p>

        <div className="flex flex-col gap-3">
          {SECTIONS.map(({ href, icon: Icon, title, description }) => (
            <Link key={href} href={href}>
              <div className="group flex items-start gap-4 p-5 bg-card rounded-2xl border-2 border-border hover:border-primary/40 hover:shadow-sm transition-all cursor-pointer">
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors group-hover:bg-primary/10"
                  style={{ backgroundColor: "hsl(var(--primary) / 0.08)" }}
                >
                  <Icon className="w-5 h-5" style={{ color: "var(--terracotta)" }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className="font-semibold text-[15px] text-foreground leading-snug"
                    style={{ fontFamily: "Newsreader, serif" }}
                  >
                    {title}
                  </p>
                  <p className="text-[13px] text-muted-foreground mt-1 leading-relaxed">
                    {description}
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-1 group-hover:text-foreground transition-colors" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
