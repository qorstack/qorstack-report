using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using QorstackReportService.Application.Common.Exceptions;
using QorstackReportService.Application.Common.Interfaces;

namespace QorstackReportService.Application.Fonts.Commands.DeleteFont;

public class HardDeleteFontCommandHandler : IRequestHandler<HardDeleteFontCommand>
{
    private readonly IApplicationDbContext _context;
    private readonly IMinioStorageService _storage;
    private readonly IGotenbergFontCache _fontCache;
    private readonly ILogger<HardDeleteFontCommandHandler> _logger;

    public HardDeleteFontCommandHandler(
        IApplicationDbContext context,
        IMinioStorageService storage,
        IGotenbergFontCache fontCache,
        ILogger<HardDeleteFontCommandHandler> logger)
    {
        _context = context;
        _storage = storage;
        _fontCache = fontCache;
        _logger = logger;
    }

    public async Task Handle(HardDeleteFontCommand command, CancellationToken ct)
    {
        var font = await _context.Fonts
            .FirstOrDefaultAsync(f => f.Id == command.FontId, ct);

        if (font == null)
            throw new NotFoundException("Font", command.FontId);

        // Delete from MinIO (if uploaded, not a local system font)
        if (font.StorageBucket != null)
        {
            try
            {
                await _storage.DeleteFileAsync(font.StorageBucket, font.StorageKey);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "[HardDeleteFont] MinIO delete failed for {Key}", font.StorageKey);
            }
        }

        // Delete from Gotenberg shared fonts volume
        var fileName = Path.GetFileName(font.StorageKey);
        await _fontCache.DeleteAsync(fileName, ct);

        // Hard delete from DB (cascade will remove FontOwnerships if any remain)
        _context.Fonts.Remove(font);
        await _context.SaveChangesAsync(ct);

        _logger.LogInformation("[HardDeleteFont] Deleted font {FontId} ({Name})", font.Id, font.Name);
    }
}
