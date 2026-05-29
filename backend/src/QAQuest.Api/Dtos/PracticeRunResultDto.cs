namespace QAQuest.Api.Dtos;

/// <summary>Structured practice run; legacy fields (ExitCode, Output, Passed) stay for existing clients.</summary>
public class PracticeRunResultDto
{
    public int ExitCode { get; init; }
    public string Output { get; init; } = "";
    public bool Passed { get; init; }

    /// <summary>CompileError | RuntimeError | TestFailure | Passed | Unknown</summary>
    public string ResultKind { get; init; } = "Unknown";
    public string? SummaryMessage { get; init; }
    public int? TotalTestCount { get; init; }
    public int? PassedTestCount { get; init; }
    public int? FailedTestCount { get; init; }
    public string? FailedTestName { get; init; }
    public string? Expected { get; init; }
    public string? Actual { get; init; }
}
