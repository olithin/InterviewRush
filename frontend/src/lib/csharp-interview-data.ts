/**
 * @deprecated The C# Interview tab now loads questions from the API (tag `csharp-interview-tab`)
 * via /interview/csharp. This file is only kept as a copy-paste reference for sample topics.
 */
import type { ProblemTeachingDetails, ProblemNavItem } from "@/lib/problem-types";

const emptyMental = {
  trigger: "",
  cue: "",
  script: "",
  trap: "",
  personalWords: "",
  interviewPhrase: ""
};

function d(p: Partial<ProblemTeachingDetails> & Pick<ProblemTeachingDetails, "id" | "title" | "statement">): ProblemTeachingDetails {
  return {
    howToThink: "",
    code: "",
    tests: "",
    pattern: "C#",
    wordingSignals: [],
    mnemonic: "",
    howToThinkSteps: [],
    bruteForceIdea: "",
    optimalIdea: "",
    algorithmSteps: [],
    visualExplanation: "",
    whyThisPattern: "",
    whyNotOtherPatterns: [],
    complexity: "",
    edgeCaseChecklist: [],
    commonMistakes: { critical: [], important: [], niceToHave: [] },
    gapHints: [],
    interviewEnglish: "",
    simpleRussian: "",
    mentalModel: { ...emptyMental },
    solutionTemplates: [],
    ...p
  };
}

/**
 * Local-only coach content for the C# interview tab (not loaded from the API).
 * IDs 1..n — used only on routes under /interview/csharp
 */
export const C_SHARP_INTERVIEW_TOPICS: ProblemTeachingDetails[] = [
  d({
    id: 1,
    title: "ref, out, in: что сказать на интервью",
    statement:
      "Interviewer: «Объясните, когда вы используете ref, out и in в C# и чем передача по ссылке отличается от значимых типов.»",
    wordingSignals: ["ref", "out", "in", "by reference", "passing parameters", "struct vs class"],
    mnemonic: "ref reads+writes, out writes only, in read-only and safe for struct",
    howToThinkSteps: [
      "Clarify: they mean the parameter kinds for methods, not `ref` locals.",
      "Start with default: value types are copied unless boxed/ref; `ref` aliases the caller's variable.",
      "`out`: must be assigned in the method; caller doesn't need to init (definite assignment).",
      "`in` (C# 7.2+): like `ref` but read-only; pairs with `readonly struct` to avoid large copies."
    ],
    whyThisPattern: "Classic language baseline — shows you know the CLR calling conventions and not only syntax.",
    algorithmSteps: [
      "Open with: default is pass-by-value for structs; `ref` avoids copy and allows mutation of caller storage.",
      "Contrast `out` with `return` when there are two or more outputs — mention Try-pattern.",
      "Mention in + readonly struct as performance hint for big structs and Span-friendly APIs — without over-claiming."
    ],
    commonMistakes: {
      critical: ["Saying 'ref = pointer' in an unsafe / C sense."],
      important: ["Forgetting that `out` parameters must be assigned in all code paths (compiler-enforced in modern C#)."],
      niceToHave: ["Briefly mention in parameters with optional parameters rules if asked."]
    },
    edgeCaseChecklist: ["`ref` to readonly field: allowed or not? (readonly context vs ref to member.)", "async: cannot use `out`/`ref` in the same way without limitations — only if they dig."],
    interviewEnglish:
      "I’d start by saying that in C# most parameters are passed by value: for structs that means a copy. I use `ref` when the method should read and write the caller’s variable through an alias, so I avoid copying a large struct or I need side effects on the caller’s storage. I use `out` when the method is responsible for definitely assigning a value and the pattern is like `TryParse`—the caller may not pre-initialize. I use `in` when I only need read access but still want to avoid a copy, often with a `readonly struct`. I’d avoid calling `ref` a pointer—it’s a managed reference under the rules of definite assignment and safety.",
    simpleRussian:
      "По умолчанию — копия для структур; `ref` — псевдоним в памяти вызывающего (читать/писать). `out` — метод **обязан** присвоить; часто `Try*`. `in` — только чтение без лишнего копирования, часто вместе с `readonly struct`.",
    mentalModel: {
      trigger: "ref / out / in / passing structs",
      cue: "Default copy → ref alias → out must assign → in read cheap",
      script: "Name default → ref read/write alias → out Try-pattern → in + readonly for big struct",
      trap: "Упоминать указатели C/C++; путать `out` с необязательным присваиванием",
      personalWords: "",
      interviewPhrase: "Default pass-by-value; ref is an alias; out means I assign; in is read-only pass-by reference."
    }
  }),
  d({
    id: 2,
    title: "IDisposable, using, IAsyncDisposable",
    statement:
      "Interviewer: «Как в .NET освобождать неуправляемые и управляемые ресурсы? Расскажите про `using` и `IAsyncDisposable`.»",
    wordingSignals: ["IDisposable", "Dispose", "using", "using declaration", "finally", "file stream", "IAsyncDisposable"],
    mnemonic: "Dispose pairs with acquisition; using is syntactic; async dispose for I/O",
    howToThinkSteps: [
      "Split: deterministic vs finalization (`Finalize` is a last resort).",
      "Show the `using` statement as `try/finally` with `Dispose()`.",
      "If .NET 6+ / async streams: `await using` for `IAsyncDisposable`."
    ],
    whyThisPattern: "Resource hygiene is a daily topic in C# service and I/O code.",
    algorithmSteps: [
      "1) Say `IDisposable` is for `Dispose()` to free unmanaged and managed held resources early.",
      "2) `using` and `using var` map to `Dispose` in `finally` — exceptions safe.",
      "3) `IAsyncDisposable` for types where async cleanup matters (e.g. async streams).",
      "4) Mention you prefer not relying on a finalizer except for native interop."
    ],
    whyNotOtherPatterns: ["GC alone for sockets/files (non-deterministic release)."],
    commonMistakes: {
      critical: ["Not disposing a `FileStream` in long loops — file locks."],
      important: ["Double dispose — but `Dispose` should be idempotent; still avoid confusion."],
      niceToHave: ["Link to `using` with nullable reference analysis if they ask C# 8+."]
    },
    edgeCaseChecklist: ["`Dispose` throwing — patterns with try/finally still correct?", "`ConfigureAwait` irrelevant for dispose, but show awareness of context in UI apps if asked."],
    interviewEnglish:
      "I treat anything that holds unmanaged or precious managed resources as something that should be released deterministically. I implement or use `IDisposable` and wrap acquisition in `using` or `using var` so that `Dispose` runs on success or exception. For types that need asynchronous teardown—some streams or adapters—I use `IAsyncDisposable` and `await using`. I still understand that the GC can collect managed objects, but I don’t rely on finalizers for file handles, sockets, or database connections.",
    simpleRussian:
      "Ресурсы освобождаем **явно** через `Dispose`: `using` = `try/finally`. Для асинхронного снятия — `IAsyncDisposable` и `await using`.",
    mentalModel: {
      trigger: "Dispose / using / file / stream / socket",
      cue: "try/finally → Dispose, async path → await using",
      script: "Identify resource → using block → if async, IAsyncDisposable",
      trap: "Полагаться на GC для файла/сокета; забыть `await` в `await using`",
      personalWords: "",
      interviewPhrase: "Deterministic cleanup with IDisposable; using for try/finally; await using when async disposal matters."
    }
  }),
  d({
    id: 3,
    title: "async / await: контекст синхронизации и отмена",
    statement: "Interviewer: «Когда нужен `ConfigureAwait`, что такое SynchronizationContext, и как передавать `CancellationToken`?»",
    wordingSignals: ["async", "await", "Task", "ConfigureAwait", "deadlock", "CancellationToken", "IAsyncEnumerable"],
    mnemonic: "await resumes; ConfigureAwait for library vs app; pass token to APIs",
    howToThinkSteps: [
      "Separate app code (UI) vs library code: different ConfigureAwait rules.",
      "Mention that `async void` is only for event handlers — otherwise `Task`/`Task<T>`.",
      "Cancellation: cooperative; check token or pass through."
    ],
    whyThisPattern: "Almost every C# role touches async; interviewers probe for real pitfalls, not keywords.",
    algorithmSteps: [
      "1) `async/await` compiles to state machine; exceptions captured on `Task`.",
      "2) In UI (WPF, MAUI) sync context matters for marshaling; in libraries, `ConfigureAwait(false)` historically avoided deadlocks in sync-over-async.",
      "3) Propagate `CancellationToken` to I/O; use `WithCancellation` on IAsyncEnumerable in modern C#."
    ],
    commonMistakes: {
      critical: ["`async void` in production methods — impossible to await/fail in a controlled way."],
      important: ["Blocking on `.Result` / `.Wait()` in a context that will resume on the same thread — deadlock."],
      niceToHave: ["Mention that ConfigureAwait is less of a default rule in .NET Core for libraries if no sync context, but you still know the reason."]
    },
    edgeCaseChecklist: ["`Task.Run` for CPU vs `async` I/O", "ValueTask: when to avoid allocations — only if they ask for depth."],
    interviewEnglish:
      "I use `async`/`await` so that I/O and other awaitables don’t block threads and so exceptions flow through the returned `Task`. In UI apps I’m aware a synchronization context can marshal continuations back to the UI thread; in library code I used to be careful with `ConfigureAwait(false)` to avoid certain deadlock patterns when the caller mixed sync and async. I pass `CancellationToken` into I/O and long-running work so the caller can cancel cooperatively, and I avoid `async void` except in event handlers where the signature requires it.",
    simpleRussian:
      "`async/await` — state machine, исключения на `Task`. В UI важен контекст. В библиотеках — знать, зачем `ConfigureAwait(false)` и мёртвые блокировки. `CancellationToken` — совместно отменять I/O.",
    mentalModel: {
      trigger: "async / await / ConfigureAwait / deadlock",
      cue: "Task not thread; context for UI; token through I/O",
      script: "Async for I/O → avoid block → pass CancellationToken → library vs UI rules",
      trap: "async void; .Result on UI context",
      personalWords: "",
      interviewPhrase: "Async I/O on Task, cooperative cancellation, understand sync context for UI vs library."
    }
  }),
  d({
    id: 4,
    title: "Nullable reference types и null-forgiving",
    statement:
      "Interviewer: «Как в C# 8+ nullable reference types помогают с `null`? Когда уместен `!`?»",
    wordingSignals: ["nullable reference types", "null-forgiving", "NRT", "?", "string?", "nullability"],
    mnemonic: "Annotations express intent; ! means I assert to compiler, not a runtime check",
    howToThinkSteps: [
      "Explain project-level opt-in: nullable context + annotations.",
      "Contrast `string` vs `string?` in meaning for consumers.",
      "Use `!` sparingly: after a check, or when API is wrong, with a short comment as needed."
    ],
    whyThisPattern: "Modern C# codebases use NRT; shows you can talk about type safety, not just syntax.",
    algorithmSteps: [
      "1) Enable NRT: compiler warnings for possible null deref; still not a full proof system for all APIs.",
      "2) `string?` = may be null; `string` in nullable context = non-null in intent.",
      "3) `!` = null-forgiving: tells compiler to trust; pair with a comment or a guard.",
      "4) Helper attributes: `NotNullIfNotNull`, `MemberNotNull` for patterns — if interview goes deeper."
    ],
    commonMistakes: {
      critical: ["Treating NRT as runtime enforcement — it’s mostly compile-time."],
      important: ["Sprinkling `!` everywhere instead of better APIs or `ArgumentNullException.ThrowIfNull`."],
      niceToHave: ["Mixing old libraries without annotations — you know warnings may be false positives and use pragmas or nullability attributes carefully."]
    },
    edgeCaseChecklist: ["Generics: `T?` means different things for class vs struct constraints."],
    interviewEnglish:
      "With nullable reference types, I treat `string?` as part of the contract: it may be null, so callers and methods check or use APIs like `string.IsNullOrEmpty`. I use the null-forgiving operator only when I have a reason the compiler can’t see—right after a guard, a well-known pattern, or legacy interop—and I don’t use it to silence warnings without understanding. I know the compiler warnings help, but I still run tests because nullability is a static analysis feature, not a full runtime null checker for every case.",
    simpleRussian:
      "NRT — про договорённости о `null` на этапе компиляции. `!` — «я несу ответственность, компилятор, поверь», не магия в рантайме.",
    mentalModel: {
      trigger: "nullable, NRT, string?, null-forgiving",
      cue: "Intent in types, prove with checks, ! only when I assert",
      script: "Nullable annotations → read API → check orThrow → use ! rarely with reason",
      trap: "Думать, что NRT = не будет null в рантайме; злоупотреблять `!`",
      personalWords: "",
      interviewPhrase: "NRT documents null intent; the null-forgiving operator is a compiler trust signal, not a runtime guard."
    }
  })
];

export function getCSharpInterviewNavItems(): ProblemNavItem[] {
  return C_SHARP_INTERVIEW_TOPICS.map((t) => ({
    id: t.id,
    title: t.title,
    pattern: t.pattern,
    difficulty: "Medium" as const,
    solved: false
  }));
}

export function getCSharpInterviewDetailsById(id: number): ProblemTeachingDetails {
  const found = C_SHARP_INTERVIEW_TOPICS.find((t) => t.id === id);
  if (found) {
    return found;
  }
  return C_SHARP_INTERVIEW_TOPICS[0]!;
}
