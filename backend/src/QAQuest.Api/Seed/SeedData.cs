using Microsoft.EntityFrameworkCore;
using QAQuest.Api.Data;
using QAQuest.Api.Models;

namespace QAQuest.Api.Seed;

public static class SeedData
{
    private const string Sep = "||";

    public static void Apply(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Topic>().HasData(GetTopics());
        modelBuilder.Entity<Problem>().HasData(GetProblems());
        modelBuilder.Entity<ProblemExplanation>().HasData(GetExplanations());
        modelBuilder.Entity<ProblemSolution>().HasData(GetSolutions());
        modelBuilder.Entity<Gap>().HasData(GetGaps());
        modelBuilder.Entity<Flashcard>().HasData(GetFlashcards());
    }

    public static void EnsureUpToDate(AppDbContext db)
    {
        foreach (var y in GetTopics())
        {
            var x = db.Topics.SingleOrDefault(t => t.Id == y.Id);
            if (x is null) { db.Topics.Add(y); continue; }
            x.Name = y.Name;
            x.Description = y.Description;
        }
        foreach (var y in GetProblems())
        {
            var x = db.Problems.SingleOrDefault(t => t.Id == y.Id);
            if (x is null) { db.Problems.Add(y); continue; }
            x.Title = y.Title;
            x.Slug = y.Slug;
            x.Difficulty = y.Difficulty;
            x.ProblemStatement = y.ProblemStatement;
            x.TopicId = y.TopicId;
        }
        foreach (var y in GetExplanations())
        {
            var x = db.ProblemExplanations.SingleOrDefault(t => t.Id == y.Id);
            if (x is null) { db.ProblemExplanations.Add(y); continue; }
            x.Pattern = y.Pattern;
            x.WordingSignals = y.WordingSignals;
            x.Mnemonic = y.Mnemonic;
            x.PatternSignals = y.PatternSignals;
            x.HowToThink = y.HowToThink;
            x.HowToThinkSteps = y.HowToThinkSteps;
            x.BruteForceIdea = y.BruteForceIdea;
            x.OptimalIdea = y.OptimalIdea;
            x.StepByStepAlgorithm = y.StepByStepAlgorithm;
            x.VisualExplanation = y.VisualExplanation;
            x.WhyThisWorks = y.WhyThisWorks;
            x.WhyNotOtherPatterns = y.WhyNotOtherPatterns;
            x.Complexity = y.Complexity;
            x.CommonMistakes = y.CommonMistakes;
            x.CommonMistakesCritical = y.CommonMistakesCritical;
            x.CommonMistakesImportant = y.CommonMistakesImportant;
            x.CommonMistakesNiceToHave = y.CommonMistakesNiceToHave;
            x.EdgeCaseChecklist = y.EdgeCaseChecklist;
            x.GapLearningHints = y.GapLearningHints;
            x.EnglishInterviewExplanation = y.EnglishInterviewExplanation;
            x.RussianShortExplanation = y.RussianShortExplanation;
            x.MentalModelTrigger = y.MentalModelTrigger;
            x.MentalModelCue = y.MentalModelCue;
            x.MentalModelScript = y.MentalModelScript;
            x.MentalModelTrap = y.MentalModelTrap;
            x.MentalModelPersonalWords = y.MentalModelPersonalWords;
            x.MentalModelInterviewPhrase = y.MentalModelInterviewPhrase;
        }
        foreach (var y in GetSolutions())
        {
            var x = db.ProblemSolutions.SingleOrDefault(t => t.Id == y.Id);
            if (x is null) { db.ProblemSolutions.Add(y); continue; }
            x.Language = y.Language;
            x.SolutionCode = y.SolutionCode;
            x.NUnitTestsCode = y.NUnitTestsCode;
        }
        foreach (var y in GetGaps())
        {
            var x = db.Gaps.SingleOrDefault(t => t.Id == y.Id);
            if (x is null) { db.Gaps.Add(y); continue; }
            x.TopicId = y.TopicId;
            x.Severity = y.Severity;
            x.Notes = y.Notes;
            x.UpdatedAtUtc = y.UpdatedAtUtc;
        }
        foreach (var y in GetFlashcards())
        {
            var x = db.Flashcards.SingleOrDefault(t => t.Id == y.Id);
            if (x is null) { db.Flashcards.Add(y); continue; }
            x.TopicId = y.TopicId;
            x.Front = y.Front;
            x.Back = y.Back;
            x.Category = y.Category;
            x.Difficulty = y.Difficulty;
        }
        db.SaveChanges();
    }

    private static Topic[] GetTopics() =>
    [
        new Topic { Id = 1, Name = "Linear Scan", Description = "Single pass with counters and state tracking." },
        new Topic { Id = 2, Name = "HashSet", Description = "Fast uniqueness and membership checks." },
        new Topic { Id = 3, Name = "Dictionary", Description = "Frequency maps and key-value lookups." },
        new Topic { Id = 4, Name = "Two Pointers", Description = "Coordinate two indices to process arrays/strings." },
        new Topic { Id = 5, Name = "Sliding Window", Description = "Grow and shrink a range while keeping constraints." },
        new Topic { Id = 6, Name = "Sorting", Description = "Order data to simplify downstream logic." },
        new Topic { Id = 7, Name = "Binary Search", Description = "Halve search space using monotonic conditions." },
        new Topic { Id = 8, Name = "Queue", Description = "FIFO processing for order-sensitive tasks." },
        new Topic { Id = 9, Name = "Stack", Description = "LIFO behavior for nested and reverse operations." },
        new Topic { Id = 10, Name = "Prefix Sum", Description = "Precompute cumulative sums for range queries." },
        new Topic { Id = 11, Name = "Matrix Basics", Description = "Traverse 2D grids safely and efficiently." },
        new Topic { Id = 12, Name = "BFS/DFS Basics", Description = "Fundamental graph/grid traversal patterns." }
    ];

    private static Problem[] GetProblems() =>
    [
        new Problem { Id = 1, Title = "Contains Duplicate", Slug = "contains-duplicate", Difficulty = "Easy", TopicId = 2, ProblemStatement = "Given an integer array nums, return true if any value appears at least twice." },
        new Problem { Id = 2, Title = "Valid Anagram", Slug = "valid-anagram", Difficulty = "Easy", TopicId = 3, ProblemStatement = "Given two strings s and t, return true if t is an anagram of s." },
        new Problem { Id = 3, Title = "Pangram", Slug = "pangram", Difficulty = "Easy", TopicId = 2, ProblemStatement = "Given a sentence, return true if it contains every lowercase English letter at least once." },
        new Problem { Id = 4, Title = "Valid Palindrome", Slug = "valid-palindrome", Difficulty = "Easy", TopicId = 4, ProblemStatement = "Return true if a string is a palindrome after removing non-alphanumeric chars and ignoring case." },
        new Problem { Id = 5, Title = "Reverse Vowels of a String", Slug = "reverse-vowels", Difficulty = "Easy", TopicId = 4, ProblemStatement = "Reverse only vowels in a string and return the result." },
        new Problem { Id = 6, Title = "Move Zeroes", Slug = "move-zeroes", Difficulty = "Easy", TopicId = 4, ProblemStatement = "Move all 0s to the end while preserving non-zero order, in-place." },
        new Problem { Id = 7, Title = "First Unique Character in a String", Slug = "first-unique-character", Difficulty = "Easy", TopicId = 3, ProblemStatement = "Return index of first non-repeating character, or -1." }
    ];
    private static ProblemExplanation[] GetExplanations() =>
    [
        Ex(1, "HashSet", "duplicate|seen before|unique", "Seen before -> duplicate",
            "Task is to detect any repeat as early as possible.", "Nested loops compare all pairs.", "One pass with HashSet membership.",
            "1) Ask: any value appears twice?||2) Key op: fast membership check.||3) Signals: duplicate, seen before.||4) Pattern: HashSet.||5) Brute force: O(n^2) pair checks.||6) Better: scan once + set.||7) Edge cases: empty/single/all unique.||8) Complexity: O(n) time O(n) space.||9) Interview: early return on first repeat.",
            "Create empty HashSet<int>.||Loop each n.||If already in set return true.||Else add n.||After loop return false.",
            "nums=[1,4,2,4]\nseen:{} -> {1}->{1,4}->{1,4,2}\n4 already seen => true",
            "We only need seen/not-seen state.", "Dictionary counts are unnecessary.||Sorting is O(n log n).||Two pointers do not fit unsorted membership.",
            "Time O(n), Space O(n).",
            "Using List.Contains gives O(n^2).", "Forgetting early return.", "Not stating memory tradeoff.",
            "[] -> false.||[7] -> false.||Duplicate at start should return early.",
            "Important: HashSet vs Dictionary difference.||Important: fail fast on duplicate.||Nice to have: articulate space-time tradeoff.",
            "I keep a HashSet of seen values and return true immediately when insertion fails.",
            "Используем HashSet: если число уже было, сразу true."),
        Ex(2, "Dictionary", "anagram|same letters|frequency", "Need count -> Dictionary",
            "Anagram means equal frequencies, not equal order.", "Sort both strings and compare.", "Frequency map with increment/decrement.",
            "1) Ask: same letters with same counts?||2) Key op: count chars.||3) Signals: anagram, rearrange.||4) Pattern: Dictionary.||5) Brute force: sort and compare.||6) Better: count up/down in O(n).||7) Edge cases: length mismatch/repeats.||8) Complexity: O(n) time O(k) space.||9) Interview: frequency balance.",
            "If lengths differ return false.||Count chars in s.||Decrement with t.||If missing or negative return false.||Else true.",
            "anagram vs nagaram\ncounts from s, subtract by t, all zeros => true",
            "Multiplicity matters, so map char->count is natural.", "HashSet loses frequency.||Two pointers compare positions, not bag of chars.||Sorting is slower.",
            "Time O(n), Space O(k).",
            "Skipping length check.", "Allowing negative counts.", "Not mentioning fixed alphabet optimization.",
            "Different lengths -> false.||Empty strings -> true.||Repeated chars must match counts.",
            "Important: HashSet cannot represent multiplicity.||Important: detect missing char early.||Nice to have: fixed alphabet => effective O(1) space.",
            "I compare frequency balance by counting s and decrementing with t; any deficit means not an anagram.",
            "Считаем частоты в первой строке и вычитаем во второй; если всё сошлось, это анаграмма."),
        Ex(3, "HashSet", "every letter|alphabet|at least once", "26 unique letters = pangram",
            "This is alphabet coverage, not ordering.", "Check each letter a..z against sentence.", "Collect unique letters and verify 26.",
            "1) Ask: all 26 letters present?||2) Key op: unique coverage tracking.||3) Signals: every letter, at least once.||4) Pattern: HashSet.||5) Brute force: 26 scans.||6) Better: single pass set insert.||7) Edge cases: uppercase/punctuation.||8) Complexity: O(n) time O(1) space bound by 26.||9) Interview: coverage with bounded set.",
            "Create HashSet<char>.||Lowercase each char.||If a-z add to set.||Return set.Count==26.",
            "thequick... set grows\nwhen set size reaches 26 => pangram",
            "Set directly models unique-letter coverage.", "Dictionary adds unnecessary counts.||Two pointers cannot verify full alphabet coverage.",
            "Time O(n), Space O(1) bounded by 26.",
            "Not normalizing case.", "Counting punctuation as letters.", "Not explaining bounded-space argument.",
            "Length < 26 cannot be pangram.||Uppercase letters should count after lowercase.||Repeated letters should not affect result.",
            "Important: normalize case.||Important: space is O(1) due to fixed alphabet.||Nice to have: early return once count==26.",
            "I track unique alphabet letters in a set and confirm that the final size is 26.",
            "Добавляем буквы в HashSet и проверяем, что получили все 26 символов."),
        Ex(4, "Two Pointers", "palindrome|compare both ends|ignore non-alnum", "outside -> compare -> inside",
            "Palindrome is mirrored equality from edges inward.", "Clean string then compare with reverse.", "Skip non-alnum on both ends and compare in place.",
            "1) Ask: string symmetric after cleanup?||2) Key op: mirrored compare.||3) Signals: palindrome, both ends.||4) Pattern: Two pointers.||5) Brute force: filtered reverse compare.||6) Better: in-place pointer walk.||7) Edge cases: empty/only symbols/mixed case.||8) Complexity: O(n) time O(1) extra space.||9) Interview: skip + compare + move inward.",
            "left=0,right=n-1.||Move left to alnum.||Move right to alnum.||Compare lowercase chars.||Mismatch false; else move inward.",
            "A man, a plan, a canal: Panama\n^                           ^\nskip non-alnum -> compare -> move inward",
            "Only mirrored character equality matters.", "HashSet/Dictionary ignore positional symmetry.||Sliding window is unrelated.",
            "Time O(n), Space O(1).",
            "Not lowercasing before compare.", "Incorrect pointer skipping logic.", "Not stating O(1) memory advantage.",
            "Empty string true.||Only punctuation true.||Odd center char is fine.",
            "Important: understand left++ and right-- invariants.||Important: skip symbols before compare.||Nice to have: explain in-place memory benefit.",
            "I compare normalized characters from both ends while skipping non-alphanumeric symbols, and stop on first mismatch.",
            "Сравниваем символы с краёв, пропуская лишнее; если все пары совпали, это палиндром."),
        Ex(5, "Two Pointers", "reverse only selected chars|vowels|swap", "find vowel left + find vowel right + swap",
            "Only vowel positions move; consonants stay fixed.", "Collect vowels and rebuild string.", "Two pointers find next vowel pair and swap.",
            "1) Ask: reverse only vowels.||2) Key op: targeted swaps by position.||3) Signals: reverse only, vowels.||4) Pattern: Two pointers.||5) Brute force: extract/reinsert vowels.||6) Better: in-place char array swaps.||7) Edge cases: no vowels/single vowel/uppercase.||8) Complexity: O(n) time O(n) due to char array.||9) Interview: skip non-vowels, swap vowels only.",
            "Convert to char[].||left=0,right=n-1.||Move left to vowel.||Move right to vowel.||Swap and move inward.",
            "hello\nh e l l o\n  ^     ^\n  e     o -> swap => holle",
            "Two pointers pair the next left vowel with next right vowel.", "Dictionary/HashSet do not place swapped chars by index.||Sliding window is unrelated.",
            "Time O(n), Space O(n) for mutable char array.",
            "Missing uppercase vowels.", "Forgetting pointer moves after swap.", "Not explaining string immutability in C#.",
            "No vowels => unchanged.||One vowel => unchanged.||Upper/lower vowels both valid.",
            "Important: include AEIOU and aeiou.||Important: pointer updates avoid infinite loop.||Nice to have: explain why char[] is needed in C#.",
            "I scan from both ends, skip non-vowels, swap vowel pairs, and continue inward.",
            "Два указателя ищут гласные слева и справа и меняют их местами."),
        Ex(6, "Two Pointers", "in-place|preserve order|move zeroes", "fast reads, slow collects / fast читает, slow собирает",
            "Treat zeros as gaps; compact non-zeros forward.", "Create new array with non-zeros then append zeros.", "Use write index for stable in-place compaction.",
            "1) Ask: move zeroes, keep non-zero order.||2) Key op: stable write pointer.||3) Signals: in-place, preserve order.||4) Pattern: Two pointers(read/write).||5) Brute force: extra array.||6) Better: write non-zeros then fill zeros.||7) Edge cases: all zero/no zero/alternating.||8) Complexity: O(n) time O(1) space.||9) Interview: stable compaction.",
            "insertPos=0.||Scan nums.||If n!=0 write nums[insertPos++]=n.||Fill rest with zero.",
            "[0,1,0,3,12]\nwrite 1,3,12 -> [1,3,12,3,12]\nfill tail -> [1,3,12,0,0]",
            "Write pointer preserves encounter order of non-zero elements.", "Sorting breaks required order.||Hash-based patterns ignore in-place index updates.",
            "Time O(n), Space O(1).",
            "Using unstable swaps that reorder non-zeros.", "Forgetting to fill tail with zeroes.", "Not naming read/write pointer roles clearly.",
            "All zeros stays all zeros.||No zeros remains unchanged.||Single-element arrays should work.",
            "Important: distinguish read and write pointers.||Important: keep stable order.||Nice to have: explain why this is in-place.",
            "I stream non-zero values to the next write position, then zero-fill the remainder.",
            "Сжимаем ненули в начало и заполняем хвост нулями без дополнительного массива."),
        Ex(7, "Dictionary", "first unique|non-repeating|index", "count first, scan second",
            "Need first unique by original order, so counting and selection are separate.", "For each char, recount full string.", "Two-pass: count, then first count==1.",
            "1) Ask: index of first char with freq=1.||2) Key op: frequency map + ordered scan.||3) Signals: first unique, non-repeating.||4) Pattern: Dictionary.||5) Brute force: O(n^2) recounts.||6) Better: two-pass O(n).||7) Edge cases: no unique/single char.||8) Complexity: O(n) time O(k) space.||9) Interview: separate counting from order.",
            "Count all chars in dictionary.||Scan string by index.||Return first index where count==1.||Else return -1.",
            "leetcode\ncounts: l1 e3 t1 c1 o1 d1\nfirst count==1 is index 0",
            "Two-pass keeps correctness simple and interview-friendly.", "HashSet cannot represent count==1.||Sorting destroys original index order.",
            "Time O(n), Space O(k).",
            "Trying one-pass without enough state.", "Returning first unseen instead of first count==1.", "Not covering no-answer case.",
            "No unique => -1.||Single char => 0.||Repeated prefix should not hide later unique.",
            "Important: unique vs first unique are different tasks.||Important: HashSet is insufficient here.||Nice to have: mention bounded alphabet optimization.",
            "I first compute frequencies, then scan left to right and return the first index with count one.",
            "Сначала считаем частоты, потом во втором проходе берём первый символ с частотой 1.")
    ];

    private static ProblemSolution[] GetSolutions() =>
    [
        Sol(1, """
public class Solution {
    public bool ContainsDuplicate(int[] nums) {
        var seen = new HashSet<int>();
        foreach (var n in nums) if (!seen.Add(n)) return true;
        return false;
    }
}
""", NUnit("ContainsDuplicate", "new Solution().ContainsDuplicate(new[] {1,2,3,1})", "true")),
        Sol(2, """
public class Solution {
    public bool IsAnagram(string s, string t) {
        if (s.Length != t.Length) return false;
        var freq = new Dictionary<char,int>();
        foreach (var c in s) freq[c] = freq.GetValueOrDefault(c, 0) + 1;
        foreach (var c in t) {
            if (!freq.TryGetValue(c, out var count) || count == 0) return false;
            freq[c] = count - 1;
        }
        return true;
    }
}
""", NUnit("IsAnagram", "new Solution().IsAnagram(\"anagram\",\"nagaram\")", "true")),
        Sol(3, """
public class Solution {
    public bool CheckIfPangram(string sentence) {
        var set = new HashSet<char>();
        foreach (var c in sentence.ToLowerInvariant()) if (c >= 'a' && c <= 'z') set.Add(c);
        return set.Count == 26;
    }
}
""", NUnit("CheckIfPangram", "new Solution().CheckIfPangram(\"thequickbrownfoxjumpsoverthelazydog\")", "true")),
        Sol(4, """
public class Solution {
    public bool IsPalindrome(string s) {
        int left = 0, right = s.Length - 1;
        while (left < right) {
            while (left < right && !char.IsLetterOrDigit(s[left])) left++;
            while (left < right && !char.IsLetterOrDigit(s[right])) right--;
            if (char.ToLowerInvariant(s[left]) != char.ToLowerInvariant(s[right])) return false;
            left++; right--;
        }
        return true;
    }
}
""", NUnit("IsPalindrome", "new Solution().IsPalindrome(\"A man, a plan, a canal: Panama\")", "true")),
        Sol(5, """
public class Solution {
    public string ReverseVowels(string s) {
        var vowels = new HashSet<char>("aeiouAEIOU");
        var chars = s.ToCharArray();
        int left = 0, right = chars.Length - 1;
        while (left < right) {
            while (left < right && !vowels.Contains(chars[left])) left++;
            while (left < right && !vowels.Contains(chars[right])) right--;
            (chars[left], chars[right]) = (chars[right], chars[left]);
            left++; right--;
        }
        return new string(chars);
    }
}
""", NUnit("ReverseVowels", "new Solution().ReverseVowels(\"hello\")", "\"holle\"")),
        Sol(6, """
public class Solution {
    public void MoveZeroes(int[] nums) {
        int insertPos = 0;
        foreach (var n in nums) if (n != 0) nums[insertPos++] = n;
        while (insertPos < nums.Length) nums[insertPos++] = 0;
    }
}
""", """
using NUnit.Framework;
public class MoveZeroesTests {
    [Test]
    public void MoveZeroes_BasicCase() {
        var nums = new[] {0,1,0,3,12};
        new Solution().MoveZeroes(nums);
        CollectionAssert.AreEqual(new[] {1,3,12,0,0}, nums);
    }
}
"""),
        Sol(7, """
public class Solution {
    public int FirstUniqChar(string s) {
        var freq = new Dictionary<char,int>();
        foreach (var c in s) freq[c] = freq.GetValueOrDefault(c, 0) + 1;
        for (int i = 0; i < s.Length; i++) if (freq[s[i]] == 1) return i;
        return -1;
    }
}
""", NUnit("FirstUniqChar", "new Solution().FirstUniqChar(\"leetcode\")", "0"))
    ];

    private static Gap[] GetGaps() =>
    [
        new Gap { Id = 1, TopicId = 4, Severity = 3, Notes = "Need more pointer movement intuition.", UpdatedAtUtc = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc) },
        new Gap { Id = 2, TopicId = 5, Severity = 2, Notes = "Window shrink conditions are inconsistent.", UpdatedAtUtc = new DateTime(2026, 1, 2, 0, 0, 0, DateTimeKind.Utc) }
    ];

    private static Flashcard[] GetFlashcards() =>
    [
        new Flashcard { Id = 1, TopicId = 2, Front = "Seen before?", Back = "Use HashSet.", Category = "pattern recognition", Difficulty = 1 },
        new Flashcard { Id = 2, TopicId = 3, Front = "Need count?", Back = "Use Dictionary<char,int>.", Category = "pattern recognition", Difficulty = 1 },
        new Flashcard { Id = 3, TopicId = 4, Front = "Two ends?", Back = "Use Two Pointers.", Category = "pattern recognition", Difficulty = 1 },
        new Flashcard { Id = 4, TopicId = 5, Front = "Moving segment?", Back = "Think Sliding Window.", Category = "pattern recognition", Difficulty = 1 },
        new Flashcard { Id = 5, TopicId = 4, Front = "outside -> compare -> inside", Back = "Palindrome mnemonic.", Category = "mnemonic", Difficulty = 1 },
        new Flashcard { Id = 6, TopicId = 4, Front = "find vowel left + find vowel right + swap", Back = "Reverse vowels mnemonic.", Category = "mnemonic", Difficulty = 1 },
        new Flashcard { Id = 7, TopicId = 2, Front = "duplicate / seen before / unique", Back = "Wording signals for HashSet.", Category = "wording signals", Difficulty = 1 },
        new Flashcard { Id = 8, TopicId = 3, Front = "Interview phrasing for anagram", Back = "I compare frequency balance, not order.", Category = "interview phrasing", Difficulty = 2 }
    ];

    private static ProblemExplanation Ex(int id, string pattern, string wordingSignals, string mnemonic, string how, string brute, string optimal, string thinkSteps, string algo, string visual, string why, string whyNot, string complexity, string critical, string important, string nice, string edges, string gaps, string en, string ru) => new()
    {
        Id = id,
        ProblemId = id,
        Pattern = pattern,
        WordingSignals = J(wordingSignals),
        Mnemonic = mnemonic,
        PatternSignals = J(wordingSignals),
        HowToThink = string.Empty,
        HowToThinkSteps = MergeHowIntoThinkSteps(how, thinkSteps),
        BruteForceIdea = brute,
        OptimalIdea = optimal,
        StepByStepAlgorithm = algo,
        VisualExplanation = visual,
        WhyThisWorks = why,
        WhyNotOtherPatterns = whyNot,
        Complexity = complexity,
        CommonMistakes = $"{critical}{Sep}{important}{Sep}{nice}",
        CommonMistakesCritical = critical,
        CommonMistakesImportant = important,
        CommonMistakesNiceToHave = nice,
        EdgeCaseChecklist = edges,
        GapLearningHints = gaps,
        EnglishInterviewExplanation = en,
        RussianShortExplanation = ru,
        MentalModelTrigger = "",
        MentalModelCue = "",
        MentalModelScript = "",
        MentalModelTrap = "",
        MentalModelPersonalWords = "",
        MentalModelInterviewPhrase = ""
    };

    private static ProblemSolution Sol(int id, string code, string tests) => new()
    {
        Id = id,
        ProblemId = id,
        Language = "C#",
        SolutionCode = code,
        NUnitTestsCode = tests
    };

    /// <summary>Legacy seed passed a short intro; we fold it into the first "step" instead of a separate HowToThink column.</summary>
    private static string MergeHowIntoThinkSteps(string how, string thinkSteps)
    {
        var h = (how ?? string.Empty).Trim();
        if (h.Length == 0)
        {
            return thinkSteps;
        }
        if (string.IsNullOrEmpty(thinkSteps))
        {
            return h;
        }
        var first = thinkSteps.Split(Sep, 2, StringSplitOptions.None)[0].Trim();
        if (first == h)
        {
            return thinkSteps;
        }
        return h + Sep + thinkSteps;
    }

    private static string J(string value) => value.Replace("|", Sep);

    private static string NUnit(string methodName, string invocation, string expected) =>
        $@"using NUnit.Framework;
public class {methodName}Tests {{
    [Test]
    public void {methodName}_BasicCase() {{
        Assert.That({invocation}, Is.EqualTo({expected}));
    }}
}}";
}
