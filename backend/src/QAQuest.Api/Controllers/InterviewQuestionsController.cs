using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using QAQuest.Api.Data;
using QAQuest.Api.Dtos;
using QAQuest.Api.Models;
using System.Text.RegularExpressions;

namespace QAQuest.Api.Controllers;

[ApiController]
[Route("api/interview-questions")]
public class InterviewQuestionsController(AppDbContext db) : ControllerBase
{
    private const string ListJoinSep = "||";
    private static readonly string[] DifficultyAllowed = { "Easy", "Medium", "Hard" };
    private static readonly Regex LeadingOrdinalRegex = new(@"^\d+\.\s+", RegexOptions.Compiled);

    [HttpGet("categories")]
    public async Task<ActionResult<ApiResponse<object>>> GetCategories()
    {
        var names = await db.InterviewQuestions
            .AsNoTracking()
            .Where(q => q.IsActive)
            .Select(q => q.Category)
            .ToListAsync();

        var distinct = names
            .Select(c => c.Trim())
            .Where(c => c.Length > 0)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .OrderBy(c => c, StringComparer.OrdinalIgnoreCase)
            .ToList();

        return Ok(ApiResponse<object>.Ok(distinct));
    }

    [HttpGet]
    public async Task<ActionResult<ApiResponse<object>>> GetList(
        [FromQuery] string? q,
        [FromQuery] string? category,
        [FromQuery] string? difficulty,
        [FromQuery] string? tag,
        [FromQuery] string sort = "order",
        [FromQuery] string dir = "asc",
        [FromQuery] bool includeInactive = false,
        [FromQuery] bool publishedOnly = false,
        [FromQuery] int limit = 500)
    {
        var take = Math.Clamp(limit, 1, 2000);
        IQueryable<InterviewQuestion> query = db.InterviewQuestions.AsNoTracking();
        if (!includeInactive)
        {
            query = query.Where(x => x.IsActive);
        }

        if (publishedOnly)
        {
            query = query.Where(x => x.IsPublished);
        }

        if (!string.IsNullOrWhiteSpace(category))
        {
            var c = category.Trim();
            query = query.Where(x => x.Category == c);
        }

        if (!string.IsNullOrWhiteSpace(difficulty))
        {
            var d = difficulty.Trim();
            query = query.Where(x => x.Difficulty == d);
        }

        if (!string.IsNullOrWhiteSpace(q))
        {
            var s = q.Trim();
            if (s.Length > 0)
            {
                query = query.Where(x =>
                    x.Title.Contains(s) ||
                    x.QuestionText.Contains(s) ||
                    x.Notes.Contains(s));
            }
        }

        if (!string.IsNullOrWhiteSpace(tag))
        {
            var needle = tag.Trim();
            if (needle.Length > 0)
            {
                var a = ListJoinSep + needle + ListJoinSep;
                var b = ListJoinSep + needle;
                var c = needle + ListJoinSep;
                query = query.Where(x =>
                    x.Tags == needle
                    || x.Tags.StartsWith(c)
                    || x.Tags.EndsWith(b)
                    || x.Tags.Contains(a));
            }
        }

        IOrderedQueryable<InterviewQuestion> ordered;
        var asc = !string.Equals(dir, "desc", StringComparison.OrdinalIgnoreCase);
        switch (sort?.Trim().ToLowerInvariant())
        {
            case "title":
                ordered = asc
                    ? query.OrderBy(x => x.Title)
                    : query.OrderByDescending(x => x.Title);
                break;
            case "updated":
                ordered = asc
                    ? query.OrderBy(x => x.UpdatedAtUtc)
                    : query.OrderByDescending(x => x.UpdatedAtUtc);
                break;
            case "category":
                ordered = asc
                    ? query.OrderBy(x => x.Category).ThenBy(x => x.Title)
                    : query.OrderByDescending(x => x.Category).ThenBy(x => x.Title);
                break;
            case "difficulty":
                ordered = asc
                    ? query.OrderBy(x => x.Difficulty).ThenBy(x => x.Title)
                    : query.OrderByDescending(x => x.Difficulty).ThenBy(x => x.Title);
                break;
            default:
                ordered = asc
                    ? query.OrderBy(x => x.SortOrder).ThenBy(x => x.Title)
                    : query.OrderByDescending(x => x.SortOrder).ThenBy(x => x.Title);
                break;
        }

        var rows = await ordered
            .Take(take)
            .ToListAsync();

        var list = rows.Select(x => new InterviewQuestionListItem
        {
            Id = x.Id,
            Title = x.Title,
            Category = x.Category,
            Difficulty = x.Difficulty,
            Tags = SplitList(x.Tags),
            IsPublished = x.IsPublished,
            IsActive = x.IsActive,
            SortOrder = x.SortOrder,
            UpdatedAtUtc = x.UpdatedAtUtc
        }).ToList();

        return Ok(ApiResponse<object>.Ok(list));
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<ApiResponse<object>>> GetById(int id)
    {
        var row = await db.InterviewQuestions
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == id);
        return row is null
            ? NotFound(ApiResponse<object>.Fail("Interview question not found."))
            : Ok(ApiResponse<object>.Ok(MapToDto(row)));
    }

    [HttpPost]
    public async Task<ActionResult<ApiResponse<object>>> Create([FromBody] CreateInterviewQuestionRequest body)
    {
        if (body is null)
        {
            return BadRequest(ApiResponse<object>.Fail("Body is required."));
        }

        var err = ValidateCreate(body, out var title, out var questionText);
        if (err is not null)
        {
            return BadRequest(ApiResponse<object>.Fail(err));
        }

        if (await DuplicateExistsAsync(null, title, questionText, HttpContext.RequestAborted))
        {
            return BadRequest(ApiResponse<object>.Fail("A question with the same title or question text already exists."));
        }

        var now = DateTime.UtcNow;
        var row = new InterviewQuestion
        {
            Title = title,
            QuestionText = questionText,
            Category = NormalizeCategory(body.Category),
            Difficulty = NormalizeDifficulty(body.Difficulty),
            Tags = JoinList(body.Tags),
            AnswerEnglish = body.AnswerEnglish?.Trim() ?? string.Empty,
            AnswerRussian = body.AnswerRussian?.Trim() ?? string.Empty,
            MemoryCue = body.MemoryCue?.Trim() ?? string.Empty,
            CommonTrap = body.CommonTrap?.Trim() ?? string.Empty,
            FollowUpQuestions = JoinList(body.FollowUpQuestions),
            Notes = body.Notes?.Trim() ?? string.Empty,
            SortOrder = body.SortOrder ?? 0,
            IsPublished = body.IsPublished ?? true,
            IsActive = body.IsActive ?? true,
            CreatedAtUtc = now,
            UpdatedAtUtc = now
        };

        db.InterviewQuestions.Add(row);
        await db.SaveChangesAsync();

        return Ok(ApiResponse<object>.Ok(new { id = row.Id }, "Created."));
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<ApiResponse<object>>> Update(int id, [FromBody] UpdateInterviewQuestionRequest body)
    {
        if (body is null)
        {
            return BadRequest(ApiResponse<object>.Fail("Body is required."));
        }

        var row = await db.InterviewQuestions.FirstOrDefaultAsync(x => x.Id == id);
        if (row is null)
        {
            return NotFound(ApiResponse<object>.Fail("Interview question not found."));
        }

        var err = ValidateUpdate(body, out var title, out var questionText);
        if (err is not null)
        {
            return BadRequest(ApiResponse<object>.Fail(err));
        }

        if (await DuplicateExistsAsync(id, title, questionText, HttpContext.RequestAborted))
        {
            return BadRequest(ApiResponse<object>.Fail("A question with the same title or question text already exists."));
        }

        row.Title = title;
        row.QuestionText = questionText;
        row.Category = NormalizeCategory(body.Category);
        row.Difficulty = NormalizeDifficulty(body.Difficulty);
        row.Tags = JoinList(body.Tags);
        row.AnswerEnglish = body.AnswerEnglish?.Trim() ?? string.Empty;
        row.AnswerRussian = body.AnswerRussian?.Trim() ?? string.Empty;
        row.MemoryCue = body.MemoryCue?.Trim() ?? string.Empty;
        row.CommonTrap = body.CommonTrap?.Trim() ?? string.Empty;
        row.FollowUpQuestions = JoinList(body.FollowUpQuestions);
        row.Notes = body.Notes?.Trim() ?? string.Empty;
        if (body.SortOrder.HasValue)
        {
            row.SortOrder = body.SortOrder.Value;
        }

        if (body.IsPublished.HasValue)
        {
            row.IsPublished = body.IsPublished.Value;
        }

        if (body.IsActive.HasValue)
        {
            row.IsActive = body.IsActive.Value;
        }

        row.UpdatedAtUtc = DateTime.UtcNow;
        await db.SaveChangesAsync();

        return Ok(ApiResponse<object>.Ok(new { updated = true }, "Saved."));
    }

    [HttpDelete("{id:int}")]
    public async Task<ActionResult<ApiResponse<object>>> Delete(int id)
    {
        var row = await db.InterviewQuestions.FirstOrDefaultAsync(x => x.Id == id);
        if (row is null)
        {
            return NotFound(ApiResponse<object>.Fail("Interview question not found."));
        }

        var now = DateTime.UtcNow;
        var mapNodes = await db.KnowledgeMapNodes
            .Where(n => n.InterviewQuestionId == id)
            .ToListAsync();
        foreach (var n in mapNodes)
        {
            n.InterviewQuestionId = null;
            n.UpdatedAtUtc = now;
        }

        await UserContentCleanup.RemoveForDeletedCatalogItemAsync(
            db,
            UserContentCleanup.InterviewQuestionType,
            id,
            HttpContext.RequestAborted);

        db.InterviewQuestions.Remove(row);
        await db.SaveChangesAsync();

        return Ok(ApiResponse<object>.Ok(new { deleted = true }, "Deleted."));
    }

    [HttpPost("reorder")]
    public async Task<ActionResult<ApiResponse<object>>> Reorder([FromBody] ReorderInterviewQuestionsRequest body)
    {
        if (body?.Items is null || body.Items.Count == 0)
        {
            return BadRequest(ApiResponse<object>.Fail("At least one item is required."));
        }

        // Pull only requested rows to keep the update narrow and avoid scanning the whole table.
        var requestedIds = body.Items.Select(i => i.Id).Distinct().ToArray();
        var rows = await db.InterviewQuestions
            .Where(x => requestedIds.Contains(x.Id))
            .ToListAsync();

        if (rows.Count != requestedIds.Length)
        {
            return BadRequest(ApiResponse<object>.Fail("Some interview questions were not found."));
        }

        var byId = rows.ToDictionary(r => r.Id);
        var now = DateTime.UtcNow;
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
            row.UpdatedAtUtc = now;
            changed++;
        }

        if (changed > 0)
        {
            await db.SaveChangesAsync();
        }

        return Ok(ApiResponse<object>.Ok(new { updated = changed }, "Reordered."));
    }

    [HttpPost("bulk")]
    public async Task<ActionResult<ApiResponse<object>>> BulkCreate([FromBody] BulkCreateInterviewQuestionsRequest body)
    {
        if (body?.Items is null || body.Items.Count == 0)
        {
            return BadRequest(ApiResponse<object>.Fail("At least one item is required."));
        }

        var created = new List<CreatedInterviewQuestionRef>();
        var failed = new List<BulkItemFailure>();
        for (var i = 0; i < body.Items.Count; i++)
        {
            var item = body.Items[i];
            var err = ValidateCreate(item, out var title, out var questionText);
            if (err is not null)
            {
                failed.Add(new BulkItemFailure { Index = i, Message = err });
                continue;
            }

            if (created.Any(c => string.Equals(c.Title, title, StringComparison.Ordinal)))
            {
                failed.Add(new BulkItemFailure { Index = i, Message = "Duplicate title in this import batch." });
                continue;
            }

            if (await DuplicateExistsAsync(null, title, questionText, HttpContext.RequestAborted))
            {
                failed.Add(new BulkItemFailure { Index = i, Message = "Duplicate title or question text (existing row)." });
                continue;
            }

            if (created.Any(c => string.Equals(c.Title, title, StringComparison.Ordinal)))
            {
                failed.Add(new BulkItemFailure { Index = i, Message = "Duplicate title in this import batch." });
                continue;
            }

            var now = DateTime.UtcNow;
            var row = new InterviewQuestion
            {
                Title = title,
                QuestionText = questionText,
                Category = NormalizeCategory(item.Category),
                Difficulty = NormalizeDifficulty(item.Difficulty),
                Tags = JoinList(item.Tags),
                AnswerEnglish = item.AnswerEnglish?.Trim() ?? string.Empty,
                AnswerRussian = item.AnswerRussian?.Trim() ?? string.Empty,
                MemoryCue = item.MemoryCue?.Trim() ?? string.Empty,
                CommonTrap = item.CommonTrap?.Trim() ?? string.Empty,
                FollowUpQuestions = JoinList(item.FollowUpQuestions),
                Notes = item.Notes?.Trim() ?? string.Empty,
                SortOrder = item.SortOrder ?? 0,
                IsPublished = item.IsPublished ?? true,
                IsActive = item.IsActive ?? true,
                CreatedAtUtc = now,
                UpdatedAtUtc = now
            };

            db.InterviewQuestions.Add(row);
            await db.SaveChangesAsync();
            created.Add(new CreatedInterviewQuestionRef { Id = row.Id, Title = row.Title });
        }

        return Ok(ApiResponse<object>.Ok(
            new BulkCreateInterviewQuestionsResult
            {
                Created = created,
                Failed = failed
            },
            $"Imported {created.Count} of {body.Items.Count}."));
    }

    private async Task<bool> DuplicateExistsAsync(int? excludeId, string title, string questionText, CancellationToken cancellationToken)
    {
        return await db.InterviewQuestions
            .AsNoTracking()
            .AnyAsync(
                x => x.IsActive
                     && (excludeId == null || x.Id != excludeId)
                     && (x.Title == title || x.QuestionText == questionText),
                cancellationToken);
    }

    private static string? ValidateCreate(CreateInterviewQuestionRequest body, out string title, out string questionText) =>
        ValidateUpdate(
            new UpdateInterviewQuestionRequest
            {
                Title = body.Title,
                QuestionText = body.QuestionText,
                Category = body.Category,
                Difficulty = body.Difficulty,
                Tags = body.Tags,
                AnswerEnglish = body.AnswerEnglish,
                AnswerRussian = body.AnswerRussian,
                MemoryCue = body.MemoryCue,
                CommonTrap = body.CommonTrap,
                FollowUpQuestions = body.FollowUpQuestions,
                Notes = body.Notes,
                SortOrder = body.SortOrder,
                IsPublished = body.IsPublished,
                IsActive = body.IsActive
            },
            out title,
            out questionText);

    private static string? ValidateUpdate(UpdateInterviewQuestionRequest body, out string title, out string questionText)
    {
        title = NormalizeTitle(body.Title);
        questionText = body.QuestionText?.Trim() ?? string.Empty;
        if (title.Length < 1)
        {
            title = string.Empty;
            return "Title is required.";
        }

        if (title.Length > 500)
        {
            return "Title is too long (max 500).";
        }

        if (questionText.Length < 1)
        {
            return "Question text is required.";
        }

        if (questionText.Length > 50_000)
        {
            return "Question text is too long (max 50000).";
        }

        return null;
    }

    private static string NormalizeTitle(string? value)
    {
        var title = value?.Trim() ?? string.Empty;
        if (title.Length == 0)
        {
            return string.Empty;
        }

        return LeadingOrdinalRegex.Replace(title, string.Empty).Trim();
    }

    private static string NormalizeCategory(string? category)
    {
        var c = (category ?? "General").Trim();
        return c.Length < 1 ? "General" : c;
    }

    private string NormalizeDifficulty(string? difficulty)
    {
        var d = (difficulty ?? "Easy").Trim();
        if (string.IsNullOrEmpty(d) || !DifficultyAllowed.Contains(d, StringComparer.Ordinal))
        {
            return "Easy";
        }

        return d;
    }

    private static InterviewQuestionDto MapToDto(InterviewQuestion x) => new()
    {
        Id = x.Id,
        Title = x.Title,
        QuestionText = x.QuestionText,
        Category = x.Category,
        Difficulty = x.Difficulty,
        Tags = SplitList(x.Tags),
        AnswerEnglish = x.AnswerEnglish,
        AnswerRussian = x.AnswerRussian,
        MemoryCue = x.MemoryCue,
        CommonTrap = x.CommonTrap,
        FollowUpQuestions = SplitList(x.FollowUpQuestions),
        Notes = x.Notes,
        SortOrder = x.SortOrder,
        IsPublished = x.IsPublished,
        IsActive = x.IsActive,
        CreatedAtUtc = x.CreatedAtUtc,
        UpdatedAtUtc = x.UpdatedAtUtc
    };

    private static string[] SplitList(string value) =>
        value.Split(ListJoinSep, StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

    private static string JoinList(IReadOnlyList<string>? items) =>
        string.Join(ListJoinSep, (items ?? Array.Empty<string>())
            .Select(s => s.Trim())
            .Where(s => s.Length > 0));

    private class InterviewQuestionListItem
    {
        public int Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public string Category { get; set; } = string.Empty;
        public string Difficulty { get; set; } = string.Empty;
        public string[] Tags { get; set; } = Array.Empty<string>();
        public bool IsPublished { get; set; }
        public bool IsActive { get; set; }
        public int SortOrder { get; set; }
        public DateTime UpdatedAtUtc { get; set; }
    }
}
