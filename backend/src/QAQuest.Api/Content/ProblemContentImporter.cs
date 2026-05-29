using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using QAQuest.Api.Data;
using QAQuest.Api.Models;

namespace QAQuest.Api.Content;

public sealed class ProblemContentImporter(AppDbContext db)
{
    private const string Sep = "||";

    public ImportSummary ImportFromDirectory(string contentProblemsPath)
    {
        var summary = new ImportSummary();
        if (!Directory.Exists(contentProblemsPath))
        {
            summary.Errors.Add($"Content path does not exist: {contentProblemsPath}");
            return summary;
        }

        var files = Directory.GetFiles(contentProblemsPath, "*.json", SearchOption.AllDirectories)
            .OrderBy(x => x, StringComparer.OrdinalIgnoreCase)
            .ToArray();

        if (files.Length == 0)
        {
            summary.Errors.Add($"No JSON files found under: {contentProblemsPath}");
            return summary;
        }

        foreach (var file in files)
        {
            var dto = ReadDto(file, summary);
            if (dto is null)
            {
                continue;
            }

            var errors = Validate(dto);
            if (errors.Count > 0)
            {
                foreach (var error in errors)
                {
                    summary.Errors.Add($"{file}: {error}");
                }
                continue;
            }

            Upsert(dto, summary);
        }

        db.SaveChanges();
        return summary;
    }

    private ProblemContentDto? ReadDto(string file, ImportSummary summary)
    {
        try
        {
            var json = File.ReadAllText(file);
            var dto = JsonSerializer.Deserialize<ProblemContentDto>(json, new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            });

            if (dto is null)
            {
                summary.Errors.Add($"{file}: file is empty or invalid JSON object.");
                return null;
            }

            return dto;
        }
        catch (Exception ex)
        {
            summary.Errors.Add($"{file}: {ex.Message}");
            return null;
        }
    }

    private static List<string> Validate(ProblemContentDto dto)
    {
        var errors = new List<string>();

        if (dto.Id <= 0) errors.Add("id must be > 0");
        if (string.IsNullOrWhiteSpace(dto.Slug)) errors.Add("slug is required");
        if (string.IsNullOrWhiteSpace(dto.Title)) errors.Add("title is required");
        if (string.IsNullOrWhiteSpace(dto.Topic)) errors.Add("topic is required");
        if (string.IsNullOrWhiteSpace(dto.Pattern)) errors.Add("pattern is required");
        if (string.IsNullOrWhiteSpace(dto.Difficulty)) errors.Add("difficulty is required");
        if (string.IsNullOrWhiteSpace(dto.Statement)) errors.Add("statement is required");
        if (dto.Signals.Length == 0) errors.Add("signals must contain at least one item");
        if (string.IsNullOrWhiteSpace(dto.Mnemonic)) errors.Add("mnemonic is required");
        if (dto.Think.Length == 0) errors.Add("think must contain at least one item");
        if (dto.Algorithm.Length == 0) errors.Add("algorithm must contain at least one item");
        if (string.IsNullOrWhiteSpace(dto.Code)) errors.Add("code is required");
        if (string.IsNullOrWhiteSpace(dto.Tests)) errors.Add("tests is required");
        if (string.IsNullOrWhiteSpace(dto.Interview)) errors.Add("interview is required");
        if (string.IsNullOrWhiteSpace(dto.Ru)) errors.Add("ru is required");
        if (string.IsNullOrWhiteSpace(dto.VisualExplanation)) errors.Add("visualExplanation is required");
        if (dto.Mistakes.Critical.Length == 0) errors.Add("mistakes.critical must contain at least one item");
        if (dto.Mistakes.Important.Length == 0) errors.Add("mistakes.important must contain at least one item");
        if (dto.Mistakes.Nice.Length == 0) errors.Add("mistakes.nice must contain at least one item");
        if (dto.Gaps.Length == 0) errors.Add("gaps must contain at least one item");
        if (dto.EdgeCases.Length == 0) errors.Add("edgeCases must contain at least one item");

        return errors;
    }

    private void Upsert(ProblemContentDto dto, ImportSummary summary)
    {
        var topic = db.Topics.FirstOrDefault(t => t.Name.ToLower() == dto.Topic.ToLower());
        if (topic is null)
        {
            topic = new Topic { Name = dto.Topic, Description = $"{dto.Topic} imported from content JSON." };
            db.Topics.Add(topic);
            db.SaveChanges();
        }

        var problemById = db.Problems.Include(p => p.Explanation).FirstOrDefault(p => p.Id == dto.Id);
        var problemBySlug = db.Problems.Include(p => p.Explanation).FirstOrDefault(p => p.Slug == dto.Slug);
        var problem = problemById ?? problemBySlug;

        if (problemById is null && problemBySlug is not null && problemBySlug.Id != dto.Id)
        {
            summary.Errors.Add($"Slug '{dto.Slug}' already exists with id={problemBySlug.Id}; incoming id={dto.Id}. Using existing id.");
        }

        if (problem is null)
        {
            problem = new Problem
            {
                Id = dto.Id,
                Title = dto.Title,
                Slug = dto.Slug,
                Difficulty = dto.Difficulty,
                ProblemStatement = dto.Statement,
                TopicId = topic.Id
            };
            db.Problems.Add(problem);
            summary.CreatedProblems++;
        }
        else
        {
            problem.Title = dto.Title;
            problem.Slug = dto.Slug;
            problem.Difficulty = dto.Difficulty;
            problem.ProblemStatement = dto.Statement;
            problem.TopicId = topic.Id;
            summary.UpdatedProblems++;
        }

        db.SaveChanges();

        var explanation = db.ProblemExplanations.FirstOrDefault(e => e.ProblemId == problem.Id);
        if (explanation is null)
        {
            explanation = new ProblemExplanation
            {
                ProblemId = problem.Id
            };
            db.ProblemExplanations.Add(explanation);
        }

        explanation.Pattern = dto.Pattern;
        var signalsJoin = Join(dto.Signals);
        explanation.WordingSignals = signalsJoin;
        explanation.Mnemonic = dto.Mnemonic;
        explanation.PatternSignals = signalsJoin;
        explanation.HowToThink = string.Empty;
        explanation.HowToThinkSteps = Join(dto.Think);
        explanation.BruteForceIdea = dto.Examples is { Length: > 0 }
            ? dto.Examples[0]
            : "Brute force is possible but usually slower.";
        explanation.OptimalIdea = "Use the chosen pattern with the listed algorithm steps.";
        explanation.StepByStepAlgorithm = Join(dto.Algorithm);
        explanation.VisualExplanation = dto.VisualExplanation;
        explanation.WhyThisWorks = string.IsNullOrWhiteSpace(dto.WhyThisPattern)
            ? $"Pattern '{dto.Pattern}' matches this task's wording signals."
            : dto.WhyThisPattern;
        explanation.WhyNotOtherPatterns = Join(dto.WhyNotOtherPatterns ?? []);
        explanation.Complexity = BuildComplexityHint(dto.Pattern);
        explanation.CommonMistakes = Join([.. dto.Mistakes.Critical, .. dto.Mistakes.Important, .. dto.Mistakes.Nice]);
        explanation.CommonMistakesCritical = Join(dto.Mistakes.Critical);
        explanation.CommonMistakesImportant = Join(dto.Mistakes.Important);
        explanation.CommonMistakesNiceToHave = Join(dto.Mistakes.Nice);
        explanation.EdgeCaseChecklist = Join(dto.EdgeCases);
        explanation.GapLearningHints = Join(dto.Gaps);
        explanation.EnglishInterviewExplanation = dto.Interview;
        explanation.RussianShortExplanation = dto.Ru;

        // Keep every C# solution row in sync (users may have duplicated rows); if none, create one.
        var solutionRows = db.ProblemSolutions
            .Where(s => s.ProblemId == problem.Id && s.Language == "C#")
            .ToList();

        if (solutionRows.Count == 0)
        {
            db.ProblemSolutions.Add(new ProblemSolution
            {
                ProblemId = problem.Id,
                Language = "C#",
                SolutionCode = dto.Code,
                NUnitTestsCode = dto.Tests
            });
        }
        else
        {
            foreach (var row in solutionRows)
            {
                row.SolutionCode = dto.Code;
                row.NUnitTestsCode = dto.Tests;
            }
        }
    }

    private static string Join(IEnumerable<string> values) =>
        string.Join(Sep, values.Where(x => !string.IsNullOrWhiteSpace(x)).Select(x => x.Trim()));

    private static string BuildComplexityHint(string pattern) => pattern.ToLower() switch
    {
        "hashset" => "Usually O(n) time, O(n) space.",
        "dictionary" => "Usually O(n) time, O(k) space.",
        "two pointers" => "Usually O(n) time with low extra space.",
        "sliding window" => "Usually O(n) time, O(k) space.",
        "binary search" => "Usually O(log n) time, O(1) extra space on a static sorted array.",
        _ => "Complexity depends on chosen implementation."
    };
}

public sealed class ImportSummary
{
    public int CreatedProblems { get; set; }
    public int UpdatedProblems { get; set; }
    public List<string> Errors { get; } = [];
}
