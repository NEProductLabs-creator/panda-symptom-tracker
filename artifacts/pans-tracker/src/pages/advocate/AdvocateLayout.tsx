import type { ReactNode } from "react";
import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";

interface Props {
  title: string;
  subtitle?: string;
  children: ReactNode;
}

export default function AdvocateLayout({ title, subtitle, children }: Props) {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-5 py-10">
        <Link href="/advocate">
          <span className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer mb-8">
            <ArrowLeft className="w-3.5 h-3.5" />
            Advocate
          </span>
        </Link>
        <div className="mb-8">
          <h1
            className="text-[28px] font-bold text-foreground leading-tight"
            style={{ fontFamily: "Newsreader, serif" }}
          >
            {title}
          </h1>
          {subtitle && (
            <p className="mt-2 text-[15px] text-muted-foreground leading-[1.7]">
              {subtitle}
            </p>
          )}
        </div>
        <div>{children}</div>
      </div>
    </div>
  );
}
