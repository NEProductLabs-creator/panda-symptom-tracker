import { useState } from "react";
import {
  Settings2, User, Home, School, Plus, X, Save, Users, ChevronRight,
} from "lucide-react";
import { Link } from "wouter";
import { useAppSettings } from "@/hooks/useAppSettings";
import { useChildBaseline } from "@/hooks/useChildBaseline";
import { useChildren } from "@/hooks/useChildren";
import { track } from "@/lib/analytics";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { SectionCard, Field } from "@/components/settings/shared";
import SettingsNotifications from "@/components/settings/SettingsNotifications";
import SettingsShares from "@/components/settings/SettingsShares";
import SettingsAccount from "@/components/settings/SettingsAccount";

type DiagnosisStatus = "confirmed" | "suspected" | "exploring" | "";

const DIAGNOSIS_OPTIONS: { value: DiagnosisStatus; label: string }[] = [
  { value: "confirmed", label: "Confirmed PANS or PANDAS" },
  { value: "suspected", label: "Suspected" },
  { value: "exploring", label: "Still exploring" },
];

export default function Settings() {
  const { settings, saveSettings } = useAppSettings();
  const { baseline, saveBaseline } = useChildBaseline();
  const { data: children = [] } = useChildren();
  const { toast } = useToast();

  const [savedChild, setSavedChild] = useState(false);
  const [savedSchool, setSavedSchool] = useState(false);

  // Child section — name/age fields removed (managed in /settings/children)
  const [diagnosis, setDiagnosis] = useState<DiagnosisStatus>(settings.diagnosisStatus);
  const [childDesc, setChildDesc] = useState(baseline?.description ?? "");

  // Household section
  const [members, setMembers] = useState<string[]>(settings.householdMembers);
  const [memberInput, setMemberInput] = useState("");

  // School section
  const [teacherName, setTeacherName] = useState(settings.teacherName);
  const [schoolName, setSchoolName] = useState(settings.schoolName);

  function saveChild() {
    try {
      saveBaseline({
        ...(baseline ?? {
          childName: "",
          childAge: "",
          sleepHours: "",
          appetite: "",
          activityLevel: "moderate" as const,
          socialBehavior: "",
          schoolPerformance: "",
          behavioralNotes: "",
          lastUpdated: new Date().toISOString(),
        }),
        description: childDesc,
        lastUpdated: new Date().toISOString(),
      });
      saveSettings({ diagnosisStatus: diagnosis });
      setSavedChild(true);
      toast({ title: "Profile saved", variant: "success" });
      setTimeout(() => setSavedChild(false), 1500);
    } catch {
      toast({ title: "Couldn't save — please try again", variant: "destructive" });
    }
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
    try {
      saveSettings({ teacherName, schoolName });
      setSavedSchool(true);
      toast({ title: "School information saved", variant: "success" });
      setTimeout(() => setSavedSchool(false), 1500);
    } catch {
      toast({ title: "Couldn't save — please try again", variant: "destructive" });
    }
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
            style={{ fontFamily: "Fraunces, serif" }}
          >
            Settings
          </h1>
          <p className="text-sm text-muted-foreground">Your profile and preferences</p>
        </div>
      </div>

      {/* Children summary card */}
      <SectionCard icon={Users} title="Your children">
        <div className="flex items-center justify-between gap-3 py-1">
          <p className="text-sm text-muted-foreground">
            {children.length === 0
              ? "No children added yet."
              : children.length === 1
              ? `1 child tracked`
              : `${children.length} children tracked`}
          </p>
          <Link
            href="/settings/children"
            onClick={() => track("settings_children_clicked", { source: "settings_page" })}
          >
            <button
              type="button"
              className="flex items-center gap-1 text-sm font-medium text-primary hover:underline"
            >
              {children.length === 0 ? "Add a child" : "Manage"}
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </Link>
        </div>
      </SectionCard>

      {/* Diagnosis & description */}
      <SectionCard icon={User} title="Journey & Profile">
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
          {savedChild ? "Saved ✓" : "Save child profile"}
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
          {savedSchool ? "Saved ✓" : "Save school information"}
        </Button>
      </SectionCard>

      <SettingsNotifications />
      <SettingsShares />
      <SettingsAccount />
    </div>
  );
}
