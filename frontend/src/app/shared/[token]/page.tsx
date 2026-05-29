"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { BookOpen, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  getSharedContent,
  saveUserContent,
  type SharedContent,
  type SharedContentItem
} from "@/lib/user-content-api";

export default function SharedPage() {
  const { token } = useParams<{ token: string }>();
  const { data: session } = useSession();
  const userId = session?.user?.email ?? "";

  const [content, setContent] = useState<SharedContent | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  // Track which items have been saved to "my notes" so the button shows feedback.
  const [savedIds, setSavedIds] = useState<Set<number>>(new Set());
  const [savingId, setSavingId] = useState<number | null>(null);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    getSharedContent(token)
      .then((d) => {
        setContent(d);
        setLoading(false);
      })
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : "Failed to load shared content.");
        setLoading(false);
      });
  }, [token]);

  async function handleSave(item: SharedContentItem) {
    if (!userId) return;
    setSavingId(item.itemId);
    try {
      await saveUserContent(userId, item.itemType as "interview-question" | "problem", item.itemId, {
        myAnswer: item.myAnswer,
        myNotes: item.myNotes
      });
      setSavedIds((prev) => new Set(prev).add(item.itemId));
    } catch {
      // Non-fatal: button just resets.
    } finally {
      setSavingId(null);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !content) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <p className="text-destructive">{error ?? "Share link not found."}</p>
      </div>
    );
  }

  const isOwner = userId && userId === content.ownerUserId;

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-10">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Shared answers</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Shared by{" "}
          <span className="font-medium text-foreground">{content.ownerUserId}</span>
          {" · "}
          {content.items.length} item{content.items.length !== 1 ? "s" : ""}
        </p>
      </div>

      {content.items.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            No answers have been saved for this link yet.
          </CardContent>
        </Card>
      ) : (
        content.items.map((item) => (
          <SharedItemCard
            key={`${item.itemType}-${item.itemId}`}
            item={item}
            canSave={Boolean(userId) && !isOwner}
            isSaving={savingId === item.itemId}
            isSaved={savedIds.has(item.itemId)}
            onSave={handleSave}
          />
        ))
      )}
    </div>
  );
}

function SharedItemCard({
  item,
  canSave,
  isSaving,
  isSaved,
  onSave
}: {
  item: SharedContentItem;
  canSave: boolean;
  isSaving: boolean;
  isSaved: boolean;
  onSave: (item: SharedContentItem) => void;
}) {
  const displayTitle =
    item.itemTitle?.trim() ||
    `${item.itemType === "interview-question" ? "Interview question" : "Problem"} #${item.itemId}`;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base leading-snug">{displayTitle}</CardTitle>
          {canSave ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => onSave(item)}
              disabled={isSaving || isSaved}
            >
              {isSaving ? (
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
              ) : isSaved ? (
                <Check className="mr-1 h-3 w-3 text-emerald-600" />
              ) : (
                <BookOpen className="mr-1 h-3 w-3" />
              )}
              {isSaved ? "Saved to my notes" : "Save to my notes"}
            </Button>
          ) : null}
        </div>
        <p className="text-xs text-muted-foreground">
          Updated{" "}
          {new Date(item.updatedAtUtc + "Z").toLocaleDateString("en-GB", {
            year: "numeric",
            month: "short",
            day: "numeric"
          })}
        </p>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        {item.myAnswer ? (
          <div>
            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Answer</p>
            <div
              className={cn(
                "whitespace-pre-wrap rounded-xl bg-[hsl(40,22%,91%)] p-3",
                "text-sm leading-relaxed text-foreground shadow-clay-inset"
              )}
            >
              {item.myAnswer}
            </div>
          </div>
        ) : null}
        {item.myNotes ? (
          <div>
            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Notes</p>
            <div
              className={cn(
                "whitespace-pre-wrap rounded-xl bg-[hsl(40,22%,91%)] p-3",
                "text-sm leading-relaxed text-foreground shadow-clay-inset"
              )}
            >
              {item.myNotes}
            </div>
          </div>
        ) : null}
        {!item.myAnswer && !item.myNotes ? (
          <p className="text-sm text-muted-foreground">No content.</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
