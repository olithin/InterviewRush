import { PageTitle } from "@/components/layout/page-title";
import { FlashcardDeck } from "@/components/flashcards/flashcard-deck";

export default function FlashcardsPage() {
  return (
    <div>
      <PageTitle title="Flashcards" subtitle="Quick concept recall to keep patterns fresh." />
      <FlashcardDeck />
    </div>
  );
}
