import { useState } from "react";
import { Bell } from "lucide-react";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { SectionCard, Field } from "./shared";

export default function SettingsNotifications() {
  const { toast } = useToast();
  const push = usePushNotifications();
  const [localReminderTime, setLocalReminderTime] = useState(push.reminderTime);

  return (
    <SectionCard icon={Bell} title="Reminders">
      <p className="text-xs text-muted-foreground leading-relaxed">
        Get a daily push notification when it's time to log.
        Requires the app to be installed on your home screen (iOS 16.4+ or Android).
      </p>

      {!push.isSupported ? (
        <p className="text-xs text-amber-600 font-medium">
          Push notifications aren&apos;t supported on this browser. Install the app and try again.
        </p>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-foreground">Daily logging reminder</p>
              <p className="text-xs text-muted-foreground">
                Notified once per day if you haven&apos;t logged yet
              </p>
            </div>
            <Switch
              checked={push.isEnabled}
              disabled={push.isLoading}
              onCheckedChange={async (checked) => {
                if (checked) {
                  try {
                    await push.enable(localReminderTime);
                    toast({ title: "Reminders enabled", variant: "success" });
                  } catch {
                    toast({
                      title: "Couldn't enable notifications",
                      description: "Check your browser's notification permissions.",
                      variant: "destructive",
                    });
                  }
                } else {
                  await push.disable();
                  toast({ title: "Reminders disabled" });
                }
              }}
            />
          </div>

          {push.isEnabled && (
            <Field label="Reminder time">
              <Input
                type="time"
                value={localReminderTime}
                onChange={(e) => {
                  setLocalReminderTime(e.target.value);
                  void push.setReminderTime(e.target.value);
                }}
                className="max-w-[130px]"
              />
            </Field>
          )}

          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-foreground">Inactivity nudge</p>
              <p className="text-xs text-muted-foreground">
                A gentle check-in after 5 days without logging
              </p>
            </div>
            <Switch
              checked={push.inactivityEnabled}
              disabled={push.isLoading || !push.isEnabled}
              onCheckedChange={(checked) => {
                void push.setInactivityNudge(checked);
              }}
            />
          </div>
        </div>
      )}
    </SectionCard>
  );
}
