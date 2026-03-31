"use client";

import { useState, useTransition } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ArrowUp, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { inviteMember } from "@/app/actions/members";

interface OnboardingModalProps {
  projectId: string;
  isNew: boolean;
  onComplete: (message: string) => void;
}

const SUGGESTIONS = [
  {
    label: "Marketing Campaign",
    prompt:
      "Help me plan a marketing campaign. I want to brainstorm target audience, messaging, channels, and a timeline.",
  },
  {
    label: "New Business Idea",
    prompt:
      "I have a new business idea I want to explore. Help me think through the value proposition, target market, and first steps.",
  },
  {
    label: "School Project",
    prompt:
      "I'm working on a school project and need help organizing my research, outlining my approach, and structuring my deliverables.",
  },
];

export function OnboardingModal({
  projectId,
  isNew,
  onComplete,
}: OnboardingModalProps) {
  const [open, setOpen] = useState(isNew);
  const [input, setInput] = useState("");
  const [email, setEmail] = useState("");
  const [invitedEmails, setInvitedEmails] = useState<string[]>([]);
  const [isPending, startTransition] = useTransition();

  function handleSubmit() {
    const text = input.trim();
    if (!text) return;
    setOpen(false);
    onComplete(text);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) return;

    startTransition(async () => {
      const result = await inviteMember(projectId, trimmed);
      if (result.success) {
        toast.success(
          result.pending
            ? `Invite saved — ${trimmed} will get access when they sign up`
            : `${trimmed} now has access`
        );
        setInvitedEmails((prev) => [...prev, trimmed]);
        setEmail("");
      } else {
        toast.error(result.error);
      }
    });
  }

  function removeInvited(emailToRemove: string) {
    setInvitedEmails((prev) => prev.filter((e) => e !== emailToRemove));
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-lg" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>What are you working on?</DialogTitle>
          <DialogDescription>
            Start with a prompt and we'll create your first AI chat.
          </DialogDescription>
        </DialogHeader>

        {/* Section 1: First prompt */}
        <div className="space-y-3">
          <div className="relative">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Describe what you'd like to collaborate on..."
              className="min-h-[80px] max-h-[160px] resize-none text-sm pr-12"
              rows={3}
              autoFocus
            />
            <Button
              size="icon-xs"
              onClick={handleSubmit}
              disabled={!input.trim()}
              className="absolute right-2 bottom-2 h-7 w-7 rounded-md"
            >
              <ArrowUp className="h-3.5 w-3.5" />
            </Button>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {SUGGESTIONS.map((s) => (
              <button
                key={s.label}
                type="button"
                onClick={() => setInput(s.prompt)}
                className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors"
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-border" />

        {/* Section 2: Invite collaborators */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">
            Invite teammates (optional)
          </p>
          <form onSubmit={handleInvite} className="flex gap-2">
            <Input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1 h-8 text-sm"
            />
            <Button
              type="submit"
              size="sm"
              variant="outline"
              disabled={isPending || !email.trim()}
            >
              {isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                "Invite"
              )}
            </Button>
          </form>
          {invitedEmails.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {invitedEmails.map((e) => (
                <Badge key={e} variant="secondary" className="gap-1 text-[10px]">
                  {e}
                  <button
                    type="button"
                    onClick={() => removeInvited(e)}
                    className="hover:text-foreground"
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
