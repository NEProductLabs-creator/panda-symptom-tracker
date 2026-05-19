import { useState } from "react";
import { Settings2, User, Home, School, Plus, X, Save, CheckCircle2, Trash2, LogOut } from "lucide-react";
import { useAppSettings } from "@/hooks/useAppSettings";
import { useChildBaseline } from "@/hooks/useChildBaseline";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

type DiagnosisStatus = "confirmed" | "suspected" | "exploring" | "";

const DIAGNOSIS_OPTIONS: { value: DiagnosisStatus; label: string }[] = [
  { value: "confirmed", label: "Confirmed PANS or PANDAS" },
  { value: "suspected", label: "Suspected" },
  { value: "exploring", label: "Still exploring" },
];

function SectionCard({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-border/60">
        <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
          <Icon className="w-4 h-4 text-primary" />
        </div>
        <h2
          className="text-sm font-bold text-foreground"
          style={{ fontFamily: "Outfit, sans-serif" }}
        >
          {title}
        </h2>
      </div>
      <div className="px-5 py-4 space-y-4">{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </label>
      {children}
    </div>
  );
}

export default function Settings() {
  const { settings, saveSettings } = useAppSettings();
  const { baseline, saveBaseline } = useChildBaseline();
  const { toast } = useToast();
  const { signOut } = useAuth();

  // Child section
  const [childName, setChildName] = useState(baseline?.childName ?? "");
  const [childAge, setChildAge] = useState(baseline?.childAge ?? "");
  const [diagnosis, setDiagnosis] = useState<DiagnosisStatus>(settings.diagnosisStatus);
  const [childDesc, setChildDesc] = useState(baseline?.description ?? "");

  // Household section
  const [members, setMembers] = useState<string[]>(settings.householdMembers);
  const [memberInput, setMemberInput] = useState("");

  // School section
  const [teacherName, setTeacherName] = useState(settings.teacherName);
  const [schoolName, setSchoolName] = useState(settings.schoolName);

  function saveChild() {
    saveBaseline({
      ...(baseline ?? {
        sleepHours: "",
        appetite: "",
        activityLevel: "moderate" as const,
        socialBehavior: "",
        schoolPerformance: "",
        behavioralNotes: "",
        lastUpdated: new Date().toISOString(),
      }),
      childName,
      childAge,
      description: childDesc,
      lastUpdated: new Date().toISOString(),
    });
    saveSettings({ diagnosisStatus: diagnosis });
    toast({ title: "Child profile saved" });
  }

  function addMember() {
    const v = memberInput.trim();
    if (v && !members.includes(v)) {
      const next = [...members, v];
      setMembers(next);
      saveSettings({ householdMembers: next });
      setMemberInput("");
    }
  }

  function removeMember(name: string) {
    const next = members.filter((m) => m !== name);
    setMembers(next);
    saveSettings({ householdMembers: next });
  }

  function saveSchool() {
    saveSettings({ teacherName, schoolName });
    toast({ title: "School information saved" });
  }

  function clearAllData() {
    if (!window.confirm("This will permanently delete all app data on this device. Are you sure?")) return;

    const keys = [
      "pans_tracker_symptom_logs",
      "pans_tracker_sb_migrated_v1",
      "pans_tracker_medications",
      "pans_tracker_med_library",
      "pans_tracker_milestones",
      "childBaseline",
      "ptecLog",
      "flareHistory",
      "triggerLog",
      "householdHealthLog",
      "pans_tracker_school_hub",
      "pans_tracker_wellbeing",
      "pans_tracker_hopeboard",
      "pans_tracker_settings",
      "pans_tracker_visited",
    ];
    keys.forEach((k) => localStorage.removeItem(k));
    window.location.href = "/";
  }

  return (
    <div className="p-5 md:p-8 max-w-2xl mx-auto space-y-5 pb-12">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
          <Settings2 className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1
            className="text-2xl font-bold text-foreground"
            style={{ fontFamily: "Outfit, sans-serif" }}
          >
            Settings
          </h1>
          <p className="text-sm text-muted-foreground">Your profile and preferences</p>
        </div>
      </div>

      {/* Child profile */}
      <SectionCard icon={User} title="Your Child">
        <Field label="First name">
          <Input
            value={childName}
            onChange={(e) => setChildName(e.target.value)}
            placeholder="e.g. Emma"
            data-testid="settings-child-name"
          />
        </Field>

        <Field label="Age">
          <Input
            value={childAge}
            onChange={(e) => setChildAge(e.target.value)}
            placeholder="e.g. 9"
            type="number"
            min={1}
            max={25}
          />
        </Field>

        <Field label="Where are you in the journey?">
          <div className="grid grid-cols-1 gap-2">
            {DIAGNOSIS_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setDiagnosis(opt.value)}
                className={`text-left px-3 py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${
                  diagnosis === opt.value
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border hover:border-primary/40 text-foreground hover:bg-accent"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Who are they when well? (short description)">
          <Textarea
            value={childDesc}
            onChange={(e) => setChildDesc(e.target.value)}
            placeholder="Describe your child at their best — personality, energy, school, social life..."
            className="resize-none h-24 text-sm"
          />
          <p className="text-xs text-muted-foreground">
            You can fill in sleep, appetite, school performance, and more from <strong>My Child</strong>.
          </p>
        </Field>

        <Button onClick={saveChild} className="w-full gap-2">
          <Save className="w-4 h-4" />
          Save child profile
        </Button>
      </SectionCard>

      {/* Household */}
      <SectionCard icon={Home} title="Household Members">
        <p className="text-xs text-muted-foreground leading-relaxed">
          Used in the Household Health log to track when family members get sick — helpful for
          identifying illness triggers.
        </p>

        <div className="flex gap-2">
          <Input
            value={memberInput}
            onChange={(e) => setMemberInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addMember();
              }
            }}
            placeholder="e.g. Mom, Dad, Jake..."
            data-testid="settings-member-input"
          />
          <Button type="button" variant="outline" size="icon" onClick={addMember}>
            <Plus className="w-4 h-4" />
          </Button>
        </div>

        {members.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {members.map((m) => (
              <div
                key={m}
                className="flex items-center gap-1.5 bg-primary/10 text-primary rounded-full px-3 py-1 text-sm font-medium"
              >
                {m}
                <button
                  type="button"
                  onClick={() => removeMember(m)}
                  className="hover:text-destructive transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground italic">No household members added yet.</p>
        )}
      </SectionCard>

      {/* School contact */}
      <SectionCard icon={School} title="School Contact">
        <p className="text-xs text-muted-foreground leading-relaxed">
          Used to auto-fill school communication letters in the Doctor Ready section.
        </p>

        <Field label="Teacher's name">
          <Input
            value={teacherName}
            onChange={(e) => setTeacherName(e.target.value)}
            placeholder="e.g. Ms. Johnson"
            data-testid="settings-teacher-name"
          />
        </Field>

        <Field label="School name">
          <Input
            value={schoolName}
            onChange={(e) => setSchoolName(e.target.value)}
            placeholder="e.g. Lincoln Elementary"
            data-testid="settings-school-name"
          />
        </Field>

        <Button onClick={saveSchool} className="w-full gap-2">
          <Save className="w-4 h-4" />
          Save school information
        </Button>
      </SectionCard>

      {/* Data + privacy */}
      <div className="rounded-2xl border border-border/60 bg-muted/30 px-5 py-4 space-y-3">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-green-500" />
          <p className="text-sm font-semibold text-foreground">All data stays on your device</p>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Nothing in this app is ever sent to a server. All your logs, medications, and notes are
          stored only in this browser's local storage. If you clear browser data or switch devices,
          you'll start fresh.
        </p>
        <button
          type="button"
          onClick={clearAllData}
          className="flex items-center gap-2 text-xs text-destructive hover:text-destructive/80 font-medium transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Clear all app data
        </button>
        <button
          type="button"
          onClick={() => signOut()}
          className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground font-medium transition-colors"
          data-testid="settings-sign-out"
        >
          <LogOut className="w-3.5 h-3.5" />
          Sign out
        </button>
      </div>
    </div>
  );
}
