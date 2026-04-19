export type NavItem = { href: string; label: string };

export const navItems: NavItem[] = [
  { href: "/", label: "Dashboard" },
  { href: "/patterns", label: "Patterns Map" },
  { href: "/problems", label: "Problems" },
  { href: "/gaps", label: "Gap Map" },
  { href: "/flashcards", label: "Flashcards" }
];

export const dashboardStats = {
  xp: 1240,
  streak: 9,
  level: 6,
  completedTasks: 37,
  weakTopics: ["Sliding Window", "Binary Search", "BFS/DFS Basics"]
};

export const patterns = [
  { name: "Linear Scan", status: "Mastered", progress: 90 },
  { name: "HashSet", status: "Strong", progress: 80 },
  { name: "Dictionary", status: "Strong", progress: 76 },
  { name: "Two Pointers", status: "Learning", progress: 58 },
  { name: "Sliding Window", status: "Weak", progress: 35 },
  { name: "Sorting", status: "Learning", progress: 54 },
  { name: "Binary Search", status: "Weak", progress: 28 },
  { name: "Queue", status: "Learning", progress: 43 },
  { name: "Stack", status: "Learning", progress: 49 },
  { name: "Prefix Sum", status: "Weak", progress: 31 },
  { name: "Matrix Basics", status: "Learning", progress: 41 },
  { name: "BFS/DFS Basics", status: "Weak", progress: 26 }
];

export const problems = [
  { id: 1, title: "Contains Duplicate", pattern: "HashSet", difficulty: "Easy", solved: true },
  { id: 2, title: "Valid Anagram", pattern: "Dictionary", difficulty: "Easy", solved: true },
  { id: 3, title: "Pangram", pattern: "HashSet", difficulty: "Easy", solved: false },
  { id: 4, title: "Valid Palindrome", pattern: "Two Pointers", difficulty: "Easy", solved: false },
  { id: 5, title: "Reverse Vowels of a String", pattern: "Two Pointers", difficulty: "Easy", solved: false },
  { id: 6, title: "Move Zeroes", pattern: "Two Pointers", difficulty: "Easy", solved: false },
  { id: 7, title: "First Unique Character in a String", pattern: "Dictionary", difficulty: "Easy", solved: false }
];

export const problemDetails = {
  id: 1,
  title: "Contains Duplicate",
  statement: "Given an integer array nums, return true if any value appears at least twice in the array.",
  pattern: "HashSet",
  wordingSignals: "appears at least twice, duplicates, detect repeat quickly",
  howToThink: "The moment a number repeats, we can stop. We need memory of what we already saw.",
  algorithmSteps: [
    "Create an empty HashSet<int> called seen.",
    "Loop through each number in nums.",
    "If number already exists in seen, return true.",
    "Otherwise add it to seen and continue.",
    "If loop ends, return false."
  ],
  mistakes: [
    "Using List.Contains causes O(n²) behavior.",
    "Forgetting to return early when duplicate is found.",
    "Mixing up HashSet.Add semantics."
  ],
  code: `public bool ContainsDuplicate(int[] nums)\n{\n    var seen = new HashSet<int>();\n    foreach (var n in nums)\n    {\n        if (!seen.Add(n)) return true;\n    }\n    return false;\n}`,
  tests: `[Test]\npublic void ContainsDuplicate_ReturnsTrue_WhenDuplicateExists()\n{\n    Assert.That(new Solution().ContainsDuplicate(new[] {1,2,3,1}), Is.True);\n}`
};

export const flashcards = [
  { id: 1, topic: "HashSet", front: "When to use HashSet?", back: "When you need fast uniqueness and membership checks." },
  { id: 2, topic: "Two Pointers", front: "Core idea?", back: "Move two indices with an invariant until they meet." },
  { id: 3, topic: "Dictionary", front: "Common use?", back: "Frequency counting and quick key lookups." }
];
