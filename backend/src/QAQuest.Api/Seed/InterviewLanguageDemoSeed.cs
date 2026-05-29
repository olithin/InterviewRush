using Microsoft.EntityFrameworkCore;
using QAQuest.Api.Data;
using QAQuest.Api.Models;

namespace QAQuest.Api.Seed;

/// <summary>
/// Inserts starter interview questions for coach tracks keyed by tags (language tracks + unified OOP track).
/// Idempotent: skips rows that already exist (matched by title + tab tag substring in <see cref="InterviewQuestion.Tags"/>).
/// </summary>
public static class InterviewLanguageDemoSeed
{
    public const string JavaInterviewTabTag = "java-interview-tab";
    public const string PythonInterviewTabTag = "python-interview-tab";
    public const string OopInterviewTabTag = "oop-interview-tab";

    public static void EnsureDemoQuestions(AppDbContext db)
    {
        if (!db.Database.CanConnect())
        {
            return;
        }

        EnsureTrack(db, JavaInterviewTabTag, BuildJavaDemos());
        EnsureTrack(db, PythonInterviewTabTag, BuildPythonDemos());
        EnsureTrack(db, OopInterviewTabTag, BuildOopDemos());
    }

    private static void EnsureTrack(AppDbContext db, string tabTag, IReadOnlyList<InterviewQuestion> templates)
    {
        var sortOrder = db.InterviewQuestions.AsNoTracking()
            .Where(q => q.Tags.Contains(tabTag))
            .Select(q => (int?)q.SortOrder)
            .Max() ?? 0;

        var now = DateTime.UtcNow;
        foreach (var template in templates)
        {
            var title = template.Title.Trim();
            if (title.Length == 0)
            {
                continue;
            }

            var exists = db.InterviewQuestions.AsNoTracking().Any(q =>
                q.Title == title && q.Tags.Contains(tabTag));
            if (exists)
            {
                continue;
            }

            sortOrder += 10;
            var row = new InterviewQuestion
            {
                Title = title,
                QuestionText = template.QuestionText,
                Category = template.Category,
                Difficulty = template.Difficulty,
                Tags = tabTag,
                AnswerEnglish = template.AnswerEnglish,
                AnswerRussian = template.AnswerRussian,
                MemoryCue = template.MemoryCue,
                CommonTrap = template.CommonTrap,
                FollowUpQuestions = template.FollowUpQuestions,
                Notes = template.Notes,
                SortOrder = sortOrder,
                IsPublished = true,
                IsActive = true,
                CreatedAtUtc = now,
                UpdatedAtUtc = now
            };
            db.InterviewQuestions.Add(row);
        }

        db.SaveChanges();
    }

    private static List<InterviewQuestion> BuildJavaDemos() =>
    [
        // ══════════════════════════════════════════════════════════════════════
        // 01. Java core — 35 questions
        // ══════════════════════════════════════════════════════════════════════
        new InterviewQuestion
        {
            Title = "What is the difference between == and equals() in Java?",
            QuestionText = "Explain when you would use == versus equals() for objects. How does this relate to String behavior?",
            Category = "01. Java core",
            Difficulty = "Easy",
            AnswerEnglish =
                "For reference types, == compares object identity (same reference in memory). equals() tests logical equality and can be overridden. " +
                "For primitives, == compares values. For String, == checks reference equality (interning); equals() compares character content, which is almost always what you want. " +
                "Prefer Objects.equals(a, b) when nulls are possible.",
            AnswerRussian =
                "Для ссылок == — одна и та же ссылка в памяти, equals() — логическое равенство (переопределяется). Для примитивов == сравнивает значения. Для String используем equals(), а при возможных null — Objects.equals.",
            MemoryCue = "identity == vs logical equals; Objects.equals null-safe",
            CommonTrap = "Claiming == compares String contents, or forgetting null-safety of equals().",
            FollowUpQuestions = "When would you use Objects.equals?||How does String.intern() interact with ==?||What does hashCode contract require when equals is overridden?",
            Notes = "Restate identity vs value.||Give short String example.||Mention null-safe helper."
        },
        new InterviewQuestion
        {
            Title = "What is the difference between the JVM heap and stack?",
            QuestionText = "Where are local variables, method frames, and object instances stored? What problems relate to each?",
            Category = "01. Java core",
            Difficulty = "Easy",
            AnswerEnglish =
                "The stack holds thread-local frames: local primitives, references, return addresses. It grows/shrinks with method calls. " +
                "The heap stores object instances and arrays and is shared across threads; it is garbage-collected. " +
                "StackOverflowError — deep/infinite recursion. OutOfMemoryError — heap exhaustion.",
            AnswerRussian =
                "Стек — кадры потока, локальные переменные. Куча — объекты и массивы, общая для потоков, подбирается GC. StackOverflow — рекурсия, OOM — нехватка кучи.",
            MemoryCue = "frames→stack; objects→heap; GC heap only",
            CommonTrap = "Saying all data goes to heap, or forgetting references (not objects) live on the stack.",
            FollowUpQuestions = "What about thread-local variables?||Young vs old generation?||What is metaspace?",
            Notes = "One sentence each for stack vs heap.||Mention references vs objects distinction."
        },
        new InterviewQuestion
        {
            Title = "Explain autoboxing and unboxing. What are the performance pitfalls?",
            QuestionText = "What happens when Java converts between int and Integer? When can this cause bugs or slowdowns?",
            Category = "01. Java core",
            Difficulty = "Easy",
            AnswerEnglish =
                "Autoboxing converts a primitive to its wrapper (int → Integer); unboxing converts back. The compiler inserts valueOf()/intValue() calls. " +
                "Pitfalls: repeated boxing in tight loops creates many short-lived objects and GC pressure; comparing Integers with == may give surprising results for values outside the cached range (−128..127); " +
                "unboxing a null wrapper throws NullPointerException.",
            AnswerRussian =
                "Autoboxing — автоматическое обёртывание примитива в объект; unboxing — обратно. Проблемы: много мусора в цикле, == вместо equals() вне кеша −128..127, NPE при анбоксинге null.",
            MemoryCue = "box/unbox compiler; NPE null unbox; == cache trap",
            CommonTrap = "Comparing Integer with == and expecting value equality outside the cached range.",
            FollowUpQuestions = "Which wrappers have a cache? What range?||How to avoid boxing in collections (Trove, Eclipse Collections)?",
            Notes = "Show Integer cache range.||NPE example with unboxing null.||Loop performance note."
        },
        new InterviewQuestion
        {
            Title = "What is the String Pool (String Interning) in Java?",
            QuestionText = "How does the JVM deduplicate String literals? When does intern() help and when is it dangerous?",
            Category = "01. Java core",
            Difficulty = "Medium",
            AnswerEnglish =
                "String literals are automatically placed in the JVM string pool (part of the heap since Java 7+). When two literals are equal, they share the same object, so == works for literals. " +
                "intern() asks the JVM to return the canonical pool copy for any String. It can save memory when storing millions of repeated strings (e.g. enum-like values from external data). " +
                "Overusing intern() can fill the pool and cause GC pressure on the pool itself.",
            AnswerRussian =
                "Строковые литералы хранятся в пуле JVM и дедублируются. intern() возвращает canonical-копию из пула. Полезно для большого числа повторяющихся строк; при злоупотреблении засоряет пул.",
            MemoryCue = "pool dedup literals; intern() canon; GC pool",
            CommonTrap = "Assuming intern() is always beneficial or that the pool is outside the heap.",
            FollowUpQuestions = "Where is the String pool in Java 7+ vs earlier?||When would you prefer an enum over interned strings?",
            Notes = "Mention pool location changed in Java 7.||One practical intern() use case."
        },
        new InterviewQuestion
        {
            Title = "How does the equals/hashCode contract work?",
            QuestionText = "What must be true if you override equals()? What breaks if hashCode is wrong?",
            Category = "01. Java core",
            Difficulty = "Medium",
            AnswerEnglish =
                "Contract: if a.equals(b) is true, then a.hashCode() == b.hashCode() must also be true. The reverse is not required. " +
                "If you break this: objects that are equal may land in different HashMap buckets, causing lookup failures and duplicate keys. " +
                "Always override both together. Use Objects.hash() or IDE-generated implementations.",
            AnswerRussian =
                "Если equals() возвращает true, hashCode() должен совпадать. Нарушение: HashMap не находит равные объекты, появляются дубликаты ключей. Переопределяй оба метода вместе.",
            MemoryCue = "equal ⟹ same hash; different hash possible equals; break HashMap",
            CommonTrap = "Overriding only equals and wondering why HashMap doesn't find inserted elements.",
            FollowUpQuestions = "What is a good hashCode for a composite key?||Immutability and use as map key?||What is consistent with equals in Comparable?",
            Notes = "One HashMap bug demo.||Recommend Objects.hash()."
        },

        // ── 02. OOP & design ────────────────────────────────────────────────────
        new InterviewQuestion
        {
            Title = "Abstract class vs interface — when to choose which?",
            QuestionText = "Compare abstract classes and interfaces in Java 8+. When is each the right choice?",
            Category = "02. OOP & design",
            Difficulty = "Easy",
            AnswerEnglish =
                "An interface defines a contract; a class can implement many. Since Java 8, interfaces can have default and static methods; since Java 9, private methods. " +
                "An abstract class can hold state, constructors, and non-public members; a class extends only one. " +
                "Choose interface for pure capability contracts (Comparable, Serializable, your own service ports). Choose abstract class when sharing state or partial implementation among a family of related classes.",
            AnswerRussian =
                "Интерфейс — контракт, можно реализовать несколько. Абстрактный класс — общее состояние и реализация, наследуется один. Интерфейс для возможностей, абстрактный класс — для семейства связанных классов.",
            MemoryCue = "interface = contract; abstract = shared state; multiple interface",
            CommonTrap = "Saying interfaces cannot have implementation (they can since Java 8 with default methods).",
            FollowUpQuestions = "What is the diamond problem and how does Java resolve it for interfaces?||When would you make an interface sealed?",
            Notes = "Give one example of each decision.||Mention Java 8 default methods."
        },
        new InterviewQuestion
        {
            Title = "Explain SOLID principles with a Java example for each",
            QuestionText = "Walk through each SOLID principle. Give a concrete Java anti-pattern and its fix for at least two.",
            Category = "02. OOP & design",
            Difficulty = "Medium",
            AnswerEnglish =
                "S — Single Responsibility: one class, one reason to change. Anti-pattern: UserService that also sends email and generates PDF. Fix: split into UserService, NotificationService, ReportService. " +
                "O — Open/Closed: open for extension, closed for modification. Use strategy or template method instead of adding switch cases. " +
                "L — Liskov Substitution: subtypes must not break callers of the parent. Rectangle/Square classic pitfall. " +
                "I — Interface Segregation: prefer small focused interfaces over fat ones. " +
                "D — Dependency Inversion: depend on abstractions, not concretions. Inject interfaces via constructor.",
            AnswerRussian =
                "S — одна ответственность. O — расширяй, не меняй. L — подтип не ломает контракт родителя. I — маленькие интерфейсы. D — зависеть от абстракций, инжектировать через конструктор.",
            MemoryCue = "S-split class; O-strategy; L-subtype contract; I-small iface; D-inject abstraction",
            CommonTrap = "Applying SOLID dogmatically when simpler code would be clearer.",
            FollowUpQuestions = "When would strict SOLID increase complexity unnecessarily?||How does DI relate to the D principle?",
            Notes = "Pick 2–3 principles, give concrete code smell.||Keep each example brief."
        },
        new InterviewQuestion
        {
            Title = "What is the difference between composition and inheritance?",
            QuestionText = "Why is composition often preferred? When is inheritance still the right choice?",
            Category = "02. OOP & design",
            Difficulty = "Medium",
            AnswerEnglish =
                "Inheritance (is-a) tightly couples a subclass to its parent's implementation; changes in the superclass silently affect subclasses. " +
                "Composition (has-a) delegates behaviour to collaborators; you can swap them at runtime and avoid the fragile base-class problem. " +
                "Prefer composition for 'uses' or 'has' relationships. Inheritance remains appropriate for genuine is-a hierarchies with stable contracts, or framework extension points designed for it.",
            AnswerRussian =
                "Наследование — тесная связь, хрупкий базовый класс. Композиция — делегирование, можно менять поведение в рантайме. Предпочитай композицию; наследование — для настоящих is-a с контрактом.",
            MemoryCue = "inherit fragile; compose flexible; swap runtime",
            CommonTrap = "Using inheritance just to reuse code without an is-a relationship.",
            FollowUpQuestions = "What is the Decorator pattern and how does it use composition?||How do Kotlin data classes discourage inheritance?",
            Notes = "Give one inheritance smell; fix with composition.||Mention Effective Java Item 18."
        },
        new InterviewQuestion
        {
            Title = "What are design patterns you use most? Explain Factory, Strategy, Observer.",
            QuestionText = "Describe Factory Method, Strategy, and Observer patterns with a real use case each.",
            Category = "02. OOP & design",
            Difficulty = "Medium",
            AnswerEnglish =
                "Factory Method: defer object creation to subclasses; used in frameworks (DocumentBuilderFactory, LoggerFactory). Decouples the caller from the concrete type. " +
                "Strategy: encapsulate an algorithm behind an interface; swap implementations at runtime (sorting strategy, payment processor). Replaces conditionals. " +
                "Observer: one-to-many notification; when subject state changes, observers are notified. Used in event systems, UI listeners, reactive streams. " +
                "Key interview point: know which GoF category each belongs to and when simpler code wins over the pattern.",
            AnswerRussian =
                "Factory — отложенное создание объекта, декаплинг от конкретного типа. Strategy — алгоритм за интерфейсом, замена switch. Observer — уведомление подписчиков при изменении состояния.",
            MemoryCue = "factory decouple creation; strategy swap algo; observer notify many",
            CommonTrap = "Force-fitting patterns when a simple method call suffices.",
            FollowUpQuestions = "How does Strategy relate to functional interfaces in Java 8?||How is Factory different from Abstract Factory?||How would you implement Observer without using the deprecated java.util.Observable?",
            Notes = "One sentence + one real API example per pattern.||Mention lambda as inline Strategy."
        },

        // ── 03. Collections & generics ──────────────────────────────────────────
        new InterviewQuestion
        {
            Title = "ArrayList vs LinkedList — when to choose which?",
            QuestionText = "Compare time complexity for access, insert, and remove. In practice, when does LinkedList actually help?",
            Category = "03. Collections & generics",
            Difficulty = "Easy",
            AnswerEnglish =
                "ArrayList: O(1) random access by index, O(n) insert/remove in the middle (shifts), amortized O(1) add at tail. Cache-friendly due to contiguous memory. " +
                "LinkedList: O(n) access by index (traversal), O(1) insert/remove at a known node (but you still need O(n) to find it). High memory overhead per element (two pointers). " +
                "In practice, ArrayList is faster almost always due to cache locality. LinkedList wins only when you hold a ListIterator at a position and do many insertions there, or need a Deque.",
            AnswerRussian =
                "ArrayList — O(1) доступ по индексу, O(n) вставка в середину, хорошо кешируется. LinkedList — O(n) поиск по индексу, дорогой по памяти. На практике ArrayList быстрее почти всегда.",
            MemoryCue = "array random O(1); linked node O(n); cache locality wins",
            CommonTrap = "Claiming LinkedList is always better for insertions without noting O(n) traversal to find the position.",
            FollowUpQuestions = "When would you use ArrayDeque instead of LinkedList?||What is the capacity growth factor of ArrayList?",
            Notes = "State complexity for both.||Mention cache locality.||Say when LinkedList is actually used."
        },
        new InterviewQuestion
        {
            Title = "How does HashMap work internally? What happens during collision?",
            QuestionText = "Describe HashMap bucket structure, hash function, collision resolution, and load factor. What changed in Java 8?",
            Category = "03. Collections & generics",
            Difficulty = "Medium",
            AnswerEnglish =
                "HashMap is an array of buckets. Each put: compute key.hashCode(), spread with (h ^ (h >>> 16)), index into bucket array with (n-1) & hash. " +
                "Collision: multiple keys in the same bucket form a linked list (chaining). In Java 8+, when a bucket exceeds TREEIFY_THRESHOLD (8), the list is converted to a red-black tree for O(log n) worst case. " +
                "Load factor (default 0.75) controls when the table resizes (doubles). Resize rehashes all entries. " +
                "Not thread-safe; structural modification during iteration causes ConcurrentModificationException.",
            AnswerRussian =
                "Массив корзин. Хеш + spread, индекс по маске. Коллизия — цепочка. В Java 8+ при >8 элементов в корзине — красно-чёрное дерево. Load factor 0.75 — триггер для resize.",
            MemoryCue = "bucket array; chain list; Java8 tree; 0.75 resize",
            CommonTrap = "Saying Java HashMap uses open addressing, or not knowing about the Java 8 treeification.",
            FollowUpQuestions = "Why is capacity always a power of 2?||What breaks HashMap if a key's hashCode changes after insertion?||How does LinkedHashMap maintain insertion order?",
            Notes = "Draw bucket array + chain sketch.||Mention Java 8 tree upgrade.||State load factor."
        },
        new InterviewQuestion
        {
            Title = "What is the difference between fail-fast and fail-safe iterators?",
            QuestionText = "Give examples of each. What exception is thrown and why?",
            Category = "03. Collections & generics",
            Difficulty = "Medium",
            AnswerEnglish =
                "Fail-fast iterators (ArrayList, HashMap iterators) track a modCount. Any structural modification during iteration increments modCount; the iterator detects the mismatch and throws ConcurrentModificationException. This is a best-effort detection, not a guarantee. " +
                "Fail-safe iterators (CopyOnWriteArrayList, ConcurrentHashMap) operate on a snapshot or segment and do not throw. They may not reflect latest mutations. " +
                "Use fail-safe when reading from a collection that is concurrently modified; understand that iteration may lag behind.",
            AnswerRussian =
                "Fail-fast — modCount проверяется; структурное изменение бросает ConcurrentModificationException. Fail-safe — работает на снимке или сегменте, не бросает, но может видеть устаревшие данные.",
            MemoryCue = "modCount CME; snapshot fail-safe; COWAL",
            CommonTrap = "Relying on fail-fast as a concurrency safety guarantee — it is only a best-effort bug detector.",
            FollowUpQuestions = "Why is ConcurrentModificationException not thrown in all scenarios?||When would CopyOnWriteArrayList be a performance problem?",
            Notes = "One example for each category.||Stress 'best-effort' for fail-fast."
        },
        new InterviewQuestion
        {
            Title = "Explain generics, type erasure, and wildcards (? extends / ? super)",
            QuestionText = "What is type erasure? When would you use <? extends T> vs <? super T>?",
            Category = "03. Collections & generics",
            Difficulty = "Medium",
            AnswerEnglish =
                "Generics provide compile-time type safety; at runtime, type parameters are erased to their upper bound (Object if unbounded). No generic type information survives at runtime — you cannot do 'new T()' or 'instanceof List<String>'. " +
                "PECS mnemonic: Producer Extends, Consumer Super. Use <? extends Animal> when you read (produce) elements from the collection. Use <? super Dog> when you write (consume) elements into it. " +
                "Both rules come from Liskov substitutability: you can safely read an Animal from a List<Cat>, but you cannot safely write a Dog into it.",
            AnswerRussian =
                "Тип-параметр стирается до Object во время выполнения. PECS: Producer Extends (читаем), Consumer Super (пишем). List<? extends Animal> — только чтение; List<? super Dog> — можно добавлять Dog.",
            MemoryCue = "PECS producer extends consumer super; erasure runtime Object",
            CommonTrap = "Forgetting that type erasure means List<String> and List<Integer> are the same at runtime.",
            FollowUpQuestions = "How do you pass a generic type token to a method that needs Class<T>?||What is a raw type and why is it dangerous?",
            Notes = "Explain PECS with a short add/get example.||Mention you cannot do instanceof on generic type."
        },

        // ── 04. Concurrency ─────────────────────────────────────────────────────
        new InterviewQuestion
        {
            Title = "What is the Java Memory Model (JMM)? Explain happens-before.",
            QuestionText = "Why can threads see stale values? What guarantees does the JMM give for volatile and synchronized?",
            Category = "04. Concurrency",
            Difficulty = "Senior",
            AnswerEnglish =
                "The JMM defines when one thread's writes are visible to another. Without synchronization, the CPU and JIT may reorder operations and cache values in registers, making writes invisible to other threads. " +
                "The happens-before relation guarantees visibility and ordering: a write that happens-before a read is always visible. Key rules: unlock happens-before subsequent lock; volatile write happens-before volatile read; Thread.start() happens-before actions in the started thread. " +
                "volatile prevents reordering and ensures write visibility but does not make compound operations atomic.",
            AnswerRussian =
                "JMM определяет видимость изменений между потоками. Без синхронизации CPU/JIT кешируют значения. happens-before: volatile-запись видна volatile-чтению, снятие монитора видно следующему захвату.",
            MemoryCue = "JMM visibility; happens-before rules; volatile not atomic",
            CommonTrap = "Thinking volatile makes compound operations (check-then-act) atomic — it does not.",
            FollowUpQuestions = "What is a data race?||How does synchronized establish happens-before?||Compare volatile vs AtomicInteger.",
            Notes = "Name 3 happens-before rules.||Distinguish visibility vs atomicity.||Counter++ volatile still race."
        },
        new InterviewQuestion
        {
            Title = "What is the difference between synchronized, volatile, and AtomicInteger?",
            QuestionText = "When would each be appropriate? What guarantees does each provide?",
            Category = "04. Concurrency",
            Difficulty = "Medium",
            AnswerEnglish =
                "synchronized blocks mutual exclusion and establishes full happens-before (visibility + atomicity for the protected block). Appropriate for compound actions and multi-field invariants. " +
                "volatile ensures write visibility and prevents reordering for a single variable, but operations like count++ remain non-atomic (read-modify-write). " +
                "AtomicInteger (and java.util.concurrent.atomic package) uses CPU-level compare-and-swap for lock-free atomic operations on a single value. Faster than synchronized for simple counters and accumulations.",
            AnswerRussian =
                "synchronized — взаимное исключение, happens-before, для составных действий. volatile — видимость записи, не атомарность. AtomicInteger — CAS lock-free для одного значения, быстрее для счётчиков.",
            MemoryCue = "sync mutex; volatile visibility; atomic CAS",
            CommonTrap = "Using volatile for count++ expecting atomic behaviour.",
            FollowUpQuestions = "When would you use LongAdder over AtomicLong?||What is the ABA problem?||ReentrantLock vs synchronized?",
            Notes = "Contrast all three with count++ example.||Mention LongAdder for high contention."
        },
        new InterviewQuestion
        {
            Title = "Explain the Executor framework. What types of thread pools are there?",
            QuestionText = "Why not create raw threads? Compare fixed, cached, scheduled, and single-thread executors.",
            Category = "04. Concurrency",
            Difficulty = "Medium",
            AnswerEnglish =
                "Raw threads are expensive (1MB stack each) and hard to manage. Executors decouple task submission from execution and provide pooling, queueing, and lifecycle management. " +
                "newFixedThreadPool(n) — bounded workers, unbounded queue; risk: queue grows without limit. " +
                "newCachedThreadPool() — unbounded workers, SynchronousQueue; risk: thread explosion under load. " +
                "newSingleThreadExecutor() — serializes tasks, maintains order. " +
                "newScheduledThreadPool(n) — delayed/periodic tasks. " +
                "For production, use ThreadPoolExecutor with explicit queue and rejection policy.",
            AnswerRussian =
                "Сырые потоки дороги и трудно управляемы. Executor — пул + очередь + lifecycle. Fixed — ограниченные воркеры, очередь растёт. Cached — воркеры растут без предела. Для прода — ThreadPoolExecutor с явными параметрами.",
            MemoryCue = "fixed bounded; cached threads grow; scheduled periodic; custom TPE prod",
            CommonTrap = "newCachedThreadPool() in production without a limit — causes thread explosion.",
            FollowUpQuestions = "What is ForkJoinPool? When does CompletableFuture use it?||What happens when the queue is full and no RejectedExecutionHandler is set?",
            Notes = "Name all four factories.||Stress production risk of each.||Recommend explicit TPE."
        },
        new InterviewQuestion
        {
            Title = "What are deadlocks? How do you detect and prevent them?",
            QuestionText = "What four conditions are required for a deadlock? How would you diagnose one in production?",
            Category = "04. Concurrency",
            Difficulty = "Senior",
            AnswerEnglish =
                "Deadlock requires: (1) mutual exclusion — resource held exclusively; (2) hold and wait — thread holds one lock while waiting for another; (3) no preemption — locks not forcibly released; (4) circular wait — A waits for B while B waits for A. " +
                "Prevention: consistent lock ordering eliminates circular wait (most practical). Use tryLock() with timeout to detect and back off. " +
                "Detection: jstack or VisualVM shows thread dump with deadlock section. JMX ThreadMXBean.findDeadlockedThreads() at runtime.",
            AnswerRussian =
                "Четыре условия: взаимное исключение, удержание + ожидание, нет принудительного снятия, круговое ожидание. Профилактика: единый порядок захвата блокировок. Диагностика: jstack, ThreadMXBean.",
            MemoryCue = "4 conditions; lock order prevention; jstack detect",
            CommonTrap = "Proposing only lock ordering without acknowledging it requires upfront design discipline.",
            FollowUpQuestions = "What is livelock?||Starvation?||How does ReentrantLock.tryLock help?",
            Notes = "Name all 4 conditions.||Describe jstack analysis.||Give consistent lock-order example."
        },
        new InterviewQuestion
        {
            Title = "What are CompletableFuture and its composition methods?",
            QuestionText = "How do you chain async steps? Explain thenApply, thenCompose, thenCombine, and exception handling.",
            Category = "04. Concurrency",
            Difficulty = "Senior",
            AnswerEnglish =
                "CompletableFuture represents an async computation. Key methods: " +
                "thenApply(fn) — transform result (like map, runs in same thread usually); " +
                "thenCompose(fn) — chain into another CompletableFuture (flatMap); " +
                "thenCombine(cf, fn) — combine two independent futures when both complete; " +
                "exceptionally(fn) — recover from exception; " +
                "handle(fn) — handles both result and exception. " +
                "Async variants (thenApplyAsync) submit to ForkJoinPool.commonPool or a provided executor. " +
                "allOf/anyOf combine multiple futures.",
            AnswerRussian =
                "thenApply — преобразование (map); thenCompose — flatMap в другой CF; thenCombine — два независимых; exceptionally — обработка ошибки. Async-варианты — выполнение в пуле.",
            MemoryCue = "apply transform; compose flatMap; combine two; exceptionally recover",
            CommonTrap = "Using thenApply when the function itself returns a CompletableFuture (should use thenCompose).",
            FollowUpQuestions = "What thread runs thenApply if the future is already completed?||How do you set a timeout on a CompletableFuture in Java 9+?",
            Notes = "Compare thenApply vs thenCompose with analogy to map/flatMap.||Show allOf pattern."
        },

        // ── 05. JVM & performance ───────────────────────────────────────────────
        new InterviewQuestion
        {
            Title = "Explain the garbage collection model: generations, GC algorithms, and tuning basics",
            QuestionText = "What are young and old generations? Compare G1, ZGC, and classic parallel GC. When would you tune?",
            Category = "05. JVM & performance",
            Difficulty = "Senior",
            AnswerEnglish =
                "Most collectors use generational hypothesis: most objects die young. Young gen (Eden + 2 Survivor spaces) is collected frequently and cheaply (minor GC). Survivors promoted to old gen; full/major GC collects old gen. " +
                "G1 GC (default Java 9+): divides heap into regions; concurrent marking; targets pause time; good balance for most workloads. " +
                "ZGC/Shenandoah (Java 11+/15+): sub-millisecond pauses; concurrent compaction; large heaps. Higher CPU for coloring. " +
                "Serial/Parallel GC: stop-the-world, throughput-oriented; suitable for batch or small heaps. " +
                "Tuning: -Xms/-Xmx for heap, -XX:MaxGCPauseMillis for G1, GC logs analysis (GCEasy, GCViewer).",
            AnswerRussian =
                "Young (Eden+Survivors) — частые дешёвые minor GC. Old — major GC. G1 — регионы, target pause, дефолт с Java 9. ZGC/Shenandoah — паузы <1мс. Тюнинг: Xmx, MaxGCPauseMillis, GC-логи.",
            MemoryCue = "generational eden survivor old; G1 regions pause; ZGC sub-ms; logs tune",
            CommonTrap = "Tuning GC without first measuring with logs — premature optimization.",
            FollowUpQuestions = "What is promotion failure?||How do you find a memory leak in production?||What is GC overhead limit exceeded?",
            Notes = "Draw three-gen model.||Compare G1 vs ZGC in 2–3 sentences.||Emphasize measure-before-tune."
        },
        new InterviewQuestion
        {
            Title = "What is JIT compilation? How do C1 and C2 compilers work in HotSpot?",
            QuestionText = "What is a hot method? When does HotSpot compile vs interpret? What is OSR?",
            Category = "05. JVM & performance",
            Difficulty = "Senior",
            AnswerEnglish =
                "JVM starts by interpreting bytecode. HotSpot profiles method invocations; when an invocation count exceeds a threshold, the method is compiled by C1 (client, fast compilation, basic optimizations) then potentially by C2 (server, aggressive optimizations, inlining, loop unrolling, escape analysis). " +
                "OSR (On-Stack Replacement) compiles a long-running loop while it is still on the stack. " +
                "Tiered compilation (default since Java 8) uses both C1 and C2 depending on heat. " +
                "Micro-benchmarking requires JMH to account for JIT warm-up, dead-code elimination, and constant folding.",
            AnswerRussian =
                "Интерпретация → профилирование → C1 (быстрая компиляция) → C2 (агрессивная оптимизация). OSR — компиляция горячего цикла на лету. Для микробенчмарков — JMH.",
            MemoryCue = "interpret → C1 quick → C2 deep; OSR loop; JMH bench",
            CommonTrap = "Writing micro-benchmarks in main() without JMH — JIT skews results completely.",
            FollowUpQuestions = "What is escape analysis and how does it help?||What are safepoints?||When does HotSpot deoptimize?",
            Notes = "C1 vs C2 in 1 sentence each.||OSR explanation.||JMH requirement."
        },

        // ── 06. Exceptions & APIs ───────────────────────────────────────────────
        new InterviewQuestion
        {
            Title = "Checked vs unchecked exceptions — how do you decide?",
            QuestionText = "What are checked and unchecked exceptions in Java? When would you use each in API design?",
            Category = "06. Exceptions & APIs",
            Difficulty = "Medium",
            AnswerEnglish =
                "Checked exceptions must be declared or caught at compile time; they model expected failure modes callers should handle (IOException, SQLException). " +
                "Unchecked extend RuntimeException; they signal programming bugs or rarely recoverable states (NullPointerException, IllegalArgumentException). " +
                "API design trade-off: checked forces caller attention but pollutes throws clauses through deep stacks; unchecked keeps signatures clean but relies on documentation. " +
                "Modern libraries (Spring, Hibernate) prefer unchecked; wrap checked in custom unchecked exceptions at boundaries.",
            AnswerRussian =
                "Проверяемые — компилятор требует обработки, для ожидаемых отказов. Неконтролируемые — программные ошибки. Современные библиотеки предпочитают unchecked; оборачивают checked на границах слоёв.",
            MemoryCue = "checked caller must handle; unchecked runtime bug; wrap at boundary",
            CommonTrap = "Catching Exception everywhere to silence checked exceptions without handling or rethrowing properly.",
            FollowUpQuestions = "How do unchecked exceptions propagate through threads?||What about try-with-resources and suppressed exceptions?",
            Notes = "One example of each.||API wrapping pattern.||try-with-resources mention."
        },

        // ── 07. Java 8+ features ────────────────────────────────────────────────
        new InterviewQuestion
        {
            Title = "How does the Stream API work? Explain intermediate vs terminal operations and short-circuiting.",
            QuestionText = "What is lazy evaluation in streams? How are parallel streams different from sequential?",
            Category = "07. Java 8+ features",
            Difficulty = "Medium",
            AnswerEnglish =
                "Streams are lazy pipelines. Intermediate operations (filter, map, flatMap, distinct, sorted) build a pipeline but do not execute until a terminal operation is invoked (collect, forEach, count, findFirst). " +
                "Short-circuit terminals (findFirst, anyMatch, limit) may stop the pipeline early. " +
                "Parallel streams split data across ForkJoinPool.commonPool threads. Speedup requires: independent operations, no shared state, large enough data (overhead matters for small data). " +
                "Pitfalls: stateful lambdas in parallel (sorted, distinct expensive), shared mutable state, order-sensitive operations.",
            AnswerRussian =
                "Стрим — ленивый пайплайн. Промежуточные операции не выполняются до терминальной. Short-circuit прерывает досрочно. Параллельные стримы — ForkJoinPool, эффективны для больших независимых данных.",
            MemoryCue = "lazy pipeline; terminal triggers; short-circuit; parallel FJP",
            CommonTrap = "Expecting an intermediate operation to execute immediately or using parallel streams for tiny lists.",
            FollowUpQuestions = "What is a Spliterator?||Why is sorted() expensive on parallel streams?||When would you use IntStream over Stream<Integer>?",
            Notes = "pipeline diagram.||findFirst short-circuit example.||Parallel pitfalls."
        },
        new InterviewQuestion
        {
            Title = "What are functional interfaces? Explain Predicate, Function, Supplier, Consumer.",
            QuestionText = "What makes an interface functional? How do method references work?",
            Category = "07. Java 8+ features",
            Difficulty = "Easy",
            AnswerEnglish =
                "A functional interface has exactly one abstract method (SAM). The @FunctionalInterface annotation documents this contract. " +
                "Core java.util.function types: Predicate<T> — test(T) → boolean; Function<T,R> — apply(T) → R; Consumer<T> — accept(T) (returns void); Supplier<T> — get() → T. Compose with andThen, compose, negate. " +
                "Method references: ClassName::method, instance::method, ClassName::new. Lambda and method reference are both instances of the functional interface.",
            AnswerRussian =
                "Функциональный интерфейс — один абстрактный метод. Predicate — тест, Function — преобразование, Consumer — потребитель, Supplier — поставщик. Лямбда и method reference — реализации SAM.",
            MemoryCue = "SAM @FunctionalInterface; Predicate bool; Function T→R; Consumer void; Supplier T",
            CommonTrap = "Adding a second abstract method to a @FunctionalInterface — compile error.",
            FollowUpQuestions = "How do BiFunction, BinaryOperator relate?||What is the UnaryOperator shortcut?||Can default methods break the SAM contract?",
            Notes = "Show each of the four with a lambda example.||Method reference syntax summary."
        },
        new InterviewQuestion
        {
            Title = "Explain Optional — correct usage and common misuses",
            QuestionText = "When should you use Optional? What are the anti-patterns?",
            Category = "07. Java 8+ features",
            Difficulty = "Medium",
            AnswerEnglish =
                "Optional is a container that may or may not hold a value. Intended for return types of methods that may have no result (Repository.findById). " +
                "Correct use: return Optional<T> from methods, chain with map/flatMap/filter/orElse/orElseThrow. " +
                "Anti-patterns: Optional as field type (serialization issues, not for domain model); Optional as method parameter (just overload); calling get() without isPresent() (defeats the purpose); Optional.of(null) — NullPointerException.",
            AnswerRussian =
                "Optional — тип возврата для возможно-отсутствующего значения. Цепочки map/flatMap/orElseThrow. Антипаттерны: как поле, как параметр, get() без проверки, of(null).",
            MemoryCue = "return type only; chain orElse; no field param; no get() blind",
            CommonTrap = "Using Optional.get() without checking isEmpty() first.",
            FollowUpQuestions = "How do orElse and orElseGet differ in evaluation?||Optional in Kotlin vs Java?",
            Notes = "Good: findById() pattern.||Bad: Optional field, Optional parameter.||orElse vs orElseGet eager/lazy."
        },

        // ── 08. Spring & frameworks ─────────────────────────────────────────────
        new InterviewQuestion
        {
            Title = "How does Spring Dependency Injection work? Explain IoC container and bean lifecycle.",
            QuestionText = "What is IoC? Compare constructor, setter, and field injection. What are the bean scopes?",
            Category = "08. Spring & frameworks",
            Difficulty = "Medium",
            AnswerEnglish =
                "IoC (Inversion of Control): the framework creates and wires objects (beans) instead of the application doing new(). The ApplicationContext is the IoC container. " +
                "Constructor injection: mandatory dependencies, immutable, testable, recommended. Setter injection: optional dependencies. Field injection (@Autowired on field): concise but hides dependencies, not recommended for production. " +
                "Bean lifecycle: instantiation → populate properties → aware callbacks → @PostConstruct → ready → @PreDestroy → destroy. " +
                "Scopes: singleton (default) — one per context; prototype — new instance per request; request/session — web-scoped.",
            AnswerRussian =
                "IoC — контейнер создаёт и собирает объекты. Constructor — рекомендуется, иммутабельность. Setter — опциональные зависимости. Field — неудобно тестировать, не рекомендуется. Singleton по умолчанию.",
            MemoryCue = "IoC container creates; constructor recommended; singleton default; lifecycle PostConstruct",
            CommonTrap = "Field injection — hard to test without Spring context and hides circular dependency.",
            FollowUpQuestions = "What is the difference between @Component, @Service, @Repository?||Circular dependency in Spring and how to break it?||Lazy vs eager initialization?",
            Notes = "Lifecycle as ordered list.||Why constructor > field.||Singleton vs prototype."
        },
        new InterviewQuestion
        {
            Title = "How does Spring transactions work? What is @Transactional propagation and isolation?",
            QuestionText = "Explain the default propagation, isolation levels, and why @Transactional on private methods doesn't work.",
            Category = "08. Spring & frameworks",
            Difficulty = "Senior",
            AnswerEnglish =
                "Spring wraps the bean in a proxy that starts/commits/rolls back a transaction around @Transactional methods. Default propagation REQUIRED: joins existing transaction or starts one. REQUIRES_NEW: always new, suspends existing. NESTED: savepoint-based sub-transaction. " +
                "Isolation levels map to DB: READ_UNCOMMITTED, READ_COMMITTED, REPEATABLE_READ, SERIALIZABLE — each prevents more anomalies at higher lock cost. " +
                "Private methods: Spring proxy cannot intercept — @Transactional on private has no effect. Same-class self-invocation also bypasses proxy. " +
                "Rollback: by default only RuntimeException; set rollbackFor=Exception.class for checked exceptions.",
            AnswerRussian =
                "Spring использует прокси для транзакций. REQUIRED — присоединиться или создать. Private и self-invocation обходят прокси — аннотация не работает. По умолчанию rollback только на RuntimeException.",
            MemoryCue = "proxy intercepts; REQUIRED default; private bypasses; runtime rollback",
            CommonTrap = "@Transactional on private method — silently ignored due to proxy mechanism.",
            FollowUpQuestions = "How do you fix self-invocation?||What is LazyInitializationException in Hibernate and how does @Transactional help?||Open Session in View anti-pattern?",
            Notes = "Proxy diagram.||Private method trap.||Rollback for checked."
        },

        // ── 09. Testing ─────────────────────────────────────────────────────────
        new InterviewQuestion
        {
            Title = "How would you test a Spring service with JUnit 5 and Mockito?",
            QuestionText = "Explain @ExtendWith, @Mock, @InjectMocks, and when to use @SpringBootTest vs unit test.",
            Category = "09. Testing",
            Difficulty = "Medium",
            AnswerEnglish =
                "@ExtendWith(MockitoExtension.class) activates Mockito in JUnit 5. @Mock creates a test double; @InjectMocks creates the class under test and injects mocks via constructor/field. " +
                "Use plain Mockito tests (no Spring context) for unit testing service logic — fast (<10ms). " +
                "@SpringBootTest starts full context — use for integration tests. @WebMvcTest slices context to MVC layer. @DataJpaTest to repository layer. " +
                "Mockito: when(mock.method()).thenReturn(value); verify(mock, times(1)).method(arg). For void: doNothing/doThrow.",
            AnswerRussian =
                "@Mock + @InjectMocks + @ExtendWith(MockitoExtension.class) — быстрый юнит-тест без контекста. @SpringBootTest — полный контекст, медленный, для интеграции. @WebMvcTest / @DataJpaTest — слайсы.",
            MemoryCue = "MockitoExtension unit fast; SpringBootTest full slow; WebMvcTest slice",
            CommonTrap = "Using @SpringBootTest for every test — causes slow, fragile test suites.",
            FollowUpQuestions = "How would you mock a @Value property?||What is @MockBean vs @Mock?||ArgumentCaptor usage?",
            Notes = "Show one when/thenReturn example.||State when to use each annotation."
        },

        // ── 10. Architecture & senior topics ────────────────────────────────────
        new InterviewQuestion
        {
            Title = "How would you design a high-throughput REST API in Java? Key bottlenecks and solutions.",
            QuestionText = "Walk through a design that handles 10k RPS. What layers need optimization?",
            Category = "10. Architecture & senior topics",
            Difficulty = "Senior",
            AnswerEnglish =
                "Stateless service behind a load balancer. Connection pool (HikariCP) for DB. Caching layer (Redis/Caffeine) for hot read paths. Async processing (Kafka/RabbitMQ) for slow writes. Non-blocking I/O (Spring WebFlux/Virtual threads Java 21) to free threads during I/O. " +
                "Profile first: typical bottlenecks are DB queries (N+1, missing index), serialization speed, thread-pool saturation, GC pauses. " +
                "Observability: metrics (Micrometer/Prometheus), distributed tracing (OpenTelemetry), structured logging.",
            AnswerRussian =
                "Stateless + LB. HikariCP пул. Redis кеш для чтений. Kafka для асинхронной обработки. WebFlux / виртуальные потоки для неблокирующего I/O. Профилируй: N+1, индексы, GC, пул потоков. Observability: Micrometer, трейсинг.",
            MemoryCue = "stateless LB; pool DB; cache Redis; async Kafka; nonblocking virtual threads; profile first",
            CommonTrap = "Over-engineering with async before profiling — often DB query is the actual bottleneck.",
            FollowUpQuestions = "How do virtual threads (Java 21 Loom) change the thread-per-request model?||When would reactive be worse than thread-per-request?||Rate limiting strategies?",
            Notes = "Name 4-5 layers.||Profile-first mindset.||Mention observability stack."
        },
        new InterviewQuestion
        {
            Title = "What are Java Virtual Threads (Project Loom) and how do they differ from platform threads?",
            QuestionText = "Why are virtual threads interesting for web services? What can still block a virtual thread's carrier?",
            Category = "10. Architecture & senior topics",
            Difficulty = "Senior",
            AnswerEnglish =
                "Virtual threads (Java 21 GA) are cheap, lightweight threads managed by the JVM scheduler on a small pool of OS (carrier) threads. You can create millions. " +
                "When a virtual thread blocks on I/O (socket, JDBC, sleep), the JVM unmounts it from the carrier and parks it; the carrier is freed for another virtual thread (cooperative scheduling at blocking points). " +
                "Benefits: thread-per-request style code without thread-pool size limits; simpler than reactive. " +
                "Gotchas: synchronized blocks pin the virtual thread to the carrier (Java 23 fixes most cases); CPU-bound work does not benefit; native calls pin.",
            AnswerRussian =
                "Виртуальные потоки — JVM-управляемые, миллионы за копейки. При блокировке I/O — снимаются с carrier-потока. Thread-per-request без ограничений пула. Synchronized пинит к carrier (осторожно).",
            MemoryCue = "JVM scheduler millions; I/O unmount; synchronized pins; no benefit CPU",
            CommonTrap = "Using synchronized blocks extensively with virtual threads — causes carrier pinning and defeats the purpose.",
            FollowUpQuestions = "How do you enable virtual threads in Spring Boot 3.2+?||What is structured concurrency?||How do virtual threads interact with ThreadLocal?",
            Notes = "Explain unmounting analogy.||Synchronized pin warning.||Spring Boot property."
        }
    ];

    private static List<InterviewQuestion> BuildPythonDemos() =>
    [
        new InterviewQuestion
        {
            Title = "(Demo) What is the GIL in CPython?",
            QuestionText =
                "What does the Global Interpreter Lock mean for CPU-bound and I/O-bound work? How do people work around it?",
            Category = "01. Python runtime",
            Difficulty = "Medium",
            AnswerEnglish =
                "The GIL is a mutex that lets only one thread execute Python bytecode at a time in the standard interpreter, which limits CPU-bound parallelism across threads. I/O-heavy code often releases the GIL during waits, so threads can still help. " +
                "For parallel CPU work, multiprocessing or native extensions are common; asyncio helps concurrent I/O in one thread without fighting the GIL for CPU.",
            AnswerRussian =
                "GIL ограничивает параллельное выполнение байткода несколькими потоками для CPU; для ввода-вывода часто всё ок. Для счёта — процессы или библиотеки с нативным кодом.",
            MemoryCue = "GIL bytecode threads; I/O waits; multiprocessing CPU",
            CommonTrap = "Claiming Python has no parallelism, or ignoring that I/O-heavy services still benefit from threading/async.",
            FollowUpQuestions =
                "Would asyncio remove the GIL?||When is multiprocessing fragile?",
            Notes = "Coach — separate CPU-bound vs I/O-bound advice."
        },
        new InterviewQuestion
        {
            Title = "(Demo) List vs tuple — when would you choose each?",
            QuestionText =
                "Compare mutability, performance implications, and using tuples as dict keys.",
            Category = "02. Data structures",
            Difficulty = "Easy",
            AnswerEnglish =
                "Lists are mutable ordered sequences; tuples are immutable ordered sequences. Tuples can be dictionary keys when their items are hashable, which lists cannot. " +
                "Tuples often model fixed-shape records or return multiple values with a lightweight, hashable footprint; lists are for homogeneous collections we grow or change.",
            AnswerRussian =
                "Список — изменяемый; кортеж — неизменяемый; кортеж из хешируемых элементов может быть ключом словаря.",
            MemoryCue = "mutable list; immutable tuple; dict keys hashable",
            CommonTrap = "Using a single-element tuple without the trailing comma, or forgetting unhashable contents break dict keys.",
            FollowUpQuestions = "Namedtuple or dataclass instead?|| shallow copy pitfalls?",
            Notes = "Coach — one example of tuple-as-key vs list misuse."
        },
        new InterviewQuestion
        {
            Title = "(Demo) How do `is`, `==`, and `None` compare in Python?",
            QuestionText = "Explain identity versus value equality with None and small integers.",
            Category = "01. Python runtime",
            Difficulty = "Easy",
            AnswerEnglish =
                "`is` tests object identity — same object in memory. `==` uses the rich comparison protocol (__eq__). For None we almost always write `is None` / `is not None`, not equality, since there is only one None object. " +
                "CPython may intern small ints, so identity surprises are possible when comparing literals; relying on identity for numbers besides None is brittle.",
            AnswerRussian =
                "is — один и тот же объект; == — значение через __eq__. None проверяем через is.",
            MemoryCue = "None is singleton; use is None",
            CommonTrap = "Using == None instead of `is None`, or relying on identity for ints beyond small cache.",
            FollowUpQuestions =
                "What does `NaN == NaN` show?||When would __eq__ be expensive?",
            Notes = "Coach — reinforce PEP 8 style for None."
        },
        new InterviewQuestion
        {
            Title = "(Demo) Deep copy vs shallow copy",
            QuestionText =
                "What is the difference between assignment, shallow copy, and deep copy for nested structures?",
            Category = "02. Data structures",
            Difficulty = "Medium",
            AnswerEnglish =
                "Assignment binds another name to the same object — no duplication. Shallow copy creates a new container but inner mutable objects are still shared references. Deep copy recursively copies nested mutable objects where applicable. " +
                "Choosing depends on mutation risk: immutable inner tuples may need only shallow copying; graphs may need caution with cycles for deep copying.",
            AnswerRussian =
                "Присваивание — та же ссылка. shallow — новый контейнер, общие вложения. deep — рекурсивное клонирование, осторожно с циклами.",
            MemoryCue = "same ref; shallow container; deep nested",
            CommonTrap =
                "Expecting slicing or dict.copy() to detach nested mutable lists without importing copy.deepcopy when needed.",
            FollowUpQuestions = "Does copy.deepcopy handle cycles?||Performance of deepcopy on large graphs?",
            Notes = "Coach — sketch nested list example."
        }
    ];

    /// <summary>
    /// Language-agnostic OOP concepts; snippets in answers show how each idea looks in C#, Java, and Python.
    /// </summary>
    private static List<InterviewQuestion> BuildOopDemos() =>
    [
        new InterviewQuestion
        {
            Title = "What are encapsulation, contract, and invariants?",
            QuestionText =
                "Explain why we hide internals and expose a small surface. What is broken if callers rely on internals?",
            Category = "01. Foundations",
            Difficulty = "Medium",
            AnswerEnglish =
                "Encapsulation means bundling state and behaviour behind a deliberate boundary: fields are implementation details; the type exposes methods that preserve rules (invariants) and communicates expectations (contract: pre/post-conditions). " +
                "If callers reach into internals, every change ripples outward and invariants fail silently.\n\n" +
                "C# — hide field, expose behaviour:\n" +
                "public sealed class BankAccount {\n  private decimal _balance;\n  public void Deposit(decimal amount) {\n    if (amount <= 0) throw new ArgumentOutOfRangeException(nameof(amount));\n    _balance += amount;\n  }\n}\n\n" +
                "Java — same idea with accessor methods:\n" +
                "public final class BankAccount {\n  private BigDecimal balance = BigDecimal.ZERO;\n  public void deposit(BigDecimal amount) {\n    if (amount.signum() <= 0) throw new IllegalArgumentException(\"amount\");\n    balance = balance.add(amount);\n  }\n}\n\n" +
                "Python — convention + property when you still want hooks:\n" +
                "class BankAccount:\n    def __init__(self):\n        self._balance = 0.0\n    def deposit(self, amount: float) -> None:\n        if amount <= 0: raise ValueError(\"amount\")\n        self._balance += amount\n",
            AnswerRussian =
                "Инкапсуляция — спрятать состояние, дать узкий контракт и сохранять инварианты через методы, а не через прямой доступ к полям. Инвариант — правило объекта («баланс не отрицателен»). Контракт — что допустимо на входе и какой результат/ошибку ждём.\n\n" +
                "В ответах к этому треку держи пример на C#/Java/Python прямо в тексте, как здесь.",
            MemoryCue = "internals hidden; invariant via methods",
            CommonTrap = "Thinking encapsulation is only about private keywords — policy and contract matter more.",
            FollowUpQuestions = "Where do properties/logs belong if you must audit every Deposit?||Immutability and encapsulation?",
            Notes = "One invariant per snippet.||Mention leaky abstractions."
        },
        new InterviewQuestion
        {
            Title = "Inheritance versus composition — interview framing",
            QuestionText =
                "When would you inherit, and when would you compose? Name the fragile base-class problem.",
            Category = "02. Relationships",
            Difficulty = "Medium",
            AnswerEnglish =
                "Inheritance is an is-a link: the subclass substitutes for the superclass (LSP). Composition is has-a/use-a: collaborators are injected or constructed; behaviour is delegated. Prefer composition when specialization is unstable or unrelated features mix; use inheritance only when taxonomy is real and behaviour is cohesive. Fragile base class: superclass change breaks unknowing subclasses.\n\n" +
                "C# — compose with injection:\n" +
                "public interface INotifier { void Send(string msg); }\n" +
                "public sealed class UserService(INotifier notifier) {\n  public void Register(string email) {\n    /* ... */\n    notifier.Send(\"welcome\");\n  }\n}\n\n" +
                "Java — same via constructor injection:\n" +
                "public final class UserService {\n  private final Notifier notifier;\n  public UserService(Notifier notifier) { this.notifier = notifier; }\n  public void register(String email) { notifier.send(\"welcome\"); }\n}\n\n" +
                "Python — attribute holds collaborator:\n" +
                "class UserService:\n    def __init__(self, notifier: \"Notifier\") -> None:\n        self._notifier = notifier\n    def register(self, email: str) -> None:\n        self._notifier.send(\"welcome\")\n",
            AnswerRussian =
                "Наследование — is-a и подстановка подтипа. Композиция — делегирование коллаборатору (has-a), проще поменять поведение. Хрупкий базовый класс — правки родителя ломают детей. В ответах сравнивая языки, покажи композицию через конструктор/поле во всех трёх.",
            MemoryCue = "compose default; fragile base",
            CommonTrap = "Using inheritance purely to reuse a helper method with no stable is-a.",
            FollowUpQuestions = "How does template method relate to fragile base classes?||When is sealed/final justified?",
            Notes = "One sentence each for fragile base class and LSP tie-in."
        },
        new InterviewQuestion
        {
            Title = "Polymorphism — what callers rely on",
            QuestionText =
                "Define subtype polymorphism and interface polymorphism with a billing/payment-shaped example across languages.",
            Category = "03. Behaviour",
            Difficulty = "Medium",
            AnswerEnglish =
                "Polymorphism lets code depend on abstraction: the runtime object determines which implementation runs. Interfaces (or abstract/virtual contracts) isolate callers from concrete types.\n\n" +
                "C#\npublic interface IPayment { void Pay(decimal amount); }\npublic sealed class StripePayment : IPayment {\n  public void Pay(decimal amount) => /* Stripe */;\n}\n\n" +
                "Java\ninterface Payment { void pay(BigDecimal amount); }\nfinal class StripePayment implements Payment {\n  @Override public void pay(BigDecimal amount) { /* Stripe */ }\n}\n\n" +
                "Python (structural duck typing)\nclass PaymentProtocol(Protocol):\n    def pay(self, amount: float) -> None: ...\ndef charge(p: PaymentProtocol, cents: float) -> None:\n    p.pay(cents)\n",
            AnswerRussian =
                "Полиморфизм — один и тот же вызов (абстракция), разная реализация объекта; в статическом ОО это интерфейс/базовый класс и виртуальный вызов. В ответах показывай контракт + одну альтернативную реализацию на каждый интересующий язык при необходимости.",
            MemoryCue = "depend on abstraction; swap impl",
            CommonTrap = "Confusing overriding with overload resolution.",
            FollowUpQuestions = "Double dispatch versus single dispatch?||When is visitor still relevant?",
            Notes = "State what caller holds (IPayment / Payment protocol)." 
        },
        new InterviewQuestion
        {
            Title = "SOLID — two principles you can illustrate with code contrasts",
            QuestionText =
                "Pick S and D: describe each and show a smell + fix sketch in three languages without a framework.",
            Category = "04. Principles",
            Difficulty = "Medium",
            AnswerEnglish =
                "S — Single Responsibility: each type has one reason to change — split unrelated duties. D — Dependency Inversion: high-level logic depends on abstractions; wire concretions at the edge/composition root.\n\n" +
                "Smell — God object doing HTTP + persistence + CSV parse. Fix sketch — interfaces at boundaries:\n" +
                "C# interfaces ITcpClient, IUserRepository injected into RegisterUserHandler.\n" +
                "Java same with interfaces and constructor injection in the handler.\n" +
                "Python: protocols or ABCs plus passing dependencies into ctor for tests.\n",
            AnswerRussian =
                "S — разносим обязанности. D — зависим от абстракций, конкретику подставляем снаружи (DI ROOT). На собеседовании можно не перечислять все SOLID подряд, а два принципа с живым кодом во всех трёх языках одной формулировкой.",
            MemoryCue = "S split duties; D abstractions wired outside",
            CommonTrap = "Dogmatic layering that obscures behaviour for tiny scripts.",
            FollowUpQuestions = "How does DIP interact with Composition Root?||When does SRP split go too far?",
            Notes = "Keep code sketches under ~10 lines per language cumulatively."
        },
        new InterviewQuestion
        {
            Title = "Liskov substitution — rectangle / square style mistake",
            QuestionText =
                "Why cannot Square reliably be a Rectangle subtype in mutable models? Mention what breaks callers.",
            Category = "04. Principles",
            Difficulty = "Medium",
            AnswerEnglish =
                "If Rectangle exposes SetWidth/SetHeight and invariants imply width≠height semantics, assigning a Square violates expected post-conditions — code that assumes independent width/height behaves incorrectly.\n\n" +
                "Safer modelling: immutable shapes with factory methods (static creation), separate types without inheritance, or a single Shape hierarchy with behavioural methods — not widening mutators blindly.\n" +
                "Show in each language a comment like // broken: subclass tightens parent's contract.\n",
            AnswerRussian =
                "LSP — подтип можно подставить вместо базового типа без сюрпризов. Классический квадрат/прямоугольник ломает ожидания при изменении сторон по отдельности. Ответ универсальный — при необходимости приложи маленький пример мутаций в C#/Java/Python.",
            MemoryCue = "subtype must honour parent promises",
            CommonTrap = "Modelling taxonomy in code instead of behaviour users need.",
            FollowUpQuestions = "Covariance / contravariance for read-only projections?",
            Notes = "Mention weakening preconditions forbidden." 
        },
        new InterviewQuestion
        {
            Title = "Interface / protocol vs abstract class — language quirks",
            QuestionText =
                "Compare purely abstract capability types vs abstract classes carrying shared state. Give one line per language.",
            Category = "05. Types",
            Difficulty = "Easy",
            AnswerEnglish =
                "Abstract/class with state suits shared concrete helpers and fields; interfaces/protocols suits capability seams and multiple conformance.\n\n" +
                "C# — class single inheritance; interfaces multiple; defaults on interfaces(C# 8+).\n" +
                "Java — interface default/private methods vs abstract class with fields.\n" +
                "Python — ABC mixin optional; duck typing commonly enough; protocols for structural typing checks.\n",
            AnswerRussian =
                "Выбор не «правильным по учебнику», а под контракт и повтор использования состояния. В конкретных вопросах языков можно углубиться; здесь общий слой ООП: что такое возможность несколькими интерфейсами против одной иерархии с полем.",
            MemoryCue = "state → abstract hierarchy; seams → iface",
            CommonTrap = "Fat interfaces violating ISP.",
            FollowUpQuestions = "Sealed hierarchies versus open extension?",
            Notes = "Tie ISP to splitting fat ports." 
        }
    ];
}
