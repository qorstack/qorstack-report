namespace QorstackReportService.Application.Common.Exceptions;

/// <summary>
/// Exception for file and upload related issues
/// </summary>
public class FileProcessingException : Exception
{
    public string? FileName { get; }
    public string? FileOperation { get; }
    public long? FileSize { get; }
    public string? StoragePath { get; }

    public FileProcessingException() : base("File processing operation failed.")
    {
    }

    public FileProcessingException(string message) : base(message)
    {
    }

    public FileProcessingException(string message, Exception innerException) : base(message, innerException)
    {
    }

    public FileProcessingException(string message, string fileName, string operation) : base(message)
    {
        FileName = fileName;
        FileOperation = operation;
    }

    public FileProcessingException(string message, string fileName, string operation, string storagePath) : base(message)
    {
        FileName = fileName;
        FileOperation = operation;
        StoragePath = storagePath;
    }

    public FileProcessingException(string message, string fileName, string operation, long fileSize, Exception innerException)
        : base(message, innerException)
    {
        FileName = fileName;
        FileOperation = operation;
        FileSize = fileSize;
    }
}

/// <summary>
/// Exception for document creation issues
/// </summary>
public class DocumentCreationException : Exception
{
    public string? DocumentType { get; }
    public string? DocumentCode { get; }
    public string? EntityId { get; }
    public IDictionary<string, string> ValidationErrors { get; }

    public DocumentCreationException() : base("Document creation failed.")
    {
        ValidationErrors = new Dictionary<string, string>();
    }

    public DocumentCreationException(string message) : base(message)
    {
        ValidationErrors = new Dictionary<string, string>();
    }

    public DocumentCreationException(string message, Exception innerException) : base(message, innerException)
    {
        ValidationErrors = new Dictionary<string, string>();
    }

    public DocumentCreationException(string message, string documentType, string documentCode) : base(message)
    {
        DocumentType = documentType;
        DocumentCode = documentCode;
        ValidationErrors = new Dictionary<string, string>();
    }

    public DocumentCreationException(string message, IDictionary<string, string> validationErrors) : base(message)
    {
        ValidationErrors = validationErrors ?? new Dictionary<string, string>();
    }
}

/// <summary>
/// Exception for data encryption issues
/// </summary>
public class EncryptionException : Exception
{
    public string? FieldName { get; }
    public string? Operation { get; }

    public EncryptionException() : base("Data encryption operation failed.")
    {
    }

    public EncryptionException(string message) : base(message)
    {
    }

    public EncryptionException(string message, Exception innerException) : base(message, innerException)
    {
    }

    public EncryptionException(string message, string fieldName, string operation) : base(message)
    {
        FieldName = fieldName;
        Operation = operation;
    }
}

/// <summary>
/// Exception for data validation issues
/// </summary>
public class DataValidationException : Exception
{
    public string? EntityName { get; }
    public IDictionary<string, string> ValidationErrors { get; }

    public DataValidationException() : base("Data validation failed.")
    {
        ValidationErrors = new Dictionary<string, string>();
    }

    public DataValidationException(string message) : base(message)
    {
        ValidationErrors = new Dictionary<string, string>();
    }

    public DataValidationException(string message, Exception innerException) : base(message, innerException)
    {
        ValidationErrors = new Dictionary<string, string>();
    }

    public DataValidationException(string message, string entityName) : base(message)
    {
        EntityName = entityName;
        ValidationErrors = new Dictionary<string, string>();
    }

    public DataValidationException(string message, IDictionary<string, string> validationErrors) : base(message)
    {
        ValidationErrors = validationErrors ?? new Dictionary<string, string>();
    }

    public DataValidationException(string message, string entityName, IDictionary<string, string> validationErrors) : base(message)
    {
        EntityName = entityName;
        ValidationErrors = validationErrors ?? new Dictionary<string, string>();
    }
}

/// <summary>
/// Exception for missing required data
/// </summary>
public class RequiredDataMissingException : Exception
{
    public string? MissingField { get; }
    public string? EntityType { get; }
    public IList<string> MissingFields { get; }

    public RequiredDataMissingException() : base("Required data is missing.")
    {
        MissingFields = new List<string>();
    }

    public RequiredDataMissingException(string message) : base(message)
    {
        MissingFields = new List<string>();
    }

    public RequiredDataMissingException(string message, Exception innerException) : base(message, innerException)
    {
        MissingFields = new List<string>();
    }

    public RequiredDataMissingException(string message, string missingField) : base(message)
    {
        MissingField = missingField;
        MissingFields = new List<string> { missingField };
    }

    public RequiredDataMissingException(string message, string entityType, IList<string> missingFields) : base(message)
    {
        EntityType = entityType;
        MissingFields = missingFields ?? new List<string>();
    }
}

/// <summary>
/// Exception thrown when a user's quota is exhausted and the operation cannot proceed.
/// Maps to HTTP 402 in the SaaS deployment; in OSS this should never be thrown
/// since FreeQuotaService always returns a non-null charge type.
/// </summary>
public class QuotaExceededException : Exception
{
    public QuotaExceededException(string message) : base(message) { }

    public QuotaExceededException(string message, Exception innerException) : base(message, innerException) { }
}

/// <summary>
/// Exception for when payment is required due to insufficient quota/credits.
/// Kept for backward compatibility — prefer QuotaExceededException in new code.
/// </summary>
public class PaymentRequiredException : Exception
{
    public PaymentRequiredException(string message) : base(message) { }

    public PaymentRequiredException(string message, Exception innerException) : base(message, innerException) { }
}

/// <summary>
/// Exception thrown when a Pro-only feature is invoked without a valid Pro license.
/// Maps to HTTP 403. Logged at Information level — not an error, just a licensing boundary.
/// </summary>
public class ProFeatureRequiredException : Exception
{
    public string FeatureName { get; }

    public ProFeatureRequiredException(string featureName)
        : base($"The feature '{featureName}' requires a Pro license.")
    {
        FeatureName = featureName;
    }
}
