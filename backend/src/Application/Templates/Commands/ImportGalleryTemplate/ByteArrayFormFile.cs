using Microsoft.AspNetCore.Http;

namespace QorstackReportService.Application.Templates.Commands.ImportGalleryTemplate;

/// <summary>
/// Minimal <see cref="IFormFile"/> backed by an in-memory byte array.
/// Lets gallery files be fed into the existing UploadTemplateCommand pipeline
/// without depending on the concrete FormFile type.
/// </summary>
internal sealed class ByteArrayFormFile : IFormFile
{
    private readonly byte[] _content;

    public ByteArrayFormFile(byte[] content, string fileName, string contentType)
    {
        _content = content;
        FileName = fileName;
        Name = "file";
        ContentType = contentType;
        Headers = new HeaderDictionary();
    }

    public string ContentType { get; set; }
    public string ContentDisposition { get; set; } = string.Empty;
    public IHeaderDictionary Headers { get; set; }
    public long Length => _content.Length;
    public string Name { get; set; }
    public string FileName { get; set; }

    public Stream OpenReadStream() => new MemoryStream(_content, writable: false);

    public void CopyTo(Stream target) => target.Write(_content, 0, _content.Length);

    public Task CopyToAsync(Stream target, CancellationToken cancellationToken = default)
        => target.WriteAsync(_content, 0, _content.Length, cancellationToken);
}
