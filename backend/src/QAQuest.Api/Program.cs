using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Storage;
using QAQuest.Api.Content;
using QAQuest.Api.Data;
using System.Text.RegularExpressions;

var importMode = args.Any(x => string.Equals(x, "import-content", StringComparison.OrdinalIgnoreCase));
var importCsharpQa = args.Any(x => string.Equals(x, "import-csharp-qa", StringComparison.OrdinalIgnoreCase));

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy
            .WithOrigins("http://localhost:3000", "http://127.0.0.1:3000")
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlite(builder.Configuration.GetConnectionString("DefaultConnection")));

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    if (db.Database.GetMigrations().Any())
    {
        db.Database.Migrate();
    }
    else
    {
        db.Database.EnsureCreated();

        // Repair SQLite files that contain EF metadata tables but miss domain tables.
        if (!HasTable(db, "Topics"))
        {
            var relationalDatabaseCreator = db.Database.GetService<IRelationalDatabaseCreator>();
            relationalDatabaseCreator.CreateTables();
        }
    }

    EnsureColumn(db, "ProblemExplanations", "Mnemonic", "TEXT NOT NULL DEFAULT ''");
    EnsureColumn(db, "ProblemExplanations", "PatternSignals", "TEXT NOT NULL DEFAULT ''");
    EnsureColumn(db, "ProblemExplanations", "HowToThinkSteps", "TEXT NOT NULL DEFAULT ''");
    EnsureColumn(db, "ProblemExplanations", "VisualExplanation", "TEXT NOT NULL DEFAULT ''");
    EnsureColumn(db, "ProblemExplanations", "WhyNotOtherPatterns", "TEXT NOT NULL DEFAULT ''");
    EnsureColumn(db, "ProblemExplanations", "CommonMistakesCritical", "TEXT NOT NULL DEFAULT ''");
    EnsureColumn(db, "ProblemExplanations", "CommonMistakesImportant", "TEXT NOT NULL DEFAULT ''");
    EnsureColumn(db, "ProblemExplanations", "CommonMistakesNiceToHave", "TEXT NOT NULL DEFAULT ''");
    EnsureColumn(db, "ProblemExplanations", "EdgeCaseChecklist", "TEXT NOT NULL DEFAULT ''");
    EnsureColumn(db, "ProblemExplanations", "GapLearningHints", "TEXT NOT NULL DEFAULT ''");
    EnsureColumn(db, "ProblemExplanations", "MentalModelTrigger", "TEXT NOT NULL DEFAULT ''");
    EnsureColumn(db, "ProblemExplanations", "MentalModelCue", "TEXT NOT NULL DEFAULT ''");
    EnsureColumn(db, "ProblemExplanations", "MentalModelScript", "TEXT NOT NULL DEFAULT ''");
    EnsureColumn(db, "ProblemExplanations", "MentalModelTrap", "TEXT NOT NULL DEFAULT ''");
    EnsureColumn(db, "ProblemExplanations", "MentalModelPersonalWords", "TEXT NOT NULL DEFAULT ''");
    EnsureColumn(db, "ProblemExplanations", "MentalModelInterviewPhrase", "TEXT NOT NULL DEFAULT ''");
    EnsureColumn(db, "Flashcards", "Category", "TEXT NOT NULL DEFAULT 'mnemonic'");
    EnsureColumn(db, "ProblemSolutions", "Label", "TEXT NULL");
    EnsureColumn(db, "ProblemSolutions", "NUnitSampleTestsCode", "TEXT NOT NULL DEFAULT ''");
    EnsureColumn(db, "ProblemSolutions", "ThinkPattern", "TEXT NULL");
    EnsureColumn(db, "ProblemSolutions", "ThinkIdea", "TEXT NULL");
    EnsureColumn(db, "ProblemSolutions", "ThinkComplexity", "TEXT NULL");
    EnsureColumn(db, "Problems", "SortOrder", "INTEGER NOT NULL DEFAULT 0");
    EnsureSolutionVersionsTable(db);
    EnsureInterviewQuestionsTable(db);
    // Legacy: interview coach top video URL (removed from model; SQLite 3.35+ supports DROP COLUMN).
    TryDropColumn(db, "InterviewQuestions", "CoachTopMediaUrl");
    EnsureKnowledgeMapNodesTable(db);
    EnsureUserContentsTable(db);
    EnsureSharedLinksTable(db);
    NormalizeLegacyOrdinalPrefixes(db);
    if (importMode)
    {
        var contentPath = ResolveContentProblemsPath(Directory.GetCurrentDirectory());
        var importer = new ProblemContentImporter(db);
        var summary = importer.ImportFromDirectory(contentPath);

        Console.WriteLine($"Import completed. Created: {summary.CreatedProblems}, Updated: {summary.UpdatedProblems}");
        if (summary.Errors.Count > 0)
        {
            Console.WriteLine("Import errors:");
            foreach (var error in summary.Errors)
            {
                Console.WriteLine($" - {error}");
            }
        }
    }

    if (importCsharpQa)
    {
        const string defaultMdName = "middle_csharp_dotnet_17_blocks_qa_automation_qna.md";
        var mdPath = ResolveCsharpQaMarkdownPath(args, defaultMdName);
        if (string.IsNullOrEmpty(mdPath) || !File.Exists(mdPath))
        {
            Console.WriteLine(
                "import-csharp-qa: markdown file not found. Pass a path after the command, " +
                "or place the file at content/imports/ under the repository root, or in output content/imports/.");
        }
        else
        {
            var qaImporter = new MiddleCsharpQaMarkdownImporter(db);
            var summary = qaImporter.ImportFromMarkdownFile(mdPath);
            Console.WriteLine(
                $"C# Q&A import from {mdPath}: created {summary.Created}, duplicate rows skipped: {summary.DuplicateSkipped}, " +
                $"other skipped: {summary.Skipped - summary.DuplicateSkipped}.");
            if (summary.Errors.Count > 0)
            {
                var take = Math.Min(40, summary.Errors.Count);
                for (var i = 0; i < take; i++)
                {
                    Console.WriteLine($"  - {summary.Errors[i]}");
                }
                if (summary.Errors.Count > take)
                {
                    Console.WriteLine($"  ... and {summary.Errors.Count - take} more error lines.");
                }
            }
        }
    }
}

app.MapControllers();

// Root and health: API has no default page; without this, GET / returns 404.
app.MapGet("/", (IWebHostEnvironment env) =>
    Results.Json(new
    {
        service = "QA Quest API",
        status = "ok",
        environment = env.EnvironmentName,
        docs = env.IsDevelopment() ? "/swagger" : (string?)null
    }));

app.MapGet("/health", () => Results.Json(new { status = "ok" }));

if (!importMode && !importCsharpQa)
{
    app.Run();
}

static bool HasTable(DbContext db, string tableName)
{
    using var command = db.Database.GetDbConnection().CreateCommand();
    var openedHere = command.Connection?.State != System.Data.ConnectionState.Open;
    if (openedHere)
    {
        command.Connection?.Open();
    }

    command.CommandText = "SELECT COUNT(*) FROM sqlite_master WHERE type = 'table' AND name = $name;";
    var parameter = command.CreateParameter();
    parameter.ParameterName = "$name";
    parameter.Value = tableName;
    command.Parameters.Add(parameter);

    var result = command.ExecuteScalar();
    if (openedHere)
    {
        command.Connection?.Close();
    }

    return result is long count && count > 0;
}

static bool ColumnExists(DbContext db, string tableName, string columnName)
{
    using var check = db.Database.GetDbConnection().CreateCommand();
    var openedHere = check.Connection?.State != System.Data.ConnectionState.Open;
    if (openedHere)
    {
        check.Connection?.Open();
    }

    check.CommandText = $"PRAGMA table_info({tableName});";
    using var reader = check.ExecuteReader();
    var exists = false;
    while (reader.Read())
    {
        if (string.Equals(reader["name"]?.ToString(), columnName, StringComparison.OrdinalIgnoreCase))
        {
            exists = true;
            break;
        }
    }
    reader.Close();

    if (openedHere)
    {
        check.Connection?.Close();
    }

    return exists;
}

static void TryDropColumn(DbContext db, string tableName, string columnName)
{
    if (!HasTable(db, tableName) || !ColumnExists(db, tableName, columnName))
    {
        return;
    }

    using var alter = db.Database.GetDbConnection().CreateCommand();
    var openedHere = alter.Connection?.State != System.Data.ConnectionState.Open;
    if (openedHere)
    {
        alter.Connection?.Open();
    }

    try
    {
        alter.CommandText = $"ALTER TABLE {tableName} DROP COLUMN {columnName};";
        alter.ExecuteNonQuery();
    }
    catch (Exception ex)
    {
        Console.WriteLine($"[qa-quest] Could not drop {tableName}.{columnName}: {ex.Message}");
    }

    if (openedHere)
    {
        alter.Connection?.Close();
    }
}

static void EnsureColumn(DbContext db, string tableName, string columnName, string columnDefinition)
{
    if (!HasTable(db, tableName) || ColumnExists(db, tableName, columnName))
    {
        return;
    }

    using var alter = db.Database.GetDbConnection().CreateCommand();
    var openedHere = alter.Connection?.State != System.Data.ConnectionState.Open;
    if (openedHere)
    {
        alter.Connection?.Open();
    }

    alter.CommandText = $"ALTER TABLE {tableName} ADD COLUMN {columnName} {columnDefinition};";
    alter.ExecuteNonQuery();

    if (openedHere)
    {
        alter.Connection?.Close();
    }
}

static void EnsureSolutionVersionsTable(DbContext db)
{
    if (HasTable(db, "SolutionVersions"))
    {
        return;
    }

    using var cmd = db.Database.GetDbConnection().CreateCommand();
    var openedHere = cmd.Connection?.State != System.Data.ConnectionState.Open;
    if (openedHere)
    {
        cmd.Connection?.Open();
    }

    cmd.CommandText = """
        CREATE TABLE SolutionVersions (
          Id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
          ProblemSolutionId INTEGER NOT NULL,
          CreatedAtUtc TEXT NOT NULL,
          SolutionCode TEXT NOT NULL,
          ThinkPattern TEXT NULL,
          ThinkIdea TEXT NULL,
          ThinkComplexity TEXT NULL,
          FOREIGN KEY (ProblemSolutionId) REFERENCES ProblemSolutions (Id) ON DELETE CASCADE
        );
        """;
    cmd.ExecuteNonQuery();
    if (openedHere)
    {
        cmd.Connection?.Close();
    }
}

static void EnsureInterviewQuestionsTable(DbContext db)
{
    if (HasTable(db, "InterviewQuestions"))
    {
        return;
    }

    using var cmd = db.Database.GetDbConnection().CreateCommand();
    var openedHere = cmd.Connection?.State != System.Data.ConnectionState.Open;
    if (openedHere)
    {
        cmd.Connection?.Open();
    }

    cmd.CommandText = """
        CREATE TABLE InterviewQuestions (
          Id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
          Title TEXT NOT NULL,
          QuestionText TEXT NOT NULL,
          Category TEXT NOT NULL DEFAULT 'General',
          Difficulty TEXT NOT NULL DEFAULT 'Easy',
          Tags TEXT NOT NULL DEFAULT '',
          AnswerEnglish TEXT NOT NULL DEFAULT '',
          AnswerRussian TEXT NOT NULL DEFAULT '',
          MemoryCue TEXT NOT NULL DEFAULT '',
          CommonTrap TEXT NOT NULL DEFAULT '',
          FollowUpQuestions TEXT NOT NULL DEFAULT '',
          Notes TEXT NOT NULL DEFAULT '',
          SortOrder INTEGER NOT NULL DEFAULT 0,
          IsPublished INTEGER NOT NULL DEFAULT 1,
          IsActive INTEGER NOT NULL DEFAULT 1,
          CreatedAtUtc TEXT NOT NULL,
          UpdatedAtUtc TEXT NOT NULL
        );
        """;
    cmd.ExecuteNonQuery();
    if (openedHere)
    {
        cmd.Connection?.Close();
    }
}

static void EnsureKnowledgeMapNodesTable(DbContext db)
{
    if (HasTable(db, "KnowledgeMapNodes"))
    {
        return;
    }

    using var cmd = db.Database.GetDbConnection().CreateCommand();
    var openedHere = cmd.Connection?.State != System.Data.ConnectionState.Open;
    if (openedHere)
    {
        cmd.Connection?.Open();
    }

    cmd.CommandText = """
        CREATE TABLE KnowledgeMapNodes (
          Id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
          MapKey TEXT NOT NULL DEFAULT 'default',
          ParentId INTEGER NULL,
          Title TEXT NOT NULL,
          Description TEXT NOT NULL DEFAULT '',
          InterviewQuestionId INTEGER NULL,
          SortOrder INTEGER NOT NULL DEFAULT 0,
          CreatedAtUtc TEXT NOT NULL,
          UpdatedAtUtc TEXT NOT NULL,
          FOREIGN KEY (ParentId) REFERENCES KnowledgeMapNodes (Id) ON DELETE RESTRICT
        );
        CREATE INDEX IX_KnowledgeMapNodes_MapKey_ParentId_SortOrder
            ON KnowledgeMapNodes (MapKey, ParentId, SortOrder);
        """;
    cmd.ExecuteNonQuery();
    if (openedHere)
    {
        cmd.Connection?.Close();
    }
}

static string? ResolveCsharpQaMarkdownPath(string[] appArgs, string fileName)
{
    var i = Array.FindIndex(
        appArgs,
        a => string.Equals(a, "import-csharp-qa", StringComparison.OrdinalIgnoreCase));
    if (i >= 0
        && i + 1 < appArgs.Length
        && appArgs[i + 1].Length > 0
        && !appArgs[i + 1].StartsWith('-'))
    {
        var p = Path.GetFullPath(appArgs[i + 1]);
        if (File.Exists(p))
        {
            return p;
        }
    }

    var fromOutput = Path.Combine(AppContext.BaseDirectory, "content", "imports", fileName);
    if (File.Exists(fromOutput))
    {
        return Path.GetFullPath(fromOutput);
    }

    var current = new DirectoryInfo(Directory.GetCurrentDirectory());
    while (current is not null)
    {
        var candidate = Path.Combine(current.FullName, "content", "imports", fileName);
        if (File.Exists(candidate))
        {
            return Path.GetFullPath(candidate);
        }
        current = current.Parent;
    }

    return null;
}

static string ResolveContentProblemsPath(string startPath)
{
    var current = new DirectoryInfo(startPath);
    while (current is not null)
    {
        var candidate = Path.Combine(current.FullName, "content", "problems");
        if (Directory.Exists(candidate))
        {
            return candidate;
        }
        current = current.Parent;
    }

    return Path.Combine(startPath, "content", "problems");
}

static void EnsureUserContentsTable(DbContext db)
{
    if (HasTable(db, "UserContents"))
    {
        return;
    }

    using var cmd = db.Database.GetDbConnection().CreateCommand();
    var openedHere = cmd.Connection?.State != System.Data.ConnectionState.Open;
    if (openedHere)
    {
        cmd.Connection?.Open();
    }

    cmd.CommandText = """
        CREATE TABLE UserContents (
          Id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
          UserId TEXT NOT NULL,
          ItemType TEXT NOT NULL,
          ItemId INTEGER NOT NULL,
          MyAnswer TEXT NOT NULL DEFAULT '',
          MyNotes TEXT NOT NULL DEFAULT '',
          UpdatedAtUtc TEXT NOT NULL,
          UNIQUE (UserId, ItemType, ItemId)
        );
        CREATE INDEX IX_UserContents_UserId_ItemType
            ON UserContents (UserId, ItemType);
        """;
    cmd.ExecuteNonQuery();

    if (openedHere)
    {
        cmd.Connection?.Close();
    }
}

static void EnsureSharedLinksTable(DbContext db)
{
    if (HasTable(db, "SharedLinks"))
    {
        return;
    }

    using var cmd = db.Database.GetDbConnection().CreateCommand();
    var openedHere = cmd.Connection?.State != System.Data.ConnectionState.Open;
    if (openedHere)
    {
        cmd.Connection?.Open();
    }

    cmd.CommandText = """
        CREATE TABLE SharedLinks (
          Token TEXT NOT NULL PRIMARY KEY,
          OwnerUserId TEXT NOT NULL,
          ItemType TEXT NOT NULL,
          ItemId INTEGER NOT NULL DEFAULT 0,
          CreatedAtUtc TEXT NOT NULL,
          ExpiresAtUtc TEXT NULL
        );
        CREATE INDEX IX_SharedLinks_OwnerUserId
            ON SharedLinks (OwnerUserId);
        """;
    cmd.ExecuteNonQuery();

    if (openedHere)
    {
        cmd.Connection?.Close();
    }
}

static void NormalizeLegacyOrdinalPrefixes(DbContext db)
{
    var regex = new Regex(@"^\d+\.\s+", RegexOptions.Compiled);
    var changed = 0;

    if (HasTable(db, "InterviewQuestions"))
    {
        using var selectIq = db.Database.GetDbConnection().CreateCommand();
        var openedIq = selectIq.Connection?.State != System.Data.ConnectionState.Open;
        if (openedIq)
        {
            selectIq.Connection?.Open();
        }

        selectIq.CommandText = "SELECT Id, Title FROM InterviewQuestions;";
        using var reader = selectIq.ExecuteReader();
        var updates = new List<(long Id, string Title)>();
        while (reader.Read())
        {
            var id = reader.GetInt64(0);
            var title = reader.IsDBNull(1) ? string.Empty : reader.GetString(1);
            var normalized = regex.Replace(title.Trim(), string.Empty).Trim();
            if (!string.Equals(title, normalized, StringComparison.Ordinal))
            {
                updates.Add((id, normalized));
            }
        }
        reader.Close();

        foreach (var row in updates)
        {
            using var update = db.Database.GetDbConnection().CreateCommand();
            update.CommandText = "UPDATE InterviewQuestions SET Title = $title WHERE Id = $id;";
            var pTitle = update.CreateParameter();
            pTitle.ParameterName = "$title";
            pTitle.Value = row.Title;
            update.Parameters.Add(pTitle);
            var pId = update.CreateParameter();
            pId.ParameterName = "$id";
            pId.Value = row.Id;
            update.Parameters.Add(pId);
            update.ExecuteNonQuery();
            changed++;
        }

        if (openedIq)
        {
            selectIq.Connection?.Close();
        }
    }

    if (HasTable(db, "Problems"))
    {
        using var selectProblems = db.Database.GetDbConnection().CreateCommand();
        var openedProblems = selectProblems.Connection?.State != System.Data.ConnectionState.Open;
        if (openedProblems)
        {
            selectProblems.Connection?.Open();
        }

        selectProblems.CommandText = "SELECT Id, Title FROM Problems;";
        using var reader = selectProblems.ExecuteReader();
        var updates = new List<(long Id, string Title)>();
        while (reader.Read())
        {
            var id = reader.GetInt64(0);
            var title = reader.IsDBNull(1) ? string.Empty : reader.GetString(1);
            var normalized = regex.Replace(title.Trim(), string.Empty).Trim();
            if (!string.Equals(title, normalized, StringComparison.Ordinal))
            {
                updates.Add((id, normalized));
            }
        }
        reader.Close();

        foreach (var row in updates)
        {
            using var update = db.Database.GetDbConnection().CreateCommand();
            update.CommandText = "UPDATE Problems SET Title = $title WHERE Id = $id;";
            var pTitle = update.CreateParameter();
            pTitle.ParameterName = "$title";
            pTitle.Value = row.Title;
            update.Parameters.Add(pTitle);
            var pId = update.CreateParameter();
            pId.ParameterName = "$id";
            pId.Value = row.Id;
            update.Parameters.Add(pId);
            update.ExecuteNonQuery();
            changed++;
        }

        if (openedProblems)
        {
            selectProblems.Connection?.Close();
        }
    }

    if (changed > 0)
    {
        Console.WriteLine($"[qa-quest] Normalized title ordinals for {changed} rows.");
    }
}
