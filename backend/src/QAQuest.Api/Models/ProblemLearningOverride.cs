using System;

namespace QAQuest.Api.Models;

public class ProblemLearningOverride
{
    public int Id { get; set; }
    public int ProblemId { get; set; }
    public Problem? Problem { get; set; }

    public string? RuOverride { get; set; }
    public string? WhatMattersOverride { get; set; }
    public string? MnemonicOverride { get; set; }

    public DateTime UpdatedAtUtc { get; set; }
}
