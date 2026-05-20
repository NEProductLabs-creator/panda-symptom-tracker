import { useState, useEffect, useMemo, useCallback } from "react";
import { format } from "date-fns";
import { useSymptomLogs } from "@/hooks/useSymptomLogs";
import { useChildBaseline } from "@/hooks/useChildBaseline";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  ClipboardCopy,
  Mail,
  RotateCcw,
  Save,
  ChevronDown,
  ChevronUp,
  UserCheck,
  AlertTriangle,
  FileText,
  BookOpen,
  Users,
  CheckCircle2,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type TemplateKey = "intro" | "flare" | "plan_504" | "homework" | "substitute";

interface HubSettings {
  teacherName: string;
  teacherEmail: string;
  schoolName: string;
  parentName: string;
  parentContact: string;
}

interface HubStorage {
  settings: HubSettings;
  savedTemplates: Partial<Record<TemplateKey, string>>;
}

const STORAGE_KEY = "pans_tracker_school_hub";

const DEFAULT_SETTINGS: HubSettings = {
  teacherName: "",
  teacherEmail: "",
  schoolName: "",
  parentName: "",
  parentContact: "",
};

// ─── Template metadata ────────────────────────────────────────────────────────

const TEMPLATE_META: {
  key: TemplateKey;
  label: string;
  description: string;
  icon: React.ElementType;
  emailSubject: (child: string) => string;
}[] = [
  {
    key: "intro",
    label: "Intro to Teacher",
    description:
      "Explains PANS/PANDAS, what the teacher may observe, and how to respond helpfully during a hard moment.",
    icon: UserCheck,
    emailSubject: (c) => `About ${c} — PANS/PANDAS Introduction`,
  },
  {
    key: "flare",
    label: "Flare Notification",
    description:
      "A brief heads-up when a flare is active. Auto-fills your child's top current symptoms from the latest log entry.",
    icon: AlertTriangle,
    emailSubject: (c) => `${c} is experiencing a PANS/PANDAS flare`,
  },
  {
    key: "plan_504",
    label: "504 / IEP Request",
    description:
      "Requests formal academic accommodations and explains why they qualify under Section 504.",
    icon: FileText,
    emailSubject: (c) => `Request for 504/IEP Accommodations — ${c}`,
  },
  {
    key: "homework",
    label: "Homework Flexibility",
    description:
      "Politely requests reduced homework or extended deadlines during an active flare.",
    icon: BookOpen,
    emailSubject: (c) => `Temporary Homework Flexibility Request — ${c}`,
  },
  {
    key: "substitute",
    label: "Substitute Briefing",
    description:
      "A short, clear note for a substitute teacher explaining what to do if your child has a difficult moment.",
    icon: Users,
    emailSubject: (c) => `Important — Please Read Before Class: ${c}`,
  },
];

// ─── Symptom → classroom behavior map ────────────────────────────────────────

const SYMPTOM_DESC: Record<string, string> = {
  ocd: "OCD-like rituals or intrusive thoughts that interrupt focus",
  anxiety: "Heightened anxiety, separation distress, or frequent reassurance-seeking",
  rage: "Emotional dysregulation — outbursts that may seem out of proportion to the situation",
  tics: "Physical or vocal tics that they cannot control",
  sleep: "Significant fatigue and difficulty staying alert from disrupted sleep",
  cognition:
    "Brain fog, slower processing speed, or trouble following multi-step directions",
};

// ─── Template generators ──────────────────────────────────────────────────────

function makeIntro(child: string, teacher: string, school: string, parent: string, contact: string): string {
  const date = format(new Date(), "MMMM d, yyyy");
  const t = teacher || "[Teacher Name]";
  const c = child || "[Child Name]";
  const p = parent || "[Parent Name]";
  const ct = contact || "[Phone / Email]";
  const s = school ? ` at ${school}` : "";

  return `${date}

Dear ${t},

My name is ${p}, and I am the parent of ${c}, who is in your class this year${s}. I wanted to take a moment to introduce you to a medical condition that ${c} has been diagnosed with, as it may occasionally affect their behavior and performance at school.

${c} has been diagnosed with PANS (Pediatric Acute-onset Neuropsychiatric Syndrome). PANS is caused by an abnormal immune response that affects the brain. During difficult periods — called flares — ${c} may experience sudden changes in behavior, mood, or cognitive function that are not within their control. These episodes are neurological in nature, not behavioral choices.

During a flare, you may notice:
• Increased anxiety, clinginess, or difficulty separating from me at drop-off
• Emotional outbursts or tearfulness that seem out of proportion to the situation
• Difficulty concentrating, brain fog, or trouble completing work they normally handle easily
• Obsessive-compulsive thoughts or rituals that interrupt their day
• Irritability or a sudden shift in personality that is unlike their usual self
• Changes in handwriting or fine motor skills

What helps most in those moments:
• A calm, low-pressure tone — your voice is one of the most powerful tools
• Permission to take a brief sensory break without making it a big deal
• Reduced expectations for the day without shame or penalty
• A quiet space to regulate if they become overwhelmed
• A quick text or email to me if you notice a significant change

We are actively working with ${c}'s medical team, and we are so grateful to have you as their teacher this year. Please know you can always reach out to me with questions. I am happy to share additional resources about PANS/PANDAS if that would be helpful.

Thank you so much for your care and understanding.

Warmly,
${p}
${ct}`;
}

function makeFlare(child: string, teacher: string, parent: string, contact: string, topSymptoms: string[]): string {
  const date = format(new Date(), "MMMM d, yyyy");
  const t = teacher || "[Teacher Name]";
  const c = child || "[Child Name]";
  const p = parent || "[Parent Name]";
  const ct = contact || "[Phone / Email]";

  const symptomList =
    topSymptoms.length > 0
      ? topSymptoms.map((s) => `• ${s}`).join("\n")
      : "• [Please describe active symptoms here]";

  return `${date}

Dear ${t},

I wanted to give you a quick heads-up that ${c} is currently experiencing a PANS/PANDAS flare. This means their immune system is triggering an inflammatory response that affects their brain, and we are actively managing it with their medical team.

Over the next few days — possibly longer — ${c} may show some of the following in the classroom:

${symptomList}

Please know that these responses are medical, not behavioral. ${c} is not choosing to act this way, and consequences or pressure are unlikely to help — they often make things worse.

Things that tend to help:
• A calm, patient tone from you (it makes more difference than you know)
• Lower academic expectations without calling attention to it
• Access to a quiet space or a brief break if they become dysregulated
• A note to me if the day feels particularly hard

We are monitoring closely and will keep you updated as things improve. Please don't hesitate to reach out if you have any questions or concerns — I always want to know how ${c} is doing at school.

Thank you for being such an incredible support to our family.

Warmly,
${p}
${ct}`;
}

function make504(child: string, teacher: string, school: string, parent: string, contact: string): string {
  const date = format(new Date(), "MMMM d, yyyy");
  const t = teacher || "[Teacher / Principal Name]";
  const c = child || "[Child Name]";
  const p = parent || "[Parent Name]";
  const ct = contact || "[Phone / Email]";
  const s = school || "[School Name]";

  return `${date}

Dear ${t} and the Team at ${s},

I am writing to formally request that ${c} be considered for a 504 Plan (or IEP evaluation) to support their access to education. ${c} has been diagnosed with PANS (Pediatric Acute-onset Neuropsychiatric Syndrome), a recognized neurological condition that qualifies as a disability under Section 504 of the Rehabilitation Act and the Americans with Disabilities Act.

PANS/PANDAS causes episodic neurological inflammation that can significantly impair ${c}'s ability to learn, focus, regulate emotions, and complete academic work — particularly during flare periods. These episodes are unpredictable, recurring, and entirely medical in nature. Without appropriate accommodations, ${c} is at risk of falling behind academically, experiencing school avoidance, and facing disciplinary action for symptoms that are outside their control.

Accommodations we are requesting for consideration:
• Extended time on tests and assignments (1.5x or 2x)
• Reduced homework load during documented medical flares
• Flexible or extended deadlines without academic penalty
• Permission for frequent movement breaks
• Access to a quiet, low-stimulation testing or work environment
• Flexible attendance policy during documented medical episodes
• Digital alternatives to handwriting when motor symptoms are present
• No academic penalty for work missed during medically documented absences
• A check-in system with a trusted staff member each day

I am prepared to provide documentation from ${c}'s treating physician and am happy to meet at your earliest convenience to discuss these accommodations. I believe that with the right support in place, ${c} can thrive at ${s}.

Thank you for taking this request seriously. I look forward to working with you as partners in ${c}'s education.

Sincerely,
${p}
${ct}`;
}

function makeHomework(child: string, teacher: string, parent: string, contact: string): string {
  const date = format(new Date(), "MMMM d, yyyy");
  const t = teacher || "[Teacher Name]";
  const c = child || "[Child Name]";
  const p = parent || "[Parent Name]";
  const ct = contact || "[Phone / Email]";

  return `${date}

Dear ${t},

I hope you are doing well. I am writing to let you know that ${c} is currently going through a difficult period with their PANS/PANDAS, and I wanted to reach out and request some temporary academic flexibility while they recover.

During an active flare, ${c}'s brain is under significant neurological stress. By the end of the school day, they are often completely depleted — completing homework in the evenings becomes extremely difficult, and sometimes impossible. We have found that pushing through it tends to worsen symptoms rather than help. Our evenings are focused on rest, regulation, and recovery.

If possible, we would greatly appreciate one or more of the following for the next 1–2 weeks:
• A reduced homework load (even 50% would make a meaningful difference)
• Extended deadlines on any current or upcoming assignments
• No late penalties for work impacted by this flare period

Please know that ${c} loves learning and will make every effort to catch up as they improve. This is not a permanent request — just some breathing room while they are unwell. I will keep you updated on how things are going and will let you know when they are feeling more like themselves.

Thank you so much for your compassion and flexibility. It genuinely means the world to our family.

Warmly,
${p}
${ct}`;
}

function makeSubstitute(child: string, teacher: string, parent: string, contact: string): string {
  const t = teacher || "[Regular Teacher Name]";
  const c = child || "[Child Name]";
  const p = parent || "[Parent Name]";
  const ct = contact || "[Phone / Email]";

  return `Hello,

Thank you for being here today. This is a brief note about one of the students in this class: ${c}.

${c} has a medical condition called PANS/PANDAS — a neurological condition where their immune system can affect their brain. This is not a behavior problem. During hard moments, ${c} may seem anxious, tearful, withdrawn, or unable to focus. These responses are medical, and they are not choosing them.

IF ${c.toUpperCase()} HAS A DIFFICULT MOMENT:
• Stay calm — your tone matters a great deal
• Speak softly and avoid public attention on them
• Give them space without pressure or ultimatums
• Offer a quiet break or a walk to the hallway
• Do not escalate or apply consequences

WHAT HELPS:
• A calm, low-key acknowledgment ("I can see you're having a hard time — that's okay")
• Reducing demands temporarily ("You don't have to do this right now")
• Letting them sit somewhere quiet if possible

WHO TO CONTACT:
• Regular teacher: ${t}
• Parent/Guardian: ${p} — ${ct}

Please call or text ${ct} immediately if ${c} seems in significant distress or you need guidance. I will always respond quickly.

Thank you so much for your patience with ${c} today. It makes a real difference.

— ${p}`;
}

// ─── Load / save storage ──────────────────────────────────────────────────────

function loadStorage(): HubStorage {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { settings: DEFAULT_SETTINGS, savedTemplates: {} };
}

function saveStorage(data: HubStorage) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function SchoolHub() {
  const { logs } = useSymptomLogs();
  const { baseline } = useChildBaseline();
  const { toast } = useToast();

  const stored = useMemo(() => loadStorage(), []);

  const [settings, setSettings] = useState<HubSettings>(stored.settings);
  const [savedTemplates, setSavedTemplates] = useState<Partial<Record<TemplateKey, string>>>(
    stored.savedTemplates
  );
  const [activeKey, setActiveKey] = useState<TemplateKey>("intro");
  const [draft, setDraft] = useState<Partial<Record<TemplateKey, string>>>({});
  const [settingsOpen, setSettingsOpen] = useState(
    !stored.settings.teacherName && !stored.settings.parentName
  );
  const [justSaved, setJustSaved] = useState(false);

  // Child name from baseline
  const childName = baseline?.childName?.trim() || "";

  // Top 3 active symptoms from most recent log
  const topSymptoms = useMemo(() => {
    if (logs.length === 0) return [];
    const recent = [...logs].sort((a, b) => b.date.localeCompare(a.date))[0];
    const cats = (["ocd", "anxiety", "rage", "tics", "sleep", "cognition"] as const)
      .map((k) => ({ key: k, score: recent[k] }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
    return cats.map((x) => SYMPTOM_DESC[x.key]);
  }, [logs]);

  // Generate default template text for a given key
  const generateDefault = useCallback(
    (key: TemplateKey): string => {
      const { teacherName, schoolName, parentName, parentContact } = settings;
      const c = childName;
      switch (key) {
        case "intro":
          return makeIntro(c, teacherName, schoolName, parentName, parentContact);
        case "flare":
          return makeFlare(c, teacherName, parentName, parentContact, topSymptoms);
        case "plan_504":
          return make504(c, teacherName, schoolName, parentName, parentContact);
        case "homework":
          return makeHomework(c, teacherName, parentName, parentContact);
        case "substitute":
          return makeSubstitute(c, teacherName, parentName, parentContact);
      }
    },
    [settings, childName, topSymptoms]
  );

  // Current text for a template: draft → saved → generated default
  const getText = useCallback(
    (key: TemplateKey): string => {
      return draft[key] ?? savedTemplates[key] ?? generateDefault(key);
    },
    [draft, savedTemplates, generateDefault]
  );

  // Active template text
  const activeText = getText(activeKey);
  const meta = TEMPLATE_META.find((t) => t.key === activeKey)!;

  // Persist settings changes
  function updateSettings(patch: Partial<HubSettings>) {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      saveStorage({ settings: next, savedTemplates });
      return next;
    });
    // Clear drafts so they regenerate with new settings
    setDraft({});
  }

  // Handle tab switch — flush current draft
  function switchTemplate(key: TemplateKey) {
    setActiveKey(key);
    setJustSaved(false);
  }

  // Save current draft
  function saveDraft() {
    const next = { ...savedTemplates, [activeKey]: activeText };
    setSavedTemplates(next);
    saveStorage({ settings, savedTemplates: next });
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 2000);
    toast({ title: "Letter saved", description: "Your edits will be here next time." });
  }

  // Reset to generated default
  function resetToDefault() {
    setDraft((prev) => {
      const next = { ...prev };
      delete next[activeKey];
      return next;
    });
    setSavedTemplates((prev) => {
      const next = { ...prev };
      delete next[activeKey];
      const storage = loadStorage();
      delete storage.savedTemplates[activeKey];
      saveStorage({ settings, savedTemplates: next });
      return next;
    });
    toast({ title: "Reset to default" });
  }

  // Copy to clipboard
  async function copyText() {
    try {
      await navigator.clipboard.writeText(activeText);
      toast({ title: "Copied to clipboard", description: "Paste into your email or portal." });
    } catch {
      toast({ title: "Copy failed", variant: "destructive" });
    }
  }

  // Open in Mail
  function openMail() {
    const subject = encodeURIComponent(meta.emailSubject(childName || "My Child"));
    const body = encodeURIComponent(activeText);
    const to = settings.teacherEmail ? encodeURIComponent(settings.teacherEmail) : "";
    window.open(`mailto:${to}?subject=${subject}&body=${body}`, "_blank");
  }

  return (
    <div className="p-5 md:p-8 max-w-3xl mx-auto space-y-5 pb-12">
      {/* Header */}
      <div>
        <h1
          className="text-2xl font-bold text-foreground"
          style={{ fontFamily: "Fraunces, serif" }}
        >
          School Communication Hub
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Pre-written letters for the situations PANS/PANDAS families face most — fully editable before you send.
        </p>
      </div>

      {/* Settings */}
      <Card className="border-border shadow-sm">
        <button
          type="button"
          className="w-full flex items-center justify-between px-5 py-3.5 text-left"
          onClick={() => setSettingsOpen((o) => !o)}
        >
          <span className="text-sm font-semibold text-foreground" style={{ fontFamily: "Fraunces, serif" }}>
            Letter Settings
          </span>
          <div className="flex items-center gap-2">
            {settings.teacherName && (
              <span className="text-[11px] text-muted-foreground">
                {settings.teacherName}{settings.schoolName ? ` · ${settings.schoolName}` : ""}
              </span>
            )}
            {settingsOpen ? (
              <ChevronUp className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            )}
          </div>
        </button>

        {settingsOpen && (
          <CardContent className="pt-0 pb-5 border-t border-border">
            <p className="text-xs text-muted-foreground mt-3 mb-4">
              These fields auto-populate into every letter. Fill them in once and they'll be remembered.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Teacher Name
                </Label>
                <Input
                  value={settings.teacherName}
                  onChange={(e) => updateSettings({ teacherName: e.target.value })}
                  placeholder="Ms. Johnson"
                  data-testid="input-teacher-name"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Teacher Email
                </Label>
                <Input
                  type="email"
                  value={settings.teacherEmail}
                  onChange={(e) => updateSettings({ teacherEmail: e.target.value })}
                  placeholder="teacher@school.edu"
                  data-testid="input-teacher-email"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  School Name
                </Label>
                <Input
                  value={settings.schoolName}
                  onChange={(e) => updateSettings({ schoolName: e.target.value })}
                  placeholder="Lincoln Elementary"
                  data-testid="input-school-name"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Your Name
                </Label>
                <Input
                  value={settings.parentName}
                  onChange={(e) => updateSettings({ parentName: e.target.value })}
                  placeholder="Alex Smith"
                  data-testid="input-parent-name"
                />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Your Contact (phone or email)
                </Label>
                <Input
                  value={settings.parentContact}
                  onChange={(e) => updateSettings({ parentContact: e.target.value })}
                  placeholder="555-867-5309 or parent@email.com"
                  data-testid="input-parent-contact"
                />
              </div>
            </div>
            {childName && (
              <p className="text-xs text-muted-foreground mt-3">
                Child name pulled from My Child profile:{" "}
                <span className="font-semibold text-foreground">{childName}</span>
              </p>
            )}
            {!childName && (
              <p className="text-xs text-amber-600 mt-3">
                No child name set — add it under My Child in the sidebar so it auto-populates.
              </p>
            )}
          </CardContent>
        )}
      </Card>

      {/* Template tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {TEMPLATE_META.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => switchTemplate(key)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium whitespace-nowrap flex-shrink-0 transition-all ${
              activeKey === key
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
            }`}
            data-testid={`tab-${key}`}
          >
            <Icon className="w-3.5 h-3.5 flex-shrink-0" />
            {label}
          </button>
        ))}
      </div>

      {/* Template card */}
      <Card className="border-border shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <CardTitle
                className="text-base font-semibold"
                style={{ fontFamily: "Fraunces, serif" }}
              >
                {meta.label}
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-0.5">{meta.description}</p>
            </div>
            {activeKey === "flare" && topSymptoms.length > 0 && (
              <div className="flex-shrink-0 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 max-w-[200px]">
                <p className="text-[10px] font-semibold text-amber-700 uppercase tracking-wide mb-1">
                  Auto-pulled from latest log
                </p>
                {topSymptoms.map((s, i) => (
                  <p key={i} className="text-[10px] text-amber-800 leading-tight">• {s}</p>
                ))}
              </div>
            )}
          </div>

          {/* Tone guidance */}
          <div className="mt-2 px-3 py-2 rounded-lg bg-muted/60 border border-border">
            <p className="text-[11px] text-muted-foreground italic">
              This letter is written to be warm but taken seriously. Edit freely to match your voice.
            </p>
          </div>
        </CardHeader>

        <CardContent className="pt-0 space-y-3">
          <Textarea
            value={activeText}
            onChange={(e) =>
              setDraft((prev) => ({ ...prev, [activeKey]: e.target.value }))
            }
            className="min-h-[420px] text-sm font-mono leading-relaxed resize-y"
            data-testid="textarea-template"
          />

          {/* Saved indicator */}
          {savedTemplates[activeKey] && !draft[activeKey] && (
            <p className="text-[11px] text-green-600 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              Showing your saved version
            </p>
          )}

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Button
              size="sm"
              onClick={copyText}
              className="gap-1.5"
              data-testid="button-copy"
            >
              <ClipboardCopy className="w-3.5 h-3.5" />
              Copy to Clipboard
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={openMail}
              className="gap-1.5"
              data-testid="button-mail"
            >
              <Mail className="w-3.5 h-3.5" />
              Open in Mail
            </Button>

            <Button
              size="sm"
              variant={justSaved ? "default" : "outline"}
              onClick={saveDraft}
              className={`gap-1.5 ${justSaved ? "bg-green-600 hover:bg-green-700 border-green-600" : ""}`}
              data-testid="button-save"
            >
              {justSaved ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Saved!
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  Save for Next Time
                </>
              )}
            </Button>

            <Button
              size="sm"
              variant="ghost"
              onClick={resetToDefault}
              className="gap-1.5 text-muted-foreground ml-auto"
              data-testid="button-reset"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset to Default
            </Button>
          </div>

          {settings.teacherEmail && (
            <p className="text-[11px] text-muted-foreground">
              "Open in Mail" will pre-address to{" "}
              <span className="font-medium">{settings.teacherEmail}</span>. Note: very long emails may be
              truncated by some clients — copy to clipboard if so.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
