using FluentValidation.Results;

namespace QorstackReportService.Application.Common.Exceptions;

/// <summary>
/// Exception สำหรับปัญหาการ validation ข้อมูล
/// สามารถเก็บข้อมูล entity name และรายการ errors ได้
/// </summary>
public class ValidationException : Exception
{
    public string? EntityName { get; }
    public IList<ValidationError> ValidationErrors { get; }

    public ValidationException()
        : base("One or more validation failures have occurred.")
    {
        ValidationErrors = new List<ValidationError>();
    }

    public ValidationException(string message)
        : base(message)
    {
        ValidationErrors = new List<ValidationError>();
    }

    public ValidationException(string message, string entityName)
        : base(message)
    {
        EntityName = entityName;
        ValidationErrors = new List<ValidationError>();
    }

    public ValidationException(IEnumerable<ValidationFailure> failures)
        : this("One or more validation failures have occurred.")
    {
        ValidationErrors = failures
            .Select(f => new ValidationError(f.PropertyName, f.ErrorMessage))
            .ToList();
    }

    public ValidationException(string message, string entityName, IEnumerable<ValidationFailure> failures)
        : base(message)
    {
        EntityName = entityName;
        ValidationErrors = failures
            .Select(f => new ValidationError(f.PropertyName, f.ErrorMessage))
            .ToList();
    }

    public ValidationException(string message, IEnumerable<ValidationError> errors)
        : base(message)
    {
        ValidationErrors = errors?.ToList() ?? new List<ValidationError>();
    }

    public ValidationException(string message, string entityName, IEnumerable<ValidationError> errors)
        : base(message)
    {
        EntityName = entityName;
        ValidationErrors = errors?.ToList() ?? new List<ValidationError>();
    }

    // Backward compatibility - เก็บเป็น Dictionary<string, string[]> เหมือนเดิม
    public IDictionary<string, string[]> Errors => ValidationErrors
        .GroupBy(e => e.Key, e => e.Message)
        .ToDictionary(g => g.Key, g => g.ToArray());

    /// <summary>
    /// เพิ่ม validation error รายการเดียว
    /// </summary>
    public void AddError(string key, string message)
    {
        ValidationErrors.Add(new ValidationError(key, message));
    }

    /// <summary>
    /// เพิ่ม validation errors จาก dictionary
    /// </summary>
    public void AddErrors(IDictionary<string, string> errors)
    {
        foreach (var error in errors)
        {
            AddError(error.Key, error.Value);
        }
    }

    /// <summary>
    /// เพิ่ม validation errors จาก list
    /// </summary>
    public void AddErrors(IEnumerable<ValidationError> errors)
    {
        foreach (var error in errors)
        {
            ValidationErrors.Add(error);
        }
    }
}

/// <summary>
/// โครงสร้างสำหรับเก็บข้อมูล validation error
/// </summary>
public class ValidationError
{
    public string Key { get; }
    public string Message { get; }

    public ValidationError(string key, string message)
    {
        Key = key ?? throw new ArgumentNullException(nameof(key));
        Message = message ?? throw new ArgumentNullException(nameof(message));
    }
}
