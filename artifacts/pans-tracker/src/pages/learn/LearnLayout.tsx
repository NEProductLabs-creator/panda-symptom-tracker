import type { ReactNode } from "react";
import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";

interface Props {
  title: string;
  subtitle?: string;
  children: ReactNode;
}

/**
 * Shared wrapper for all /learn/* sub-pages.
 * Provides back-breadcrumb, Newsreader heading, and a readable max-width column.
 */
export default function LearnLayout({ title, subtitle, children }: Props) {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-5 py-10">
        {/* Breadcrumb */}
        <Link href="/learn">
          <span className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer mb-8">
            <ArrowLeft className="w-3.5 h-3.5" />
            Learn
          </span>
        </Link>

        {/* Page heading */}
        <div className="mb-8">
          <h1
            className="text-3xl font-bold text-foreground leading-tight"
            style={{ fontFamily: "Newsreader, serif" }}
          >
            {title}
          </h1>
          {subtitle && (
            <p className="mt-2 text-base text-muted-foreground leading-relaxed">
              {subtitle}
            </p>
          )}
        </div>

        {/* Page content */}
        <div>{children}</div>
      </div>
    </div>
  );
}
