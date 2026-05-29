using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using QAQuest.Api.Data;
using QAQuest.Api.Dtos;
using QAQuest.Api.Models;
using QAQuest.Api.Seed;

namespace QAQuest.Api.Controllers;

/// <summary>
/// REST API for the knowledge map (hierarchical tree of topics).
/// One <c>mapKey</c> = one independent map. Default key is "default".
/// </summary>
[ApiController]
public class KnowledgeMapsController(AppDbContext db) : ControllerBase
{
    private const int MaxDepth = 8;

    [HttpGet("api/knowledge-maps/{mapKey}/tree")]
    public async Task<ActionResult<ApiResponse<object>>> GetTree(string mapKey)
    {
        var key = NormalizeKey(mapKey);
        var nodes = await db.KnowledgeMapNodes
            .AsNoTracking()
            .Where(n => n.MapKey == key)
            .OrderBy(n => n.SortOrder)
            .ThenBy(n => n.Id)
            .ToListAsync();

        var roots = BuildTree(nodes);
        return Ok(ApiResponse<object>.Ok(new { mapKey = key, roots }));
    }

    [HttpPost("api/knowledge-map-nodes")]
    public async Task<ActionResult<ApiResponse<object>>> Create([FromBody] CreateKnowledgeMapNodeRequest body)
    {
        if (body is null)
        {
            return BadRequest(ApiResponse<object>.Fail("Body is required."));
        }

        var title = body.Title?.Trim() ?? string.Empty;
        if (title.Length < 1)
        {
            return BadRequest(ApiResponse<object>.Fail("Title is required."));
        }

        if (title.Length > 300)
        {
            return BadRequest(ApiResponse<object>.Fail("Title is too long (max 300)."));
        }

        var key = NormalizeKey(body.MapKey);

        if (body.ParentId.HasValue)
        {
            var parent = await db.KnowledgeMapNodes
                .AsNoTracking()
                .FirstOrDefaultAsync(n => n.Id == body.ParentId.Value);
            if (parent is null)
            {
                return BadRequest(ApiResponse<object>.Fail("Parent node not found."));
            }

            if (!string.Equals(parent.MapKey, key, StringComparison.Ordinal))
            {
                return BadRequest(ApiResponse<object>.Fail("Parent belongs to a different map."));
            }

            if (await GetDepthAsync(parent) >= MaxDepth - 1)
            {
                return BadRequest(ApiResponse<object>.Fail($"Max tree depth ({MaxDepth}) reached."));
            }
        }
        else
        {
            // Only one root per map.
            var hasRoot = await db.KnowledgeMapNodes
                .AsNoTracking()
                .AnyAsync(n => n.MapKey == key && n.ParentId == null);
            if (hasRoot)
            {
                return BadRequest(ApiResponse<object>.Fail("This map already has a root node."));
            }
        }

        var sortOrder = body.SortOrder ?? await NextSortOrderAsync(key, body.ParentId);
        var now = DateTime.UtcNow;
        var row = new KnowledgeMapNode
        {
            MapKey = key,
            ParentId = body.ParentId,
            Title = title,
            Description = body.Description?.Trim() ?? string.Empty,
            InterviewQuestionId = body.InterviewQuestionId,
            SortOrder = sortOrder,
            CreatedAtUtc = now,
            UpdatedAtUtc = now
        };

        db.KnowledgeMapNodes.Add(row);
        await db.SaveChangesAsync();

        return Ok(ApiResponse<object>.Ok(new { id = row.Id }, "Created."));
    }

    [HttpPut("api/knowledge-map-nodes/{id:int}")]
    public async Task<ActionResult<ApiResponse<object>>> Update(int id, [FromBody] UpdateKnowledgeMapNodeRequest body)
    {
        if (body is null)
        {
            return BadRequest(ApiResponse<object>.Fail("Body is required."));
        }

        var row = await db.KnowledgeMapNodes.FirstOrDefaultAsync(n => n.Id == id);
        if (row is null)
        {
            return NotFound(ApiResponse<object>.Fail("Node not found."));
        }

        var title = body.Title?.Trim() ?? string.Empty;
        if (title.Length < 1)
        {
            return BadRequest(ApiResponse<object>.Fail("Title is required."));
        }

        if (title.Length > 300)
        {
            return BadRequest(ApiResponse<object>.Fail("Title is too long (max 300)."));
        }

        row.Title = title;
        row.Description = body.Description?.Trim() ?? string.Empty;
        row.InterviewQuestionId = body.InterviewQuestionId;
        if (body.SortOrder.HasValue)
        {
            row.SortOrder = body.SortOrder.Value;
        }

        row.UpdatedAtUtc = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Ok(ApiResponse<object>.Ok(new { updated = true }, "Saved."));
    }

    [HttpPut("api/knowledge-map-nodes/{id:int}/move")]
    public async Task<ActionResult<ApiResponse<object>>> Move(int id, [FromBody] MoveKnowledgeMapNodeRequest body)
    {
        if (body is null)
        {
            return BadRequest(ApiResponse<object>.Fail("Body is required."));
        }

        var row = await db.KnowledgeMapNodes.FirstOrDefaultAsync(n => n.Id == id);
        if (row is null)
        {
            return NotFound(ApiResponse<object>.Fail("Node not found."));
        }

        if (body.ParentId.HasValue)
        {
            if (body.ParentId.Value == row.Id)
            {
                return BadRequest(ApiResponse<object>.Fail("A node cannot be its own parent."));
            }

            var parent = await db.KnowledgeMapNodes
                .AsNoTracking()
                .FirstOrDefaultAsync(n => n.Id == body.ParentId.Value);
            if (parent is null)
            {
                return BadRequest(ApiResponse<object>.Fail("Parent node not found."));
            }

            if (!string.Equals(parent.MapKey, row.MapKey, StringComparison.Ordinal))
            {
                return BadRequest(ApiResponse<object>.Fail("Cannot move across maps."));
            }

            if (await IsDescendantOfAsync(body.ParentId.Value, row.Id))
            {
                return BadRequest(ApiResponse<object>.Fail("Cannot move a node into its own subtree."));
            }
        }
        else
        {
            // Disallow creating a second root for an existing map.
            var hasOtherRoot = await db.KnowledgeMapNodes
                .AsNoTracking()
                .AnyAsync(n => n.MapKey == row.MapKey && n.ParentId == null && n.Id != row.Id);
            if (hasOtherRoot)
            {
                return BadRequest(ApiResponse<object>.Fail("This map already has a root node."));
            }
        }

        row.ParentId = body.ParentId;
        row.UpdatedAtUtc = DateTime.UtcNow;

        // Rewrite sort order among the new siblings to keep contiguous indexes.
        await db.SaveChangesAsync();
        await ReindexSiblingsAsync(row.MapKey, body.ParentId, row.Id, body.Position);

        return Ok(ApiResponse<object>.Ok(new { moved = true }, "Moved."));
    }

    /// <summary>
    /// Seeds the starter "C# and .NET Interview Guide 2026" tree for the given map.
    /// Idempotent by default: returns 400 if the map already has nodes.
    /// Pass <c>reset=true</c> to wipe and reseed the same map.
    /// </summary>
    [HttpPost("api/knowledge-maps/{mapKey}/seed-csharp-2026")]
    public async Task<ActionResult<ApiResponse<object>>> SeedCsharp2026(
        string mapKey,
        [FromQuery] bool reset = false)
    {
        var key = NormalizeKey(mapKey);
        var existing = await db.KnowledgeMapNodes
            .Where(n => n.MapKey == key)
            .ToListAsync();

        if (existing.Count > 0)
        {
            if (!reset)
            {
                return BadRequest(ApiResponse<object>.Fail(
                    "Map already has nodes. Pass ?reset=true to wipe and reseed."));
            }

            db.KnowledgeMapNodes.RemoveRange(existing);
            await db.SaveChangesAsync();
        }

        var seed = BuildCsharp2026Seed();
        var now = DateTime.UtcNow;
        var created = await SeedTreeAsync(key, parentId: null, seed: seed, now: now);

        return Ok(ApiResponse<object>.Ok(
            new { mapKey = key, created, rootTitle = seed.Title },
            $"Seeded {created} nodes."));
    }

    /// <summary>
    /// Creates <see cref="InterviewQuestion"/> rows for each leaf of the map (if demo text exists) and
    /// sets <see cref="KnowledgeMapNode.InterviewQuestionId"/>. Idempotent: skips nodes that already
    /// link, reuses an existing question with the same title and knowledge-map tag.
    /// </summary>
    [HttpPost("api/knowledge-maps/{mapKey}/seed-demo-questions")]
    public async Task<ActionResult<ApiResponse<object>>> SeedDemoQuestions(string mapKey)
    {
        var key = NormalizeKey(mapKey);
        var all = await db.KnowledgeMapNodes
            .Where(n => n.MapKey == key)
            .ToListAsync();

        if (all.Count == 0)
        {
            return BadRequest(ApiResponse<object>.Fail("No map nodes. Run seed-csharp-2026 first (or add nodes)."));
        }

        var withChildren = all.Where(n => n.ParentId.HasValue).Select(n => n.ParentId!.Value).ToHashSet();
        var leaves = all.Where(n => !withChildren.Contains(n.Id)).ToList();

        var createdQ = 0;
        var linked = 0;
        var skipped = 0;
        var sort = 0;

        foreach (var node in leaves.OrderBy(n => n.Id))
        {
            if (node.InterviewQuestionId.HasValue)
            {
                skipped++;
                continue;
            }

            if (!KnowledgeMapDemoContent.TryGet(node.Title, out var demo))
            {
                skipped++;
                continue;
            }

            var existId = await FindExistingDemoQuestionIdAsync(node.Title, HttpContext.RequestAborted);
            int qid;
            if (existId.HasValue)
            {
                qid = existId.Value;
            }
            else
            {
                if (await InterviewQuestionTitleExistsAsync(node.Title, HttpContext.RequestAborted))
                {
                    skipped++;
                    continue;
                }

                var now = DateTime.UtcNow;
                var followText = string.Join(InterviewListJoin, demo.FollowUps);
                var row = new InterviewQuestion
                {
                    Title = node.Title,
                    QuestionText = demo.QuestionText,
                    Category = demo.Category,
                    Difficulty = "Medium",
                    Tags = JoinInterviewTags(
                        KnowledgeMapDemoContent.TagDemo,
                        KnowledgeMapDemoContent.TagKnowledgeMap,
                        KnowledgeMapDemoContent.TagCSharpTab),
                    AnswerEnglish = demo.AnswerEnglish,
                    AnswerRussian = demo.AnswerRussian,
                    MemoryCue = demo.MemoryCue,
                    CommonTrap = demo.CommonTrap,
                    FollowUpQuestions = followText,
                    Notes = $"Seeded for knowledge map «{key}», node id {node.Id}.",
                    SortOrder = sort++,
                    IsPublished = true,
                    IsActive = true,
                    CreatedAtUtc = now,
                    UpdatedAtUtc = now
                };
                db.InterviewQuestions.Add(row);
                await db.SaveChangesAsync();
                qid = row.Id;
                createdQ++;
            }

            node.InterviewQuestionId = qid;
            node.UpdatedAtUtc = DateTime.UtcNow;
            linked++;
        }

        if (linked > 0)
        {
            await db.SaveChangesAsync();
        }

        return Ok(ApiResponse<object>.Ok(
            new
            {
                mapKey = key,
                leaves = leaves.Count,
                interviewQuestionsCreated = createdQ,
                nodesLinked = linked,
                nodesSkipped = skipped
            },
            "Demo questions linked to mind-map leaves (where copy exists)."));
    }

    private const string InterviewListJoin = "||";

    private static string JoinInterviewTags(params string[] parts) => string.Join(InterviewListJoin, parts);

    private async Task<int?> FindExistingDemoQuestionIdAsync(string title, CancellationToken cancellationToken)
    {
        // Filter tag shape in memory — EF Core + SQLite do not translate StartsWith/Contains with StringComparison.
        const string sep = "||";
        var needle = KnowledgeMapDemoContent.TagKnowledgeMap;
        var candidates = await db.InterviewQuestions
            .AsNoTracking()
            .Where(x => x.Title == title)
            .Select(x => new { x.Id, x.Tags })
            .ToListAsync(cancellationToken);

        foreach (var c in candidates)
        {
            var t = c.Tags;
            if (t == needle
                || t.StartsWith(needle + sep, StringComparison.Ordinal)
                || t.EndsWith(sep + needle, StringComparison.Ordinal)
                || t.Contains(sep + needle + sep, StringComparison.Ordinal))
            {
                return c.Id;
            }
        }

        return null;
    }

    private async Task<bool> InterviewQuestionTitleExistsAsync(string title, CancellationToken cancellationToken) =>
        await db.InterviewQuestions
            .AsNoTracking()
            .AnyAsync(x => x.Title == title, cancellationToken);

    /// <summary>
    /// Plain DTO used to declare the seed tree. Kept private and structural to
    /// avoid leaking seed concerns into public DTOs.
    /// </summary>
    private sealed record SeedNode(string Title, string Description = "", List<SeedNode>? Children = null);

    private static SeedNode BuildCsharp2026Seed() => new(
        "C# and .NET Interview Guide 2026",
        "Top-level categories captured from the source mind map.",
        new List<SeedNode>
        {
            new(".NET Platform & Runtime"),
            new("Type System & Data Structures"),
            new("Object-Oriented Programming",
                "",
                new List<SeedNode>
                {
                    new("Core Pillars",
                        "",
                        new List<SeedNode>
                        {
                            new("Encapsulation: Access modifiers"),
                            new("Polymorphism: Virtual & override"),
                            new("Inheritance: Base & derived")
                        }),
                    new("Abstraction",
                        "",
                        new List<SeedNode>
                        {
                            new("Interfaces: Capabilities contract"),
                            new("Abstract Classes: Shared state")
                        }),
                    new("Members",
                        "",
                        new List<SeedNode>
                        {
                            new("Properties: Controlled access"),
                            new("Constructors: Chaining & Initialization"),
                            new("Static Members: Type-level state")
                        })
                }),
            new("Advanced Logic & Concurrency"),
            new("Engineering Practices")
        });

    private async Task<int> SeedTreeAsync(string mapKey, int? parentId, SeedNode seed, DateTime now)
    {
        var node = new KnowledgeMapNode
        {
            MapKey = mapKey,
            ParentId = parentId,
            Title = seed.Title,
            Description = seed.Description,
            SortOrder = await NextSortOrderAsync(mapKey, parentId),
            CreatedAtUtc = now,
            UpdatedAtUtc = now
        };
        db.KnowledgeMapNodes.Add(node);
        await db.SaveChangesAsync();

        var count = 1;
        if (seed.Children is { Count: > 0 } children)
        {
            foreach (var child in children)
            {
                count += await SeedTreeAsync(mapKey, node.Id, child, now);
            }
        }

        return count;
    }

    [HttpDelete("api/knowledge-map-nodes/{id:int}")]
    public async Task<ActionResult<ApiResponse<object>>> Delete(int id)
    {
        var row = await db.KnowledgeMapNodes.FirstOrDefaultAsync(n => n.Id == id);
        if (row is null)
        {
            return NotFound(ApiResponse<object>.Fail("Node not found."));
        }

        // Manual cascade: collect descendants and delete bottom-up.
        var all = await db.KnowledgeMapNodes
            .Where(n => n.MapKey == row.MapKey)
            .ToListAsync();

        var byParent = all
            .Where(n => n.ParentId.HasValue)
            .GroupBy(n => n.ParentId!.Value)
            .ToDictionary(g => g.Key, g => g.ToList());

        var toDelete = new List<KnowledgeMapNode>();
        var stack = new Stack<KnowledgeMapNode>();
        stack.Push(row);
        while (stack.Count > 0)
        {
            var n = stack.Pop();
            toDelete.Add(n);
            if (byParent.TryGetValue(n.Id, out var children))
            {
                foreach (var c in children)
                {
                    stack.Push(c);
                }
            }
        }

        db.KnowledgeMapNodes.RemoveRange(toDelete);
        await db.SaveChangesAsync();
        return Ok(ApiResponse<object>.Ok(new { deleted = toDelete.Count }, "Deleted."));
    }

    private static string NormalizeKey(string? key)
    {
        var k = (key ?? "default").Trim().ToLowerInvariant();
        return string.IsNullOrWhiteSpace(k) ? "default" : k;
    }

    private async Task<int> NextSortOrderAsync(string mapKey, int? parentId)
    {
        var max = await db.KnowledgeMapNodes
            .AsNoTracking()
            .Where(n => n.MapKey == mapKey && n.ParentId == parentId)
            .Select(n => (int?)n.SortOrder)
            .MaxAsync();
        return (max ?? -1) + 1;
    }

    private async Task<int> GetDepthAsync(KnowledgeMapNode node)
    {
        var depth = 0;
        var current = node;
        while (current.ParentId.HasValue)
        {
            depth++;
            if (depth > MaxDepth)
            {
                return depth;
            }

            var parentId = current.ParentId.Value;
            current = await db.KnowledgeMapNodes
                .AsNoTracking()
                .FirstAsync(n => n.Id == parentId);
        }

        return depth;
    }

    private async Task<bool> IsDescendantOfAsync(int candidateId, int ancestorId)
    {
        var current = await db.KnowledgeMapNodes
            .AsNoTracking()
            .FirstOrDefaultAsync(n => n.Id == candidateId);
        var guard = 0;
        while (current?.ParentId is int pid)
        {
            if (pid == ancestorId)
            {
                return true;
            }

            guard++;
            if (guard > 64)
            {
                return false;
            }

            current = await db.KnowledgeMapNodes
                .AsNoTracking()
                .FirstOrDefaultAsync(n => n.Id == pid);
        }

        return false;
    }

    private async Task ReindexSiblingsAsync(string mapKey, int? parentId, int movedId, int? position)
    {
        var siblings = await db.KnowledgeMapNodes
            .Where(n => n.MapKey == mapKey && n.ParentId == parentId)
            .OrderBy(n => n.SortOrder)
            .ThenBy(n => n.Id)
            .ToListAsync();

        var ordered = siblings.Where(n => n.Id != movedId).ToList();
        var moved = siblings.FirstOrDefault(n => n.Id == movedId);
        if (moved is null)
        {
            return;
        }

        var idx = position is null ? ordered.Count : Math.Clamp(position.Value, 0, ordered.Count);
        ordered.Insert(idx, moved);

        for (var i = 0; i < ordered.Count; i++)
        {
            if (ordered[i].SortOrder != i)
            {
                ordered[i].SortOrder = i;
            }
        }

        await db.SaveChangesAsync();
    }

    private static IReadOnlyList<KnowledgeMapNodeDto> BuildTree(List<KnowledgeMapNode> rows)
    {
        var byId = rows.ToDictionary(n => n.Id, n => MapToDto(n));
        var roots = new List<KnowledgeMapNodeDto>();
        var byParent = new Dictionary<int, List<KnowledgeMapNodeDto>>();

        foreach (var row in rows)
        {
            var dto = byId[row.Id];
            if (row.ParentId is int pid)
            {
                if (!byParent.TryGetValue(pid, out var list))
                {
                    list = new List<KnowledgeMapNodeDto>();
                    byParent[pid] = list;
                }

                list.Add(dto);
            }
            else
            {
                roots.Add(dto);
            }
        }

        foreach (var dto in byId.Values)
        {
            if (byParent.TryGetValue(dto.Id, out var kids))
            {
                dto.Children = kids
                    .OrderBy(c => c.SortOrder)
                    .ThenBy(c => c.Id)
                    .ToList();
            }
        }

        return roots
            .OrderBy(r => r.SortOrder)
            .ThenBy(r => r.Id)
            .ToList();
    }

    private static KnowledgeMapNodeDto MapToDto(KnowledgeMapNode n) => new()
    {
        Id = n.Id,
        MapKey = n.MapKey,
        ParentId = n.ParentId,
        Title = n.Title,
        Description = n.Description,
        InterviewQuestionId = n.InterviewQuestionId,
        SortOrder = n.SortOrder,
        CreatedAtUtc = n.CreatedAtUtc,
        UpdatedAtUtc = n.UpdatedAtUtc
    };
}
