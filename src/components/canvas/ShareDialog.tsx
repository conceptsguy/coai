"use client";

import { useState, useTransition } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Users, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  inviteMember,
  removeMember,
  getMembers,
  type MemberInfo,
} from "@/app/actions/members";

interface ShareDialogProps {
  projectId: string;
}

function getInitials(name: string | null, email: string): string {
  if (name) {
    return name
      .split(" ")
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }
  return email.slice(0, 2).toUpperCase();
}

export function ShareDialog({ projectId }: ShareDialogProps) {
  const [open, setOpen] = useState(false);
  const [members, setMembers] = useState<MemberInfo[]>([]);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [isPending, startTransition] = useTransition();

  async function loadMembers() {
    setLoading(true);
    const data = await getMembers(projectId);
    setMembers(data);
    setLoading(false);
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      loadMembers();
    }
  }

  async function handleInvite(e: React.FormEvent) {
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
        setEmail("");
        await loadMembers();
      } else {
        toast.error(result.error);
      }
    });
  }

  async function handleRemove(member: MemberInfo) {
    startTransition(async () => {
      const result = await removeMember(projectId, member.id);
      if (result.success) {
        toast.success(`Removed ${member.email}`);
        await loadMembers();
      } else {
        toast.error(result.error ?? "Failed to remove");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <Button variant="ghost" size="sm" className="gap-1.5">
            <Users className="h-3.5 w-3.5" />
            <span>Share</span>
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share Canvas</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleInvite} className="flex gap-2">
          <Input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="flex-1 h-8 text-sm"
          />
          <Button type="submit" size="sm" disabled={isPending || !email.trim()}>
            {isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              "Invite"
            )}
          </Button>
        </form>

        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">Members</p>
          {loading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-0.5">
              {members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted/50"
                >
                  <Avatar className="h-6 w-6 text-[10px]">
                    <AvatarFallback className={member.isPending ? "bg-muted text-muted-foreground" : ""}>
                      {member.isPending
                        ? "?"
                        : getInitials(member.displayName, member.email)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm truncate block">
                      {member.displayName ?? member.email}
                    </span>
                    {member.displayName && (
                      <span className="text-xs text-muted-foreground truncate block">
                        {member.email}
                      </span>
                    )}
                  </div>
                  {member.isPending && (
                    <Badge variant="secondary" className="text-[10px] shrink-0">
                      Pending
                    </Badge>
                  )}
                  <Badge
                    variant="secondary"
                    className="text-[10px] capitalize shrink-0"
                  >
                    {member.role}
                  </Badge>
                  {member.role !== "owner" && (
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => handleRemove(member)}
                      disabled={isPending}
                      className="shrink-0 text-muted-foreground hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
