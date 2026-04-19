"use client";

import { useState } from "react";
import { RotateCcw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { flashcards } from "@/data/mock-data";

export function FlashcardDeck() {
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const current = flashcards[index];

  return (
    <div className="space-y-4">
      <Card className="bg-white/90">
        <CardHeader>
          <CardTitle>{current.topic}</CardTitle>
        </CardHeader>
        <CardContent>
          <button
            onClick={() => setFlipped((v) => !v)}
            className="w-full rounded-2xl border border-dashed p-8 text-left text-lg font-semibold hover:bg-muted"
          >
            {flipped ? current.back : current.front}
          </button>
        </CardContent>
      </Card>
      <div className="flex gap-2">
        <Button
          variant="secondary"
          onClick={() => {
            setFlipped(false);
            setIndex((i) => (i - 1 + flashcards.length) % flashcards.length);
          }}
        >
          Prev
        </Button>
        <Button
          onClick={() => {
            setFlipped(false);
            setIndex((i) => (i + 1) % flashcards.length);
          }}
        >
          Next
        </Button>
        <Button variant="ghost" onClick={() => setFlipped(false)}>
          <RotateCcw className="mr-1 h-4 w-4" /> Reset
        </Button>
      </div>
    </div>
  );
}
