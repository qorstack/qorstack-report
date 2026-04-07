namespace QorstackReportService.Application.Common.Exceptions;

/// <summary>
/// Exception สำหรับปัญหาเกี่ยวกับ business logic validation
/// สามารถเก็บรายการ error code และ message error ได้หลายรายการ
/// </summary>
public class BusinessValidationException : Exception
{
    public string? EntityName { get; }
    public IList<BusinessValidationError> Errors { get; }

    public BusinessValidationException() : base("Business validation failed.")
    {
        Errors = new List<BusinessValidationError>();
    }

    public BusinessValidationException(string message) : base(message)
    {
        Errors = new List<BusinessValidationError>();
    }

    public BusinessValidationException(string message, Exception innerException) : base(message, innerException)
    {
        Errors = new List<BusinessValidationError>();
    }

    public BusinessValidationException(string message, string entityName) : base(message)
    {
        EntityName = entityName;
        Errors = new List<BusinessValidationError>();
    }

    public BusinessValidationException(string message, string entityName, IList<BusinessValidationError> errors) : base(message)
    {
        EntityName = entityName;
        Errors = errors ?? new List<BusinessValidationError>();
    }

    public BusinessValidationException(string message, IList<BusinessValidationError> errors) : base(message)
    {
        Errors = errors ?? new List<BusinessValidationError>();
    }

    /// <summary>
    /// เพิ่ม error รายการเดียว
    /// </summary>
    public void AddError(string errorCode, string message)
    {
        Errors.Add(new BusinessValidationError(errorCode, message));
    }

    /// <summary>
    /// เพิ่ม errors จาก dictionary
    /// </summary>
    public void AddErrors(IDictionary<string, string> errors)
    {
        foreach (var error in errors)
        {
            AddError(error.Key, error.Value);
        }
    }

    /// <summary>
    /// เพิ่ม errors จาก list ของ BusinessValidationError
    /// </summary>
    public void AddErrors(IEnumerable<BusinessValidationError> errors)
    {
        foreach (var error in errors)
        {
            Errors.Add(error);
        }
    }
}

/// <summary>
/// โครงสร้างสำหรับเก็บข้อมูล error ของ BusinessValidationException
/// </summary>
public class BusinessValidationError
{
    public string ErrorCode { get; }
    public string Message { get; }

    public BusinessValidationError(string errorCode, string message)
    {
        ErrorCode = errorCode ?? "NOT_FOUND";
        Message = message ?? throw new ArgumentNullException(nameof(message));
    }
}
