using System.Text;
using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using QAQuest.Api.Data;
using QAQuest.Api.Models;

namespace QAQuest.Api.Content;

/// <summary>
/// Parses the NotebookLM-style markdown export (17 category blocks, ### questions, bold-tagged answer sections)
/// and inserts <see cref="InterviewQuestion"/> rows with the C# interview coach tab tag.
/// </summary>
public sealed partial class MiddleCsharpQaMarkdownImporter(AppDbContext db)
{
    private const string ListJoinSep = "||";
    public const string CSharpInterviewTabTag = "csharp-interview-tab";

    private const string EnglishLabel = "English interview answer";
    private const string RussianLabel = "Простое объяснение на русском";
    private const string MemoryLabel = "Memory cue";
    private const string TrapLabel = "Common trap";
    private const string FollowUpLabel = "Possible follow-up questions";

    [GeneratedRegex(@"^\*\*(.+?)\*\*\s*(.*)$", RegexOptions.CultureInvariant)]
    private static partial Regex BoldSectionRegex();

    public MiddleCsharpQaImportResult ImportFromMarkdownFile(string filePath, CancellationToken cancellationToken = default)
    {
        var result = new MiddleCsharpQaImportResult();
        if (string.IsNullOrWhiteSpace(filePath))
        {
            result.Errors.Add("Markdown file path is empty.");
            return result;
        }

        if (!File.Exists(filePath))
        {
            result.Errors.Add($"File not found: {filePath}");
            return result;
        }

        string[] lines;
        try
        {
            lines = File.ReadAllLines(filePath, Encoding.UTF8);
        }
        catch (Exception ex)
        {
            result.Errors.Add($"Failed to read file: {ex.Message}");
            return result;
        }

        var parsed = ParseLines(lines, result);
        if (result.Errors.Count > 0 && parsed.Count == 0)
        {
            return result;
        }

        return Persist(parsed, result, cancellationToken);
    }

    private static IReadOnlyList<ParsedQuestion> ParseLines(
        IReadOnlyList<string> lines,
        MiddleCsharpQaImportResult result)
    {
        var list = new List<ParsedQuestion>();
        var category = "General";
        var currentField = (string?)null;
        var buffer = new List<string>();
        var rx = BoldSectionRegex();

        void CommitBuffer()
        {
            if (list.Count < 1 || currentField is null)
            {
                return;
            }

            var last = list[^1];
            var body = string.Join("\n", buffer).Trim();
            buffer.Clear();
            if (string.Equals(currentField, FollowUpLabel, StringComparison.Ordinal))
            {
                foreach (var line in body.Split('\n', StringSplitOptions.None))
                {
                    var t = line.Trim();
                    if (t.Length < 1)
                    {
                        continue;
                    }

                    if (t.StartsWith("- ", StringComparison.Ordinal))
                    {
                        last.FollowUps.Add(t[2..].Trim());
                    }
                    else
                    {
                        last.FollowUps.Add(t);
                    }
                }
            }
            else if (string.Equals(currentField, EnglishLabel, StringComparison.Ordinal))
            {
                last.English = body;
            }
            else if (string.Equals(currentField, RussianLabel, StringComparison.Ordinal))
            {
                last.Russian = body;
            }
            else if (string.Equals(currentField, MemoryLabel, StringComparison.Ordinal))
            {
                last.Memory = body;
            }
            else if (string.Equals(currentField, TrapLabel, StringComparison.Ordinal))
            {
                last.Trap = body;
            }
        }

        foreach (var line in lines)
        {
            if (line.StartsWith("### ", StringComparison.Ordinal))
            {
                var qTitle = line[4..].Trim();
                if (qTitle.Length < 1)
                {
                    result.Errors.Add("Encountered '###' with an empty title.");
                    continue;
                }

                CommitBuffer();
                currentField = null;
                list.Add(new ParsedQuestion
                {
                    Category = category,
                    Title = qTitle
                });
                continue;
            }

            if (line.StartsWith("## ", StringComparison.Ordinal) && !line.StartsWith("###", StringComparison.Ordinal))
            {
                CommitBuffer();
                currentField = null;
                category = line[3..].Trim();
                if (category.Length < 1)
                {
                    category = "General";
                }
                continue;
            }

            var m = rx.Match(line);
            if (m.Success)
            {
                if (list.Count < 1)
                {
                    continue;
                }

                CommitBuffer();
                var label = m.Groups[1].Value.Trim();
                currentField = label;
                var sameLine = m.Groups[2].Value.Trim();
                if (sameLine.Length > 0)
                {
                    buffer.Add(sameLine);
                }

                continue;
            }

            if (list.Count > 0 && currentField is not null)
            {
                buffer.Add(line);
            }
        }

        CommitBuffer();

        if (list.Count < 1)
        {
            result.Errors.Add("No questions found (no '###' headings).");
        }

        return list;
    }

    private static string JoinList(IReadOnlyList<string> items) =>
        string.Join(ListJoinSep, items
            .Select(s => s.Trim())
            .Where(s => s.Length > 0));

    private static string JoinTags() => CSharpInterviewTabTag;

    private static string NormalizeCategory(string category)
    {
        var c = category.Trim();
        return c.Length < 1 ? "General" : c;
    }

    private MiddleCsharpQaImportResult Persist(
        IReadOnlyList<ParsedQuestion> items,
        MiddleCsharpQaImportResult result,
        CancellationToken cancellationToken)
    {
        if (items.Count < 1)
        {
            return result;
        }

        var now = DateTime.UtcNow;
        var sortBase = db.InterviewQuestions.AsNoTracking().Any()
            ? db.InterviewQuestions.AsNoTracking().Max(x => x.SortOrder)
            : 0;

        var order = sortBase;
        var batchTitles = new HashSet<string>(StringComparer.Ordinal);
        foreach (var item in items)
        {
            cancellationToken.ThrowIfCancellationRequested();
            var t = item.Title.Trim();
            if (t.Length < 1)
            {
                result.Skipped++;
                result.Errors.Add("Skipped: empty title.");
                continue;
            }

            if (t.Length > 500)
            {
                t = t[..500];
            }

            var english = item.English.Trim();
            // Titles are unique; many cards share the same short English "template" answer — bind QuestionText to the title
            // so API duplicate rules and the coach list stay correct.
            var questionText = string.IsNullOrEmpty(english) ? t : string.Concat(t, "\n\n", english);
            if (questionText.Length < 1)
            {
                result.Skipped++;
                result.Errors.Add($"Skipped: no question text for: {t}");
                continue;
            }

            if (questionText.Length > 50_000)
            {
                questionText = questionText[..50_000];
            }

            if (batchTitles.Contains(t))
            {
                result.Skipped++;
                result.Errors.Add($"Duplicate title in source file: {t}");
                continue;
            }

            var dup = db.InterviewQuestions
                .AsNoTracking()
                .Any(
                    x => x.IsActive
                         && (x.Title == t || x.QuestionText == questionText));
            if (dup)
            {
                result.Skipped++;
                result.DuplicateSkipped++;
                continue;
            }

            batchTitles.Add(t);
            order++;
            var row = new InterviewQuestion
            {
                Title = t,
                QuestionText = questionText,
                Category = NormalizeCategory(item.Category),
                Difficulty = "Easy",
                Tags = JoinTags(),
                AnswerEnglish = english,
                AnswerRussian = item.Russian.Trim(),
                MemoryCue = item.Memory.Trim(),
                CommonTrap = item.Trap.Trim(),
                FollowUpQuestions = JoinList(item.FollowUps),
                Notes = string.Empty,
                SortOrder = order,
                IsPublished = true,
                IsActive = true,
                CreatedAtUtc = now,
                UpdatedAtUtc = now
            };
            db.InterviewQuestions.Add(row);
            result.Created++;
        }

        if (result.Created > 0)
        {
            db.SaveChanges();
        }

        return result;
    }

    private sealed class ParsedQuestion
    {
        public string Category { get; init; } = "General";
        public string Title { get; init; } = string.Empty;
        public string English { get; set; } = string.Empty;
        public string Russian { get; set; } = string.Empty;
        public string Memory { get; set; } = string.Empty;
        public string Trap { get; set; } = string.Empty;
        public List<string> FollowUps { get; } = new();
    }
}

public sealed class MiddleCsharpQaImportResult
{
    public int Created { get; set; }
    public int Skipped { get; set; }
    public int DuplicateSkipped { get; set; }
    public List<string> Errors { get; } = new();
}
