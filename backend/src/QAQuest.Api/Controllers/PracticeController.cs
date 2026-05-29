using System.Diagnostics;

using Microsoft.AspNetCore.Mvc;

using Microsoft.EntityFrameworkCore;

using QAQuest.Api.Data;

using QAQuest.Api.Dtos;

using QAQuest.Api.Models;

using QAQuest.Api.Services;



namespace QAQuest.Api.Controllers;



[ApiController]

[Route("api/[controller]")]

public class PracticeController(AppDbContext db) : ControllerBase

{

    private const int MaxCodeLength = 200_000;

    private const int RunTimeoutMs = 90_000;



    private const string ProjectFileName = "PracticeRun.csproj";

    private const string CsprojContent = """

<Project Sdk="Microsoft.NET.Sdk">

  <PropertyGroup>

    <TargetFramework>net10.0</TargetFramework>

    <ImplicitUsings>enable</ImplicitUsings>

    <Nullable>enable</Nullable>

    <RootNamespace>QaQuestPractice</RootNamespace>

  </PropertyGroup>

  <ItemGroup>

    <PackageReference Include="NUnit" Version="3.14.0" />

    <PackageReference Include="NUnit3TestAdapter" Version="4.5.0" />

    <PackageReference Include="Microsoft.NET.Test.Sdk" Version="17.8.0" />

  </ItemGroup>

</Project>

""";



    [HttpPost("run")]

    public async Task<ActionResult<ApiResponse<object>>> Run(

        [FromBody] PracticeRunRequest request,

        CancellationToken cancellationToken)

    {

        if (request.ProblemId <= 0)

        {

            return BadRequest(ApiResponse<object>.Fail("Invalid problem id."));

        }



        if (string.IsNullOrWhiteSpace(request.Code))

        {

            return BadRequest(ApiResponse<object>.Fail("Code is empty."));

        }



        if (request.Code.Length > MaxCodeLength)

        {

            return BadRequest(ApiResponse<object>.Fail("Code is too long."));

        }



        var scope = string.IsNullOrWhiteSpace(request.TestScope) ? "full" : request.TestScope.Trim().ToLowerInvariant();

        if (scope is not ("full" or "sample"))

        {

            return BadRequest(ApiResponse<object>.Fail("TestScope must be 'full' or 'sample'."));

        }



        ProblemSolution? row;

        if (request.SolutionId is { } sid && sid > 0)

        {

            row = await db.ProblemSolutions

                .AsNoTracking()

                .FirstOrDefaultAsync(

                    s => s.Id == sid && s.ProblemId == request.ProblemId && s.Language.ToLower() == "c#",

                    cancellationToken);

        }

        else

        {

            row = await db.ProblemSolutions

                .AsNoTracking()

                .Where(s => s.ProblemId == request.ProblemId && s.Language.ToLower() == "c#")

                .OrderBy(s => s.Id)

                .FirstOrDefaultAsync(cancellationToken);

        }



        if (row is null)

        {

            return NotFound(ApiResponse<object>.Fail("C# solution not found for this problem."));

        }



        string? testCode = null;

        if (!string.IsNullOrWhiteSpace(request.NUnitTestsCode))

        {

            if (request.NUnitTestsCode.Length > MaxCodeLength)

            {

                return BadRequest(ApiResponse<object>.Fail("NUnit test code is too long."));

            }

            testCode = request.NUnitTestsCode;

        }

        if (string.IsNullOrWhiteSpace(testCode))

        {

            testCode = ResolveTestCode(row, scope);

        }

        if (string.IsNullOrWhiteSpace(testCode))

        {

            return BadRequest(

                ApiResponse<object>.Fail(

                    scope == "sample"

                        ? "Sample tests are not set for this solution; add NUnitSampleTestsCode or use TestScope=full."

                        : "Tests are missing for this problem."));

        }



        var tempRoot = Path.Combine(Path.GetTempPath(), "qaquest-practice", Guid.NewGuid().ToString("N"));

        Directory.CreateDirectory(tempRoot);

        var csprojPath = Path.Combine(tempRoot, ProjectFileName);



        try

        {

            await System.IO.File.WriteAllTextAsync(csprojPath, CsprojContent, cancellationToken);

            await System.IO.File.WriteAllTextAsync(Path.Combine(tempRoot, "Solution.cs"), request.Code.Trim(), cancellationToken);

            await System.IO.File.WriteAllTextAsync(Path.Combine(tempRoot, "Tests.cs"), testCode.Trim(), cancellationToken);



            using var cts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);

            cts.CancelAfter(RunTimeoutMs);



            var psi = new ProcessStartInfo

            {

                FileName = "dotnet",

                Arguments = $"test \"{csprojPath}\" --nologo -v:q",

                WorkingDirectory = tempRoot,

                RedirectStandardOutput = true,

                RedirectStandardError = true,

                UseShellExecute = false,

                CreateNoWindow = true

            };



            using var proc = Process.Start(psi);

            if (proc is null)

            {

                return StatusCode(503, ApiResponse<object>.Fail("Could not start dotnet. Install .NET SDK and ensure 'dotnet' is on PATH."));

            }



            var readOut = proc.StandardOutput.ReadToEndAsync();

            var readErr = proc.StandardError.ReadToEndAsync();

            await proc.WaitForExitAsync(cts.Token);

            var stdout = await readOut;

            var stderr = await readErr;

            var combined = string.Join(

                "\n",

                new[] { stdout, stderr }

                    .Where(s => !string.IsNullOrWhiteSpace(s))

                    .Select(s => s.TrimEnd()));



            if (string.IsNullOrEmpty(combined))

            {

                combined = $"(no output, exit {proc.ExitCode})";

            }



            var i = NUnitTestOutputInterpreter.Interpret(combined, proc.ExitCode);

            var passed = proc.ExitCode == 0;

            var dto = new PracticeRunResultDto

            {

                ExitCode = proc.ExitCode,

                Output = combined,

                Passed = passed,

                ResultKind = i.ResultKind,

                SummaryMessage = i.SummaryMessage,

                TotalTestCount = i.TotalTestCount,

                PassedTestCount = i.PassedTestCount,

                FailedTestCount = i.FailedTestCount,

                FailedTestName = i.FailedTestName,

                Expected = i.Expected,

                Actual = i.Actual

            };



            return Ok(ApiResponse<object>.Ok(dto));

        }

        catch (OperationCanceledException) when (!cancellationToken.IsCancellationRequested)

        {

            return StatusCode(408, ApiResponse<object>.Fail("Run timed out."));

        }

        finally

        {

            try

            {

                if (Directory.Exists(tempRoot))

                {

                    Directory.Delete(tempRoot, true);

                }

            }

            catch

            {

                // best-effort cleanup

            }

        }

    }



    /// <summary>Sample: use NUnitSampleTestsCode when set; else same as full (until content splits tests).</summary>

    private static string ResolveTestCode(ProblemSolution row, string scope)

    {

        if (scope == "sample" && !string.IsNullOrWhiteSpace(row.NUnitSampleTestsCode))

        {

            return row.NUnitSampleTestsCode;

        }

        return row.NUnitTestsCode;

    }

}

