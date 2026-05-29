namespace QAQuest.Api.Seed;

/// <summary>
/// Demo interview copy for each leaf in the C# 2026 knowledge-map starter tree. Keys must match
/// the titles used in the seed C# 2026 tree (BuildCsharp2026Seed).
/// </summary>
public static class KnowledgeMapDemoContent
{
    public const string TagDemo = "demo";
    public const string TagKnowledgeMap = "knowledge-map";
    public const string TagCSharpTab = "csharp-interview-tab";

    public sealed record LeafDemo(
        string Category,
        string QuestionText,
        string AnswerEnglish,
        string AnswerRussian,
        string MemoryCue,
        string CommonTrap,
        IReadOnlyList<string> FollowUps);

    private static readonly Dictionary<string, LeafDemo> ByTitle = new(StringComparer.Ordinal)
    {
        [".NET Platform & Runtime"] = new LeafDemo(
            ".NET Platform & Runtime",
            "What is the difference between the .NET runtime, the BCL, and a target framework (net8.0, netstandard2.0)?",
            "The runtime (CLR) executes your IL, handles GC, type safety, and JIT. The Base Class Library is the built-in class library. A target TFM (e.g. net8.0) picks which API surface and runtime pack you build and run on; netstandard is a *contract* of APIs shared across runtimes, not a runtime by itself. Mention that deployment can be self-contained vs framework-dependent.",
            "CLR выполняет IL, BCL — стандартная библиотека, TFM выбирает API и пакет рантайма. netstandard — контракт API между платформами, а не «ещё одна .NET на диске».",
            "CLR = run · BCL = lib · TFM = what you build against",
            "Confusing netstandard2.0 with a concrete runtime (it’s not; you need a real runtime to host).",
            new[]
            {
                "How do Native AOT and trimming relate to the runtime you ship?",
                "What breaks if you retarget a library from netstandard2.0 to net8.0?"
            }),

        ["Type System & Data Structures"] = new LeafDemo(
            "Type System & Data Structures",
            "What are value types vs reference types in C#, and when does boxing happen?",
            "structs/enums/nullable value types (T?) live on the stack or inline in objects; class/array/delegate on the managed heap. Assignment copies bits for value types, copies references for reference types. Boxing wraps a value type in a heap object (object) when you assign to `object` or a non-generic interface. Unboxing is the reverse and can throw if the runtime type is wrong.",
            "Значимые — копируются по значению, ссылочные — по ссылке. Boxing — обёртка struct в object на куче; unboxing с проверкой типа.",
            "Stack/heap hand-wavy → say «storage location + copy semantics + boxing sites»",
            "Claiming 'structs are always on the stack' — they can be fields of a class, part of an array, etc.",
            new[]
            {
                "What is a ref struct and what constraints do they have?",
                "When is `==` for strings not reference equality?"
            }),

        ["Encapsulation: Access modifiers"] = new LeafDemo(
            "Object-Oriented Programming",
            "How do C# access modifiers (private, protected, internal, public, protected internal, private protected) support encapsulation in libraries vs inheritance?",
            "`private` limits visibility to the type; `protected` to derived types; `internal` to the same assembly; `public` to everyone. `protected internal` is union, `private protected` is intersection. Encapsulation means exposing a stable public surface and hiding invariants: keep fields private, expose members that preserve invariants, use `internal` for test/build helpers if needed.",
            "Модификаторы ограничивают видимость. Инкапсуляция — сокрытие внутренностей: приватные поля, публичные методы, инварианты.",
            "Who can read/write · assembly boundary · derived-only hooks",
            "Using `public` on fields by habit — breaks invariants; prefer properties.",
            new[] { "Why are explicit interface implementations 'hidden'?", "File-scoped types (C# 11) and encapsulation" }),

        ["Polymorphism: Virtual & override"] = new LeafDemo(
            "Object-Oriented Programming",
            "Explain virtual methods, override, new (hide), and how vtables work at a high level in C#.",
            "Virtual + override enables runtime dispatch: the most derived override wins, even through a base reference. The `new` keyword hides a base member without virtual dispatch — easy footgun. At a high level, instance methods have a slot; virtual methods consult the object's actual type. Sealed on override stops further override.",
            "virtual/override = полиморфизм; new скрывает без виртуального вызова. sealed запрещает дальнейший override.",
            "Base ref → derived override, not the static type",
            "Using `new` on a method and expecting polymorphic behavior through a base type.",
            new[] { "What is a covariant return type in override?", "Abstract override vs interface default methods in other languages" }),

        ["Inheritance: Base & derived"] = new LeafDemo(
            "Object-Oriented Programming",
            "How does single inheritance in C# affect design? When would you prefer composition or interfaces over deep hierarchies?",
            "C# allows single implementation inheritance; multiple *interface* inheritance. Favor small base classes, push variability into interface strategies, avoid deep trees. `base(...)` for ctor chaining, `sealed` to stop unintended derivation. Liskov: substitutability; don’t break expectations in derived types.",
            "Одна база, много интерфейсов. Глубокие иерархии часто ломают LSP — предпочтите композицию/стратегии.",
            "is-a once · contracts via interfaces",
            "God Object base class with shared state and ten responsibilities.",
            new[] { "What is a fragile base class problem?", "When to use `protected` setters" }),

        ["Interfaces: Capabilities contract"] = new LeafDemo(
            "Object-Oriented Programming",
            "What are interfaces in C# for, and what changed with default interface methods in modern C#?",
            "An interface is a *contract* of members an implementing type must provide, prefer composition of capabilities over inheritance. Default interface implementations (C# 8+) allow optional members on the interface with a body; you still can’t have instance fields, only static fields. You use explicit impl to disambiguate.",
            "Интерфейс — набор обязанностей. Default implementation даёт тело, но с ограничениями, без полей экземпляра.",
            "CAN-DO, not IS-A in the inheritance sense",
            "Forgetting explicit implementation when two interfaces share the same member signature without default.",
            new[] { "IAsyncDisposable and disposal patterns", "How does DI use interfaces" }),

        ["Abstract Classes: Shared state"] = new LeafDemo(
            "Object-Oriented Programming",
            "When do you use an abstract class instead of an interface, and can you combine both?",
            "Abstract class when you have shared *state* or a common implementation skeleton; cannot be instantiated. Interfaces focus on the contract. A type can inherit one abstract class and many interfaces. Abstract can hold fields; default interface members don’t have instance state.",
            "Абстрактный класс — общая логика/состояние, интерфейс — требования. Сочетать можно.",
            "Shared ctor logic · template method pattern",
            "Putting a huge shared state bag in a single abstract class.",
            new[] { "How does record inheritance differ vs class?", "sealed class vs abstract" }),

        ["Properties: Controlled access"] = new LeafDemo(
            "Object-Oriented Programming",
            "How do C# properties differ from fields, and what are get-only, init, and required properties in modern C#?",
            "Properties are method pairs behind syntactic sugar; you can add validation, logging, and change access levels per accessor. `get; private set;` is common, `init` for immutability after object initializer, `required` to force the caller to set. Auto-properties compile to a backing field.",
            "Свойства = методы get/set, не поле. init и required помогают с неизменяемостью и инициализацией.",
            "Invariants in setter — not in every caller",
            "Exposing a public mutable list property without a defensive copy or wrapper.",
            new[] { "What is a property with `field` keyword (C# 13) about?", "Expression-bodied properties" }),

        ["Constructors: Chaining & Initialization"] = new LeafDemo(
            "Object-Oriented Programming",
            "What is constructor chaining, primary constructors (C# 12), and static constructors?",
            "`this()` / `base()` delegate common initialization. Primary constructors (C# 12) can capture parameters as fields. Static constructors run once per type before any static use, thread-safe by CLR. Finalizers are separate from `IDisposable` — prefer `using` + deterministic cleanup.",
            "Цепочка this/base, primary constructor, статический конструктор один раз, потокобезопасно.",
            "One canonical ctor path — no duplicated rules",
            "Throwing in static ctor — `TypeInitializationException` forever.",
            new[] { "How does `field` interact with init-only props?", "async constructors — why not" }),

        ["Static Members: Type-level state"] = new LeafDemo(
            "Object-Oriented Programming",
            "What is static in C#—what is shared, what cannot be static, and thread safety pitfalls?",
            "Static members belong to the type, not an instance. Static classes cannot be instantiated, only static members. Beware: mutable static state is a global variable—race conditions unless you guard with locks or use `Interlocked` / `Concurrent*`.",
            "Статика — на уровне типа, общая на все экземпляры; изменяемая статика = глобальное состояние и гонки.",
            "per-type singleton vs instance fields",
            "Mutable static `List<T>` in ASP.NET app without synchronization.",
            new[] { "When to use [ThreadStatic]?", "const vs static readonly" }),

        ["Advanced Logic & Concurrency"] = new LeafDemo(
            "Advanced Logic & Concurrency",
            "Compare async/await, thread pool, and Task. What is ConfigureAwait(false) and when is it used?",
            "async/await compiles to a state machine; it doesn’t create a new thread for each `await`—I/O can release the thread. `Task` represents work, often scheduled on the thread pool. `ConfigureAwait(false)` avoids capturing the sync context (important in library code). CPU-bound work still needs care (`Task.Run` vs `Parallel` vs dedicated threads).",
            "async/await — машина состояний; I/O не занимает поток. ConfigureAwait(false) в библиотеках, чтобы не ловить SynchronizationContext.",
            "I/O = async, CPU-bound = explicit offload",
            "Using `.Result` or `.GetAwaiter().GetResult()` in sync-over-async deadlocks in UI/ASP.NET.",
            new[] { "ValueTask trade-offs", "volatile vs memory barriers" }),

        ["Engineering Practices"] = new LeafDemo(
            "Engineering Practices",
            "In an interview, how would you describe unit vs integration tests for a .NET service, and the role of CI?",
            "Unit tests: isolated, fast, mock boundaries; use xUnit/NUnit, deterministic. Integration: real dependencies (Testcontainers, WebApplicationFactory). CI runs on every PR, fails fast, publishes artifacts, optional CD. Mention code coverage as a guide, not a target.",
            "Юнит = изолированно, интеграционные = ближе к реальности, CI = автоматизированные проверки в пайплайне.",
            "Fail fast, deterministic, test pyramid",
            "Flaky network-dependent tests in what you call a unit suite (but with real I/O).",
            new[] { "Strangler pattern for legacy", "How would you do contract testing" })
    };

    public static bool TryGet(string nodeTitle, out LeafDemo demo) =>
        ByTitle.TryGetValue(nodeTitle, out demo!);
}
