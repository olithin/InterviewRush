using System.Text.RegularExpressions;

namespace QAQuest.Api.Services;

public sealed record NUnitInterpretation
{
    public string ResultKind { get; init; } = "Unknown";
    public string? SummaryMessage { get; init; }
    public int? TotalTestCount { get; init; }
    public int? PassedTestCount { get; init; }
    public int? FailedTestCount { get; init; }
    public string? FailedTestName { get; init; }
    public string? Expected { get; init; }
    public string? Actual { get; init; }
}

/// <summary>Best-effort parse of <c>dotnet test</c> combined stdout/stderr (NUnit 3, SDK-style output).</summary>
public static class NUnitTestOutputInterpreter
{
    public static NUnitInterpretation Interpret(string combinedOutput, int exitCode)
    {
        var text = combinedOutput ?? string.Empty;
        if (string.IsNullOrEmpty(text) && exitCode == 0)
        {
            return new NUnitInterpretation { ResultKind = "Passed" };
        }

        if (text.Contains("error CS", StringComparison.Ordinal) ||
            Regex.IsMatch(text, @"\bCS\d{4}:", RegexOptions.None))
        {
            return new NUnitInterpretation
            {
                ResultKind = "CompileError",
                SummaryMessage = "Build failed (see output)."
            };
        }

        if (exitCode == 0 &&
            (text.Contains("Passed!", StringComparison.Ordinal) ||
             Regex.IsMatch(text, @"\bPassed:\s*\d+", RegexOptions.IgnoreCase) ||
             !ContainsFailureSignals(text)))
        {
            return FillCounts(new NUnitInterpretation { ResultKind = "Passed" }, text);
        }

        if (Regex.IsMatch(
                text,
                @"[Uu]nhandled [Ee]xception|System\.[A-Z]\w*Exception|TargetInvocationException",
                RegexOptions.None) &&
            !text.Contains("TestExecutionContext", StringComparison.Ordinal))
        {
            return new NUnitInterpretation
            {
                ResultKind = "RuntimeError",
                SummaryMessage = "Runtime error (see output)."
            };
        }

        var failed = new NUnitInterpretation { ResultKind = "TestFailure" };
        failed = FillCounts(failed, text);
        failed = TryFailedTestName(failed, text);
        return TryExpectedActual(failed, text);
    }

    private static bool ContainsFailureSignals(string text) =>
        text.Contains("Failed!", StringComparison.Ordinal) ||
        text.Contains("Failed: ", StringComparison.Ordinal) ||
        text.Contains("Error Message:", StringComparison.Ordinal) ||
        text.Contains("Assert.", StringComparison.Ordinal) ||
        text.Contains("Failed ", StringComparison.Ordinal);

    private static NUnitInterpretation FillCounts(NUnitInterpretation x, string text)
    {
        int? t = x.TotalTestCount, p = x.PassedTestCount, f = x.FailedTestCount;
        var m = Regex.Match(
            text,
            @"[Tt]otal tests:\s*(\d+).*?Passed:\s*(\d+).*?Failed:\s*(\d+)", RegexOptions.Singleline);
        if (m.Success)
        {
            if (int.TryParse(m.Groups[1].Value, out var total))
            {
                t = total;
            }
            if (int.TryParse(m.Groups[2].Value, out var pv))
            {
                p = pv;
            }
            if (int.TryParse(m.Groups[3].Value, out var fv))
            {
                f = fv;
            }
        }
        else
        {
            var pm = Regex.Match(text, @"Passed:\s*(\d+)", RegexOptions.IgnoreCase);
            if (pm.Success && int.TryParse(pm.Groups[1].Value, out var pv2))
            {
                p = pv2;
            }
            var fm = Regex.Match(text, @"Failed:\s*(\d+)", RegexOptions.IgnoreCase);
            if (fm.Success && int.TryParse(fm.Groups[1].Value, out var fv2))
            {
                f = fv2;
            }
        }

        return x with
        {
            TotalTestCount = t,
            PassedTestCount = p,
            FailedTestCount = f
        };
    }

    private static NUnitInterpretation TryFailedTestName(NUnitInterpretation x, string text)
    {
        var m = Regex.Match(
            text,
            @"\s*Failed\s+([^\r\n.]+?)(?:\s*-\s*|\[|\(|\r|\n)", RegexOptions.Multiline);
        if (!m.Success)
        {
            return x;
        }
        return x with { FailedTestName = m.Groups[1].Value.Trim() };
    }

    private static NUnitInterpretation TryExpectedActual(NUnitInterpretation x, string text)
    {
        var em = Regex.Match(
            text,
            @"[Ee]xpected[:\s]+(.+?)(?:\r|\n)\s*[Aa]ctual[:\s]+(.+?)(?:\r|\n|$)", RegexOptions.Singleline);
        if (em.Success)
        {
            return x with
            {
                Expected = em.Groups[1].Value.Trim(),
                Actual = em.Groups[2].Value.Trim()
            };
        }
        em = Regex.Match(
            text,
            @"[Aa]ctual[:\s]+(.+?)(?:\r|\n)\s*[Ee]xpected[:\s]+(.+?)(?:\r|\n|$)", RegexOptions.Singleline);
        if (em.Success)
        {
            return x with
            {
                Expected = em.Groups[2].Value.Trim(),
                Actual = em.Groups[1].Value.Trim()
            };
        }
        return x;
    }
}
