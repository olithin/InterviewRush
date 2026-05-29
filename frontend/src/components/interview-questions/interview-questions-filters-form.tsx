import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { InterviewQuestionListQuery } from "@/lib/interview-question-types";

const inputClass =
  "input-clay rounded-xl border border-border/60 bg-white px-3 py-2 text-sm text-foreground shadow-clay-sm";

type Props = {
  categories: string[];
  current: InterviewQuestionListQuery;
};

function val(s: string | undefined): string {
  return s ?? "";
}

export function InterviewQuestionsFiltersForm({ categories, current }: Props) {
  return (
    <form
      method="get"
      className="mb-4 flex flex-col gap-3 rounded-2xl border border-border/60 bg-muted/20 p-4 shadow-clay-sm"
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
          Search
          <input
            name="q"
            className={cn(inputClass, "w-full min-w-0")}
            defaultValue={val(current.q)}
            placeholder="Title, text, notes…"
            aria-label="Search questions"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
          Category
          <select name="category" className={cn(inputClass, "w-full")} defaultValue={val(current.category)}>
            <option value="">(any)</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
          Level
          <select name="difficulty" className={cn(inputClass, "w-full")} defaultValue={val(current.difficulty)}>
            <option value="">(any)</option>
            <option value="Easy">Easy</option>
            <option value="Medium">Medium</option>
            <option value="Hard">Hard</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
          Tag
          <input
            name="tag"
            className={cn(inputClass, "w-full")}
            defaultValue={val(current.tag)}
            placeholder="Exact tag"
            aria-label="Filter by tag"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
          Sort
          <select name="sort" className={cn(inputClass, "w-full")} defaultValue={current.sort ?? "order"}>
            <option value="order">Manual order</option>
            <option value="title">Title</option>
            <option value="updated">Updated</option>
            <option value="category">Category</option>
            <option value="difficulty">Level</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
          Direction
          <select name="dir" className={cn(inputClass, "w-full")} defaultValue={current.dir ?? "asc"}>
            <option value="asc">Ascending</option>
            <option value="desc">Descending</option>
          </select>
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <label className="inline-flex items-center gap-2 text-sm text-muted-foreground">
          <input
            type="checkbox"
            name="publishedOnly"
            value="true"
            defaultChecked={!!current.publishedOnly}
            className="h-4 w-4 rounded border-border"
          />
          Published only
        </label>
        <label className="inline-flex items-center gap-2 text-sm text-muted-foreground">
          <input
            type="checkbox"
            name="includeInactive"
            value="true"
            defaultChecked={!!current.includeInactive}
            className="h-4 w-4 rounded border-border"
          />
          Include inactive
        </label>
        <Button type="submit" variant="default">
          Apply
        </Button>
        <Button type="button" variant="secondary" asChild>
          <Link href="/interview-questions">Reset</Link>
        </Button>
      </div>
    </form>
  );
}
