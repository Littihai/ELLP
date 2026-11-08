using System.Text.Json.Serialization;

namespace Ellp.Api.Shared.Api;

/// <summary>
/// The one envelope every endpoint answers with (after TMCL-PR). The frontend (services/liveApi.ts) reads
/// <see cref="Success"/>, <see cref="Data"/> and <see cref="Code"/>; it never branches on the text of <see cref="Message"/>.
/// </summary>
public sealed class ApiResponse<T>
{
    public bool Success { get; init; }
    public string Message { get; init; } = "";
    public T? Data { get; init; }

    /// <summary>A stable UPPER_SNAKE reason for a failure (NOT_FOUND, FORBIDDEN, LESSON_LOCKED ...). Absent on success.</summary>
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? Code { get; init; }

    public static ApiResponse<T> Ok(T data, string message = "OK") => new() { Success = true, Message = message, Data = data };
    public static ApiResponse<T> Fail(string code, string message) => new() { Success = false, Message = message, Code = code };
}

public static class ApiCodes
{
    public const string NotFound = "NOT_FOUND";
    public const string Forbidden = "FORBIDDEN";
    public const string Unauthorized = "UNAUTHORIZED";
    public const string Validation = "VALIDATION";
    public const string LessonLocked = "LESSON_LOCKED";
    public const string WatchFirst = "WATCH_FIRST";
    public const string MailFailed = "MAIL_FAILED";
    public const string PlanRequired = "PLAN_REQUIRED";
}
