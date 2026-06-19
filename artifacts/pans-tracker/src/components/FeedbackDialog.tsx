import { useState } from "react";
import emailjs from "@emailjs/browser";
import { useUser } from "@/hooks/useSupabaseAuth";
import { MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

const SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID as string | undefined;
const TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID as string | undefined;
const PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY as string | undefined;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function FeedbackDialog({ open, onOpenChange }: Props) {
  const { user } = useUser();
  const { toast } = useToast();
  const [feedback, setFeedback] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const userEmail = user?.email ?? "unknown@unknown.com";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!feedback.trim()) return;

    if (!SERVICE_ID || !TEMPLATE_ID || !PUBLIC_KEY) {
      toast({
        title: "Configuration missing",
        description:
          "EmailJS credentials are not set. Please contact the app administrator.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      await emailjs.send(
        SERVICE_ID,
        TEMPLATE_ID,
        {
          user_email: userEmail,
          feedback_text: feedback.trim(),
        },
        { publicKey: PUBLIC_KEY }
      );
      toast({
        title: "Feedback sent!",
        description:
          "Thank you for submitting feedback! It will help us make the app better for everyone.",
      });
      setFeedback("");
      onOpenChange(false);
    } catch {
      toast({
        title: "Couldn't send feedback",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md overflow-x-hidden">
        <DialogHeader>
          <DialogTitle
            className="flex items-center gap-2"
            style={{ fontFamily: "Fraunces, serif" }}
          >
            <MessageSquare className="w-4 h-4" style={{ color: "var(--terracotta)" }} />
            Send Feedback
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-1">
          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">
              Your feedback
            </Label>
            <Textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="What's working well? What could be better? Any features you'd love to see?"
              className="min-h-[140px] resize-none text-sm leading-relaxed"
              required
              autoFocus
            />
          </div>

          <p className="text-[11px] text-muted-foreground leading-snug">
            Sent from <span className="font-medium">{userEmail}</span>
          </p>

          <DialogFooter className="gap-2 pt-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={submitting || !feedback.trim()}
              style={{ backgroundColor: "var(--terracotta)", color: "white" }}
            >
              {submitting ? "Sending…" : "Send Feedback"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
