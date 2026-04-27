"use client";

import { useEffect, useMemo, useState } from "react";
import { RotateCcw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getFlashcards } from "@/lib/api";

export type Flashcard = {
  id: number;
  topic: string;
  category: string;
  front: string;
  back: string;
};

type CardResult = "known" | "repeat";

export function FlashcardDeck() {
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Indices of cards in current round queue.
  const [queue, setQueue] = useState<number[]>([]);
  const [pos, setPos] = useState(0);
  const [results, setResults] = useState<Record<number, CardResult>>({});
  const [round, setRound] = useState(1);
  const [roundDone, setRoundDone] = useState(false);
  const [flipped, setFlipped] = useState(false);

  useEffect(() => {
    let active = true;
    getFlashcards()
      .then((data) => {
        if (!active) return;
        const loaded = data.map((c) => ({
          id: c.id,
          topic: c.topic,
          category: c.category,
          front: c.front,
          back: c.back
        }));
        setCards(loaded);
        setQueue(loaded.map((_, i) => i));
        setPos(0);
      })
      .catch((err) => {
        if (!active) return;
        setError(err.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  const currentCard = queue.length > 0 && pos < queue.length ? cards[queue[pos]] : null;

  const knownCount = useMemo(() => Object.values(results).filter((r) => r === "known").length, [results]);
  const repeatCount = useMemo(() => Object.values(results).filter((r) => r === "repeat").length, [results]);

  function mark(result: CardResult) {
    if (!currentCard) return;
    const idx = queue[pos];
    setResults((prev) => ({ ...prev, [idx]: result }));
    const nextPos = pos + 1;
    if (nextPos >= queue.length) {
      setRoundDone(true);
    } else {
      setPos(nextPos);
      setFlipped(false);
    }
  }

  function startRepeatRound() {
    const repeatIndices = queue.filter((idx) => results[idx] === "repeat");
    if (repeatIndices.length === 0) return;
    setQueue(repeatIndices);
    setPos(0);
    setResults({});
    setRound((r) => r + 1);
    setRoundDone(false);
    setFlipped(false);
  }

  function restart() {
    setQueue(cards.map((_, i) => i));
    setPos(0);
    setResults({});
    setRound(1);
    setRoundDone(false);
    setFlipped(false);
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading flashcards…</p>;
  }

  if (error) {
    return <p className="text-sm text-rose-500">{error}</p>;
  }

  if (!cards.length) {
    return <p className="text-sm text-muted-foreground">No flashcards available.</p>;
  }

  // Round complete screen.
  if (roundDone) {
    const allDone = repeatCount === 0;
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>{allDone ? "All done! 🎉" : `Round ${round} complete`}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-3">
              <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
                ✓ Known: {knownCount}
              </Badge>
              <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">
                ↩ Repeat: {repeatCount}
              </Badge>
            </div>
            {allDone ? (
              <p className="text-sm text-muted-foreground">
                You marked all {knownCount} card{knownCount !== 1 ? "s" : ""} as known. Start over to review again.
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                {repeatCount} card{repeatCount !== 1 ? "s" : ""} to repeat. Keep going!
              </p>
            )}
          </CardContent>
        </Card>
        <div className="flex gap-2">
          {repeatCount > 0 ? (
            <Button onClick={startRepeatRound}>
              Repeat {repeatCount} card{repeatCount !== 1 ? "s" : ""} →
            </Button>
          ) : null}
          <Button variant="secondary" onClick={restart}>
            <RotateCcw className="mr-1 h-4 w-4" /> Start over
          </Button>
        </div>
      </div>
    );
  }

  const progress = pos + 1;
  const total = queue.length;

  return (
    <div className="space-y-4">
      {/* Progress line */}
      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        <span>Card {progress} of {total}</span>
        {round > 1 ? <Badge variant="secondary">Round {round}</Badge> : null}
        {knownCount > 0 ? (
          <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">✓ {knownCount}</Badge>
        ) : null}
        {repeatCount > 0 ? (
          <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">↩ {repeatCount}</Badge>
        ) : null}
        {/* thin progress bar */}
        <div className="ml-auto h-1.5 w-32 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${Math.round((pos / total) * 100)}%` }}
          />
        </div>
      </div>

      {/* Card — click to flip */}
      <button
        type="button"
        onClick={() => setFlipped((v) => !v)}
        className="w-full text-left"
        aria-label={flipped ? "Show front" : "Reveal back"}
      >
        <Card className={cn("transition-shadow hover:shadow-md", flipped && "border-primary/40 bg-primary/5")}>
          <CardHeader>
            <CardTitle>{currentCard?.topic}</CardTitle>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {currentCard?.category}
            </p>
          </CardHeader>
          <CardContent>
            {flipped ? (
              <p className="min-h-[5rem] whitespace-pre-wrap text-base font-medium leading-relaxed">
                {currentCard?.back}
              </p>
            ) : (
              <div className="flex min-h-[5rem] items-center">
                <p className="text-lg font-semibold">{currentCard?.front}</p>
              </div>
            )}
            {!flipped ? (
              <p className="mt-3 text-xs text-muted-foreground">Tap to reveal answer</p>
            ) : (
              <p className="mt-3 text-xs text-muted-foreground">Tap to flip back</p>
            )}
          </CardContent>
        </Card>
      </button>

      {/* Action buttons — only active after flip */}
      <div className="flex gap-2">
        <Button
          variant="secondary"
          className="flex-1 border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100"
          onClick={() => mark("repeat")}
          disabled={!flipped}
          title="Add to repeat queue"
        >
          ↩ Повторить
        </Button>
        <Button
          className="flex-1 bg-emerald-600 text-white hover:bg-emerald-700"
          onClick={() => mark("known")}
          disabled={!flipped}
          title="Mark as known"
        >
          ✓ Знаю
        </Button>
      </div>
      {!flipped ? (
        <p className="text-center text-xs text-muted-foreground">Flip the card first, then mark it.</p>
      ) : null}
    </div>
  );
}
