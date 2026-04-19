using Microsoft.EntityFrameworkCore;
using QAQuest.Api.Models;

namespace QAQuest.Api.Seed;

public static class SeedData
{
    public static void Apply(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Topic>().HasData(GetTopics());
        modelBuilder.Entity<Problem>().HasData(GetProblems());
        modelBuilder.Entity<ProblemExplanation>().HasData(GetExplanations());
        modelBuilder.Entity<ProblemSolution>().HasData(GetSolutions());
        modelBuilder.Entity<Gap>().HasData(
            new Gap { Id = 1, TopicId = 4, Severity = 3, Notes = "Need more pointer movement intuition.", UpdatedAtUtc = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc) },
            new Gap { Id = 2, TopicId = 5, Severity = 2, Notes = "Window shrink conditions are inconsistent.", UpdatedAtUtc = new DateTime(2026, 1, 2, 0, 0, 0, DateTimeKind.Utc) }
        );
        modelBuilder.Entity<Flashcard>().HasData(
            new Flashcard { Id = 1, TopicId = 2, Front = "When to use HashSet?", Back = "When you need O(1) average-time membership checks and uniqueness.", Difficulty = 1 },
            new Flashcard { Id = 2, TopicId = 4, Front = "Two pointers key invariant?", Back = "Pointers define a valid region and always move toward termination.", Difficulty = 2 }
        );
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
        BuildExplanation(1, "HashSet", "duplicate, appears at least twice", "Track seen values as you scan once. If current value already exists in set, you found a duplicate immediately.", "Compare each number with every later number (nested loop).", "Use HashSet membership check while scanning once.", "1) Create empty HashSet<int>. 2) For each n in nums: if set.Contains(n) return true. 3) Else set.Add(n). 4) Return false.", "Set stores unique numbers. The first repeat is detected at O(1) average membership cost.", "Time O(n), Space O(n).", "Forgetting early return, or using List.Contains causing O(n^2).", "In interviews: I optimize duplicate detection with a HashSet to avoid pairwise comparison. One pass is enough because set membership tells me if the value appeared before.", "Используем HashSet: если число уже встречалось — сразу true."),
        BuildExplanation(2, "Dictionary", "anagram, same letters, rearrange", "Anagrams have identical character frequency counts.", "Sort both strings and compare resulting strings.", "Count chars in s then decrement using t, ensuring all counts end at zero.", "1) If lengths differ, false. 2) Build Dictionary<char,int> from s. 3) Traverse t and decrement counts; fail if missing/negative. 4) Ensure all counts are zero.", "Each character contributes +1 in s and -1 in t. Perfect anagram balances all counts.", "Time O(n), Space O(k) where k is alphabet size seen.", "Not checking equal length first; allowing negative counts.", "I frame anagram checking as frequency balance: same bag of letters, different order. A dictionary gives linear-time comparison.", "Сравниваем частоты символов в двух строках за O(n)."),
        BuildExplanation(3, "HashSet", "contains every letter, alphabet", "You only care whether each letter appeared at least once.", "For each alphabet letter from a to z, search whole sentence.", "Insert letters into set, then check set size equals 26.", "1) Create HashSet<char>. 2) For each c in sentence lowercase: if between a-z add to set. 3) Return set.Count == 26.", "Set uniqueness naturally models 'at least once'. Once 26 unique letters exist, sentence is pangram.", "Time O(n), Space O(1) bounded by 26.", "Forgetting case normalization; counting punctuation as letters.", "I map the requirement to unique coverage of 26 letters. HashSet is the most direct abstraction.", "Нужно покрыть 26 букв: HashSet и проверка Count == 26."),
        BuildExplanation(4, "Two Pointers", "palindrome, ignore non-alphanumeric", "Compare mirrored characters from both ends, skipping irrelevant chars.", "Build cleaned string then compare with reverse.", "Use two pointers in original string to avoid extra string creation.", "1) left=0,right=n-1. 2) Move left/right to alphanumeric chars. 3) Compare lowercase chars. 4) If mismatch false, else move inward. 5) Finish true.", "Palindrome property depends on mirrored equality only; skipping punctuation keeps invariant intact.", "Time O(n), Space O(1).", "Not skipping both pointers correctly; incorrect char normalization.", "I preserve O(1) space by checking symmetry directly on the original string with two pointers and normalization on the fly.", "Два указателя с пропуском символов и сравнением по краям."),
        BuildExplanation(5, "Two Pointers", "reverse only vowels", "Swap vowels from both ends while leaving consonants untouched.", "Collect vowels list then rebuild string.", "Use char array + two pointers seeking vowels, then swap.", "1) Convert to char[]. 2) left/right pointers. 3) Move each until vowel. 4) Swap, move inward. 5) Build final string.", "Only vowel positions change; each swap places two vowels into final positions.", "Time O(n), Space O(n) for mutable char array copy of string.", "Missing uppercase vowels; pointer not advanced after swap.", "I use two pointers to localize swaps to vowel positions, ensuring linear processing and no unnecessary operations.", "Меняем местами только гласные двумя указателями."),
        BuildExplanation(6, "Two Pointers", "move zeroes in-place", "Maintain a write pointer for next non-zero placement.", "Create new array for non-zero values then fill tail with zeroes.", "Stable compaction in-place: write non-zeros forward then fill remainder with zero.", "1) insertPos=0. 2) Scan array, copy non-zero to nums[insertPos++] 3) Fill from insertPos to end with 0.", "All non-zero elements preserve relative order because they are written in encounter order.", "Time O(n), Space O(1).", "Swapping every time can break clarity; forgetting to zero-fill tail.", "I treat zeros as gaps and compact non-zeros forward with a write index, then pad trailing cells with zeros.", "Сжимаем ненули вперёд, хвост заполняем нулями."),
        BuildExplanation(7, "Dictionary", "first non-repeating", "First count frequencies, then find earliest character with count 1.", "For each char, rescan string to count occurrences.", "Two-pass frequency map: count then locate first unique index.", "1) Count chars in Dictionary<char,int>. 2) Iterate original string; first char with count==1 returns index. 3) Else -1.", "Separating counting from selection guarantees earliest unique index is found correctly.", "Time O(n), Space O(k).", "Trying single pass without storing first positions carefully can miss earliest index.", "I split the problem into frequency measurement and ordered selection, which keeps correctness simple and linear.", "Сначала считаем частоты, затем ищем первый символ с частотой 1.")
    ];

    private static ProblemSolution[] GetSolutions() =>
    [
        BuildSolution(1, """
public class Solution {
    public bool ContainsDuplicate(int[] nums) {
        var seen = new HashSet<int>();
        foreach (var n in nums) {
            if (!seen.Add(n)) return true;
        }
        return false;
    }
}
""", NUnitTemplate("ContainsDuplicate", "new Solution().ContainsDuplicate(new[] {1,2,3,1})", "true")),
        BuildSolution(2, """
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
""", NUnitTemplate("IsAnagram", "new Solution().IsAnagram(\"anagram\",\"nagaram\")", "true")),
        BuildSolution(3, """
public class Solution {
    public bool CheckIfPangram(string sentence) {
        var set = new HashSet<char>();
        foreach (var c in sentence.ToLowerInvariant()) {
            if (c >= 'a' && c <= 'z') set.Add(c);
        }
        return set.Count == 26;
    }
}
""", NUnitTemplate("CheckIfPangram", "new Solution().CheckIfPangram(\"thequickbrownfoxjumpsoverthelazydog\")", "true")),
        BuildSolution(4, """
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
""", NUnitTemplate("IsPalindrome", "new Solution().IsPalindrome(\"A man, a plan, a canal: Panama\")", "true")),
        BuildSolution(5, """
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
""", NUnitTemplate("ReverseVowels", "new Solution().ReverseVowels(\"hello\")", "\"holle\"")),
        BuildSolution(6, """
public class Solution {
    public void MoveZeroes(int[] nums) {
        int insertPos = 0;
        foreach (var n in nums) {
            if (n != 0) nums[insertPos++] = n;
        }
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
        BuildSolution(7, """
public class Solution {
    public int FirstUniqChar(string s) {
        var freq = new Dictionary<char,int>();
        foreach (var c in s) freq[c] = freq.GetValueOrDefault(c, 0) + 1;
        for (int i = 0; i < s.Length; i++) {
            if (freq[s[i]] == 1) return i;
        }
        return -1;
    }
}
""", NUnitTemplate("FirstUniqChar", "new Solution().FirstUniqChar(\"leetcode\")", "0"))
    ];

    private static ProblemExplanation BuildExplanation(
        int problemId,
        string pattern,
        string wordingSignals,
        string howToThink,
        string bruteForce,
        string optimal,
        string algorithm,
        string why,
        string complexity,
        string mistakes,
        string english,
        string russian) => new()
    {
        Id = problemId,
        ProblemId = problemId,
        Pattern = pattern,
        WordingSignals = wordingSignals,
        HowToThink = howToThink,
        BruteForceIdea = bruteForce,
        OptimalIdea = optimal,
        StepByStepAlgorithm = algorithm,
        WhyThisWorks = why,
        Complexity = complexity,
        CommonMistakes = mistakes,
        EnglishInterviewExplanation = english,
        RussianShortExplanation = russian
    };

    private static ProblemSolution BuildSolution(int problemId, string solution, string tests) => new()
    {
        Id = problemId,
        ProblemId = problemId,
        Language = "C#",
        SolutionCode = solution,
        NUnitTestsCode = tests
    };

    private static string NUnitTemplate(string methodName, string invocation, string expected) =>
        $@"using NUnit.Framework;

public class {methodName}Tests
{{
    [Test]
    public void {methodName}_BasicCase()
    {{
        Assert.That({invocation}, Is.EqualTo({expected}));
    }}
}}";
}
