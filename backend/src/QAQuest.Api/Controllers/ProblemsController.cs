using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using QAQuest.Api.Data;
using QAQuest.Api.Dtos;
using QAQuest.Api.Models;
using System.Text.RegularExpressions;

namespace QAQuest.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ProblemsController(AppDbContext db) : ControllerBase
{
    private const int MaxSolutionCodeLength = 200_000;
    private const int MaxLabelLength = 200;
    private const int MaxExplanationFieldLength = 200_000;
    private const string ListJoinSep = "||";
    private static readonly string[] DifficultyAllowed = { "Easy", "Medium", "Hard" };
    private static readonly Regex LeadingOrdinalRegex = new(@"^\d+\.\s+", RegexOptions.Compiled);
    [HttpGet]
    public async Task<ActionResult<ApiResponse<object>>> GetAll()
    {
        var problems = await db.Problems
            .Include(p => p.Topic)
            .Include(p => p.Explanation)
            .OrderBy(p => p.SortOrder)
            .ThenBy(p => p.Title)
            .ThenBy(p => p.Id)
            .Select(p => new
            {
                p.Id,
                p.Title,
                p.Slug,
                p.SortOrder,
                p.Difficulty,
                p.ProblemStatement,
                Topic = p.Topic!.Name,
                Pattern = p.Explanation != null ? p.Explanation.Pattern : p.Topic!.Name
            })
            .ToListAsync();

        return Ok(ApiResponse<object>.Ok(problems));
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<ApiResponse<object>>> GetById(int id)
    {
        var problem = await db.Problems
            .Include(p => p.Topic)
            .Include(p => p.Explanation)
            .Where(p => p.Id == id)
            .Select(p => new
            {
                p.Id,
                p.Title,
                p.Slug,
                p.Difficulty,
                p.ProblemStatement,
                Topic = p.Topic!.Name,
                Pattern = p.Explanation != null ? p.Explanation.Pattern : p.Topic!.Name
            })
            .FirstOrDefaultAsync();

        return problem is null
            ? NotFound(ApiResponse<object>.Fail("Problem not found."))
            : Ok(ApiResponse<object>.Ok(problem));
    }

    [HttpPost]
    public async Task<ActionResult<ApiResponse<object>>> Create([FromBody] CreateProblemRequest body)
    {
        if (body is null)
        {
            return BadRequest(ApiResponse<object>.Fail("Body is required."));
        }

        var title = normalizeTitle(body.Title);
        if (title.Length == 0)
        {
            return BadRequest(ApiResponse<object>.Fail("Title is required."));
        }

        var slug = (body.Slug ?? string.Empty).Trim();
        if (slug.Length == 0)
        {
            slug = title;
        }

        var statement = (body.ProblemStatement ?? string.Empty).Trim();
        if (statement.Length == 0)
        {
            statement = title;
        }

        var topicName = (body.Topic ?? string.Empty).Trim();
        if (topicName.Length == 0)
        {
            topicName = "General";
        }

        var topic = await db.Topics.FirstOrDefaultAsync(t => t.Name == topicName);
        if (topic is null)
        {
            topic = new Topic { Name = topicName };
            db.Topics.Add(topic);
            await db.SaveChangesAsync();
        }

        var slugBase = slugify(slug);
        if (slugBase.Length == 0)
        {
            slugBase = $"problem-{DateTime.UtcNow:yyyyMMddHHmmss}";
        }

        var uniqueSlug = slugBase;
        var i = 2;
        while (await db.Problems.AsNoTracking().AnyAsync(p => p.Slug == uniqueSlug))
        {
            uniqueSlug = $"{slugBase}-{i++}";
        }

        var difficulty = normalizeDifficulty(body.Difficulty);
        var row = new Problem
        {
            Title = title,
            Slug = uniqueSlug,
            SortOrder = body.SortOrder ?? 0,
            Difficulty = difficulty,
            ProblemStatement = statement,
            TopicId = topic.Id
        };

        db.Problems.Add(row);
        await db.SaveChangesAsync();

        var explanation = new ProblemExplanation
        {
            ProblemId = row.Id,
            Pattern = topicName,
            WordingSignals = string.Empty,
            PatternSignals = string.Empty,
            Mnemonic = string.Empty,
            HowToThink = string.Empty,
            HowToThinkSteps = string.Empty,
            BruteForceIdea = string.Empty,
            OptimalIdea = string.Empty,
            StepByStepAlgorithm = string.Empty,
            VisualExplanation = string.Empty,
            WhyThisWorks = string.Empty,
            WhyNotOtherPatterns = string.Empty,
            Complexity = string.Empty,
            CommonMistakesCritical = string.Empty,
            CommonMistakesImportant = string.Empty,
            CommonMistakesNiceToHave = string.Empty,
            EdgeCaseChecklist = string.Empty,
            GapLearningHints = string.Empty,
            EnglishInterviewExplanation = string.Empty,
            RussianShortExplanation = string.Empty,
            MentalModelTrigger = string.Empty,
            MentalModelCue = string.Empty,
            MentalModelScript = string.Empty,
            MentalModelTrap = string.Empty,
            MentalModelPersonalWords = string.Empty,
            MentalModelInterviewPhrase = string.Empty
        };
        db.ProblemExplanations.Add(explanation);
        await db.SaveChangesAsync();

        return Ok(ApiResponse<object>.Ok(new { id = row.Id }, "Created."));
    }

    [HttpDelete("{id:int}")]
    public async Task<ActionResult<ApiResponse<object>>> Delete(int id)
    {
        var row = await db.Problems.FirstOrDefaultAsync(p => p.Id == id);
        if (row is null)
        {
            return NotFound(ApiResponse<object>.Fail("Problem not found."));
        }

        await UserContentCleanup.RemoveForDeletedCatalogItemAsync(
            db,
            UserContentCleanup.ProblemType,
            id,
            HttpContext.RequestAborted);

        db.Problems.Remove(row);
        await db.SaveChangesAsync();
        return Ok(ApiResponse<object>.Ok(new { deleted = true }, "Deleted."));
    }

    [HttpPost("reorder")]
    public async Task<ActionResult<ApiResponse<object>>> Reorder([FromBody] ReorderProblemsRequest body)
    {
        if (body?.Items is null || body.Items.Count == 0)
        {
            return BadRequest(ApiResponse<object>.Fail("At least one item is required."));
        }

        var requestedIds = body.Items.Select(i => i.Id).Distinct().ToArray();
        var rows = await db.Problems.Where(x => requestedIds.Contains(x.Id)).ToListAsync();
        if (rows.Count != requestedIds.Length)
        {
            return BadRequest(ApiResponse<object>.Fail("Some problems were not found."));
        }

        var byId = rows.ToDictionary(r => r.Id);
        var changed = 0;
        foreach (var item in body.Items)
        {
            if (!byId.TryGetValue(item.Id, out var row))
            {
                continue;
            }

            if (row.SortOrder == item.SortOrder)
            {
                continue;
            }

            row.SortOrder = item.SortOrder;
            changed++;
        }

        if (changed > 0)
        {
            await db.SaveChangesAsync();
        }

        return Ok(ApiResponse<object>.Ok(new { updated = changed }, "Reordered."));
    }

    [HttpGet("{id:int}/explanation")]
    public async Task<ActionResult<ApiResponse<object>>> GetExplanation(int id)
    {
        var explanation = await db.ProblemExplanations
            .FirstOrDefaultAsync(e => e.ProblemId == id);

        if (explanation is null)
        {
            return NotFound(ApiResponse<object>.Fail("Problem explanation not found."));
        }

        var response = new
        {
            explanation.ProblemId,
            explanation.Pattern,
            WordingSignals = SplitList(explanation.WordingSignals),
            explanation.Mnemonic,
            PatternSignals = SplitList(explanation.PatternSignals),
            explanation.HowToThink,
            HowToThinkSteps = SplitList(explanation.HowToThinkSteps),
            explanation.BruteForceIdea,
            explanation.OptimalIdea,
            StepByStepAlgorithm = SplitList(explanation.StepByStepAlgorithm),
            explanation.VisualExplanation,
            WhyThisPattern = explanation.WhyThisWorks,
            WhyNotOtherPatterns = SplitList(explanation.WhyNotOtherPatterns),
            explanation.Complexity,
            EdgeCaseChecklist = SplitList(explanation.EdgeCaseChecklist),
            CommonMistakes = new
            {
                Critical = SplitList(explanation.CommonMistakesCritical),
                Important = SplitList(explanation.CommonMistakesImportant),
                NiceToHave = SplitList(explanation.CommonMistakesNiceToHave)
            },
            GapLearningHints = SplitList(explanation.GapLearningHints),
            InterviewExplanationEnglish = explanation.EnglishInterviewExplanation,
            SimpleExplanationRussian = explanation.RussianShortExplanation,
            explanation.MentalModelTrigger,
            explanation.MentalModelCue,
            explanation.MentalModelScript,
            explanation.MentalModelTrap,
            explanation.MentalModelPersonalWords,
            explanation.MentalModelInterviewPhrase
        };

        return Ok(ApiResponse<object>.Ok(response));
    }

    [HttpPut("{id:int}/explanation")]
    public async Task<ActionResult<ApiResponse<object>>> UpdateExplanation(
        int id,
        [FromBody] UpdateProblemExplanationDto body,
        CancellationToken cancellationToken)
    {
        if (body is null)
        {
            return BadRequest(ApiResponse<object>.Fail("Body is required."));
        }

        var explanation = await db.ProblemExplanations
            .FirstOrDefaultAsync(e => e.ProblemId == id, cancellationToken);
        if (explanation is null)
        {
            return NotFound(ApiResponse<object>.Fail("Problem explanation not found."));
        }

        var m = body.CommonMistakes ?? new UpdateCommonMistakesDto();

        static string BadLen(string name) => $"{name} is too long (max {MaxExplanationFieldLength} characters).";
        if (exceeds(JoinList(body.WordingSignals))) return BadRequest(ApiResponse<object>.Fail(BadLen("Wording signals")));
        if ((body.Mnemonic ?? string.Empty).Length > MaxExplanationFieldLength) return BadRequest(ApiResponse<object>.Fail(BadLen("Mnemonic")));
        if ((body.HowToThink ?? string.Empty).Length > MaxExplanationFieldLength) return BadRequest(ApiResponse<object>.Fail(BadLen("How to think")));
        if (exceeds(JoinList(body.HowToThinkSteps))) return BadRequest(ApiResponse<object>.Fail(BadLen("How to think steps")));
        if ((body.BruteForceIdea ?? string.Empty).Length > MaxExplanationFieldLength) return BadRequest(ApiResponse<object>.Fail(BadLen("Brute force idea")));
        if ((body.OptimalIdea ?? string.Empty).Length > MaxExplanationFieldLength) return BadRequest(ApiResponse<object>.Fail(BadLen("Optimal idea")));
        if (exceeds(JoinList(body.StepByStepAlgorithm))) return BadRequest(ApiResponse<object>.Fail(BadLen("Step by step algorithm")));
        if ((body.VisualExplanation ?? string.Empty).Length > MaxExplanationFieldLength) return BadRequest(ApiResponse<object>.Fail(BadLen("Visual explanation")));
        if ((body.WhyThisPattern ?? string.Empty).Length > MaxExplanationFieldLength) return BadRequest(ApiResponse<object>.Fail(BadLen("Why this pattern")));
        if (exceeds(JoinList(body.WhyNotOtherPatterns))) return BadRequest(ApiResponse<object>.Fail(BadLen("Why not other patterns")));
        if ((body.Complexity ?? string.Empty).Length > MaxExplanationFieldLength) return BadRequest(ApiResponse<object>.Fail(BadLen("Complexity")));
        if (exceeds(JoinList(body.EdgeCaseChecklist))) return BadRequest(ApiResponse<object>.Fail(BadLen("Edge case checklist")));
        if (exceeds(JoinList(m.Critical)) || exceeds(JoinList(m.Important)) || exceeds(JoinList(m.NiceToHave)))
        {
            return BadRequest(ApiResponse<object>.Fail("Common mistakes entries are too long."));
        }
        if (exceeds(JoinList(body.GapLearningHints))) return BadRequest(ApiResponse<object>.Fail(BadLen("Gap learning hints")));
        if ((body.InterviewExplanationEnglish ?? string.Empty).Length > MaxExplanationFieldLength)
        {
            return BadRequest(ApiResponse<object>.Fail(BadLen("Interview explanation (English)")));
        }
        if ((body.SimpleExplanationRussian ?? string.Empty).Length > MaxExplanationFieldLength)
        {
            return BadRequest(ApiResponse<object>.Fail(BadLen("Simple explanation (Russian)")));
        }
        static bool BadMental(string? s) => (s ?? string.Empty).Length > MaxExplanationFieldLength;
        if (BadMental(body.MentalModelTrigger)) return BadRequest(ApiResponse<object>.Fail(BadLen("Mental model trigger")));
        if (BadMental(body.MentalModelCue)) return BadRequest(ApiResponse<object>.Fail(BadLen("Mental model cue")));
        if (BadMental(body.MentalModelScript)) return BadRequest(ApiResponse<object>.Fail(BadLen("Mental model script")));
        if (BadMental(body.MentalModelTrap)) return BadRequest(ApiResponse<object>.Fail(BadLen("Mental model trap")));
        if (BadMental(body.MentalModelPersonalWords)) return BadRequest(ApiResponse<object>.Fail(BadLen("Mental model personal words")));
        if (BadMental(body.MentalModelInterviewPhrase)) return BadRequest(ApiResponse<object>.Fail(BadLen("Mental model interview phrase")));

        explanation.Pattern = (body.Pattern ?? string.Empty).Trim();
        explanation.WordingSignals = JoinList(body.WordingSignals);
        // Legacy column: keep in sync with keywords (WordingSignals); single source of truth in the API.
        explanation.PatternSignals = explanation.WordingSignals;
        explanation.Mnemonic = (body.Mnemonic ?? string.Empty).Trim();
        explanation.HowToThink = (body.HowToThink ?? string.Empty).Trim();
        explanation.HowToThinkSteps = JoinList(body.HowToThinkSteps);
        explanation.BruteForceIdea = (body.BruteForceIdea ?? string.Empty).Trim();
        explanation.OptimalIdea = (body.OptimalIdea ?? string.Empty).Trim();
        explanation.StepByStepAlgorithm = JoinList(body.StepByStepAlgorithm);
        explanation.VisualExplanation = (body.VisualExplanation ?? string.Empty).Trim();
        explanation.WhyThisWorks = (body.WhyThisPattern ?? string.Empty).Trim();
        explanation.WhyNotOtherPatterns = JoinList(body.WhyNotOtherPatterns);
        explanation.Complexity = (body.Complexity ?? string.Empty).Trim();
        explanation.EdgeCaseChecklist = JoinList(body.EdgeCaseChecklist);
        explanation.CommonMistakesCritical = JoinList(m.Critical);
        explanation.CommonMistakesImportant = JoinList(m.Important);
        explanation.CommonMistakesNiceToHave = JoinList(m.NiceToHave);
        explanation.GapLearningHints = JoinList(body.GapLearningHints);
        explanation.EnglishInterviewExplanation = (body.InterviewExplanationEnglish ?? string.Empty).Trim();
        explanation.RussianShortExplanation = (body.SimpleExplanationRussian ?? string.Empty).Trim();
        explanation.MentalModelTrigger = (body.MentalModelTrigger ?? string.Empty).Trim();
        explanation.MentalModelCue = (body.MentalModelCue ?? string.Empty).Trim();
        explanation.MentalModelScript = (body.MentalModelScript ?? string.Empty).Trim();
        explanation.MentalModelTrap = (body.MentalModelTrap ?? string.Empty).Trim();
        explanation.MentalModelPersonalWords = (body.MentalModelPersonalWords ?? string.Empty).Trim();
        explanation.MentalModelInterviewPhrase = (body.MentalModelInterviewPhrase ?? string.Empty).Trim();

        await db.SaveChangesAsync(cancellationToken);
        return Ok(ApiResponse<object>.Ok(new { updated = true }));
    }

    [HttpGet("{id:int}/solutions")]
    public async Task<ActionResult<ApiResponse<object>>> GetSolutions(int id)
    {
        var solutions = await db.ProblemSolutions
            .Where(s => s.ProblemId == id)
            .OrderBy(s => s.Id)
            .Select(s => new
            {
                s.Id,
                s.Language,
                s.Label,
                s.SolutionCode,
                s.NUnitTestsCode,
                s.NUnitSampleTestsCode,
                s.ThinkPattern,
                s.ThinkIdea,
                s.ThinkComplexity
            })
            .ToListAsync();

        return Ok(ApiResponse<object>.Ok(solutions));
    }

    [HttpPost("{id:int}/solutions")]
    public async Task<ActionResult<ApiResponse<object>>> CreateSolution(int id, [FromBody] CreateSolutionTemplateDto body)
    {
        if (body is null)
        {
            return BadRequest(ApiResponse<object>.Fail("Body is required."));
        }

        var problemExists = await db.Problems.AnyAsync(p => p.Id == id);
        if (!problemExists)
        {
            return NotFound(ApiResponse<object>.Fail("Problem not found."));
        }

        if (body.SolutionCode is not null && body.SolutionCode.Length > MaxSolutionCodeLength)
        {
            return BadRequest(ApiResponse<object>.Fail("Solution code is too long."));
        }

        var label = string.IsNullOrWhiteSpace(body.Label) ? null : body.Label.Trim();
        if (label is { Length: > 0 } && label.Length > MaxLabelLength)
        {
            return BadRequest(ApiResponse<object>.Fail("Label is too long."));
        }

        var donor = await db.ProblemSolutions
            .AsNoTracking()
            .Where(s => s.ProblemId == id)
            .OrderBy(s => s.Id)
            .FirstOrDefaultAsync();

        // Prefer explicit NUnit in body; if client sends an empty string, fall back to donor (first solution) when present.
        string? nUnit;
        if (body.NUnitTestsCode is not null)
        {
            var t = body.NUnitTestsCode.Trim();
            nUnit = t.Length == 0 ? null : t;
            if (nUnit is null && !string.IsNullOrWhiteSpace(donor?.NUnitTestsCode))
            {
                nUnit = donor!.NUnitTestsCode;
            }
        }
        else
        {
            nUnit = string.IsNullOrWhiteSpace(donor?.NUnitTestsCode) ? null : donor!.NUnitTestsCode;
        }

        if (string.IsNullOrWhiteSpace(nUnit))
        {
            return BadRequest(
                ApiResponse<object>.Fail(
                    "NUnit test code is required when there is no existing solution to copy from."));
        }

        if (nUnit.Length > MaxSolutionCodeLength)
        {
            return BadRequest(ApiResponse<object>.Fail("NUnit test code is too long."));
        }

        var sample = string.IsNullOrWhiteSpace(body.NUnitSampleTestsCode)
            ? (donor?.NUnitSampleTestsCode ?? string.Empty)
            : body.NUnitSampleTestsCode.Trim();

        var row = new ProblemSolution
        {
            ProblemId = id,
            Language = "C#",
            Label = string.IsNullOrEmpty(label) ? null : label,
            SolutionCode = body.SolutionCode?.Trim() ?? string.Empty,
            NUnitTestsCode = nUnit,
            NUnitSampleTestsCode = sample,
            ThinkPattern = string.IsNullOrWhiteSpace(body.ThinkPattern) ? null : body.ThinkPattern.Trim(),
            ThinkIdea = string.IsNullOrWhiteSpace(body.ThinkIdea) ? null : body.ThinkIdea.Trim(),
            ThinkComplexity = string.IsNullOrWhiteSpace(body.ThinkComplexity) ? null : body.ThinkComplexity.Trim()
        };

        db.ProblemSolutions.Add(row);
        await db.SaveChangesAsync();

        var created = new
        {
            row.Id,
            row.Language,
            row.Label,
            row.SolutionCode,
            row.NUnitTestsCode,
            row.NUnitSampleTestsCode,
            row.ThinkPattern,
            row.ThinkIdea,
            row.ThinkComplexity
        };

        return Ok(ApiResponse<object>.Ok(created));
    }

    [HttpPut("{problemId:int}/solutions/{solutionId:int}")]
    public async Task<ActionResult<ApiResponse<object>>> UpdateSolution(
        int problemId,
        int solutionId,
        [FromBody] UpdateSolutionTemplateDto body)
    {
        if (body is null)
        {
            return BadRequest(ApiResponse<object>.Fail("Body is required."));
        }

        var row = await db.ProblemSolutions
            .FirstOrDefaultAsync(s => s.Id == solutionId && s.ProblemId == problemId);
        if (row is null)
        {
            return NotFound(ApiResponse<object>.Fail("Solution not found."));
        }

        if (body.SolutionCode is not null && body.SolutionCode.Length > MaxSolutionCodeLength)
        {
            return BadRequest(ApiResponse<object>.Fail("Solution code is too long."));
        }

        if (body.NUnitTestsCode is not null && body.NUnitTestsCode.Length > MaxSolutionCodeLength)
        {
            return BadRequest(ApiResponse<object>.Fail("NUnit test code is too long."));
        }

        if (body.Label is not null)
        {
            var trimmed = body.Label.Trim();
            if (trimmed.Length > MaxLabelLength)
            {
                return BadRequest(ApiResponse<object>.Fail("Label is too long."));
            }
            row.Label = trimmed.Length == 0 ? null : trimmed;
        }

        if (body.SolutionCode is not null)
        {
            row.SolutionCode = body.SolutionCode;
        }

        if (body.NUnitTestsCode is not null)
        {
            row.NUnitTestsCode = body.NUnitTestsCode;
        }

        if (body.NUnitSampleTestsCode is not null)
        {
            row.NUnitSampleTestsCode = body.NUnitSampleTestsCode;
        }

        if (body.ThinkPattern is not null)
        {
            row.ThinkPattern = string.IsNullOrWhiteSpace(body.ThinkPattern) ? null : body.ThinkPattern.Trim();
        }
        if (body.ThinkIdea is not null)
        {
            row.ThinkIdea = string.IsNullOrWhiteSpace(body.ThinkIdea) ? null : body.ThinkIdea.Trim();
        }
        if (body.ThinkComplexity is not null)
        {
            row.ThinkComplexity = string.IsNullOrWhiteSpace(body.ThinkComplexity) ? null : body.ThinkComplexity.Trim();
        }

        await db.SaveChangesAsync();

        var updated = new
        {
            row.Id,
            row.Language,
            row.Label,
            row.SolutionCode,
            row.NUnitTestsCode,
            row.NUnitSampleTestsCode,
            row.ThinkPattern,
            row.ThinkIdea,
            row.ThinkComplexity
        };

        return Ok(ApiResponse<object>.Ok(updated));
    }

    [HttpGet("{problemId:int}/solutions/{solutionId:int}/versions")]
    public async Task<ActionResult<ApiResponse<object>>> GetSolutionVersions(int problemId, int solutionId)
    {
        var exists = await db.ProblemSolutions
            .AnyAsync(s => s.Id == solutionId && s.ProblemId == problemId);
        if (!exists)
        {
            return NotFound(ApiResponse<object>.Fail("Solution not found."));
        }

        var list = await db.SolutionVersions
            .AsNoTracking()
            .Where(v => v.ProblemSolutionId == solutionId)
            .OrderByDescending(v => v.Id)
            .Select(v => new
            {
                v.Id,
                v.CreatedAtUtc,
                v.SolutionCode,
                v.ThinkPattern,
                v.ThinkIdea,
                v.ThinkComplexity
            })
            .ToListAsync();

        return Ok(ApiResponse<object>.Ok(list));
    }

    [HttpPost("{problemId:int}/solutions/{solutionId:int}/versions")]
    public async Task<ActionResult<ApiResponse<object>>> CreateSolutionVersion(int problemId, int solutionId)
    {
        var row = await db.ProblemSolutions
            .FirstOrDefaultAsync(s => s.Id == solutionId && s.ProblemId == problemId);
        if (row is null)
        {
            return NotFound(ApiResponse<object>.Fail("Solution not found."));
        }

        var version = new SolutionVersion
        {
            ProblemSolutionId = solutionId,
            CreatedAtUtc = DateTime.UtcNow,
            SolutionCode = row.SolutionCode,
            ThinkPattern = row.ThinkPattern,
            ThinkIdea = row.ThinkIdea,
            ThinkComplexity = row.ThinkComplexity
        };
        db.SolutionVersions.Add(version);
        await db.SaveChangesAsync();

        return Ok(
            ApiResponse<object>.Ok(
                new
                {
                    version.Id,
                    version.CreatedAtUtc
                }));
    }

    [HttpDelete("{problemId:int}/solutions/{solutionId:int}")]
    public async Task<ActionResult<ApiResponse<object>>> DeleteSolution(int problemId, int solutionId)
    {
        var row = await db.ProblemSolutions
            .FirstOrDefaultAsync(s => s.Id == solutionId && s.ProblemId == problemId);
        if (row is null)
        {
            return NotFound(ApiResponse<object>.Fail("Solution not found."));
        }

        var count = await db.ProblemSolutions.CountAsync(s => s.ProblemId == problemId);
        if (count <= 1)
        {
            return BadRequest(ApiResponse<object>.Fail("Cannot delete the only solution for this problem."));
        }

        db.ProblemSolutions.Remove(row);
        await db.SaveChangesAsync();

        return Ok(ApiResponse<object>.Ok(new { deleted = true }));
    }

    private static string[] SplitList(string value) =>
        value.Split(ListJoinSep, StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

    private static string JoinList(IReadOnlyList<string>? items)
    {
        if (items is null || items.Count == 0) return string.Empty;
        return string.Join(ListJoinSep, items
            .Select(s => (s ?? string.Empty).Trim())
            .Where(s => s.Length > 0));
    }

    private static bool exceeds(string joinedOrText) => joinedOrText.Length > MaxExplanationFieldLength;

    private static string normalizeDifficulty(string? value)
    {
        var d = (value ?? "Easy").Trim();
        return DifficultyAllowed.Contains(d, StringComparer.Ordinal) ? d : "Easy";
    }

    private static string normalizeTitle(string? value)
    {
        var title = value?.Trim() ?? string.Empty;
        if (title.Length == 0)
        {
            return string.Empty;
        }

        return LeadingOrdinalRegex.Replace(title, string.Empty).Trim();
    }

    private static string slugify(string input)
    {
        if (string.IsNullOrWhiteSpace(input))
        {
            return string.Empty;
        }

        var chars = input
            .Trim()
            .ToLowerInvariant()
            .Select(c => char.IsLetterOrDigit(c) ? c : '-')
            .ToArray();
        var slug = new string(chars);
        while (slug.Contains("--", StringComparison.Ordinal))
        {
            slug = slug.Replace("--", "-", StringComparison.Ordinal);
        }
        return slug.Trim('-');
    }

    public class CreateProblemRequest
    {
        public string? Title { get; set; }
        public string? Slug { get; set; }
        public string? Difficulty { get; set; }
        public string? ProblemStatement { get; set; }
        public string? Topic { get; set; }
        public int? SortOrder { get; set; }
    }

    public class ReorderProblemsRequest
    {
        public IReadOnlyList<ReorderProblemItem> Items { get; set; } = Array.Empty<ReorderProblemItem>();
    }

    public class ReorderProblemItem
    {
        public int Id { get; set; }
        public int SortOrder { get; set; }
    }
}
