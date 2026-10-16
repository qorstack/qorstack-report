using System.Text.Json;
using FluentValidation.Results;
using QorstackReportService.Application.Common.Exceptions;
using QorstackReportService.Application.Common.Models;

namespace QorstackReportService.Application.Reports.Models;

/// <summary>
/// Validates a render request and maps it to the <see cref="DocumentProcessingData"/> the processors consume.
/// Every problem is collected and thrown once as a <see cref="ValidationException"/> (400) whose keys are
/// JSON paths such as <c>replace[3].key</c> or <c>table[0].rows[12]</c>.
/// </summary>
public static class RenderRequestMapper
{
    private static readonly string[] FileTypes = ["pdf", "docx"];
    private static readonly string[] ImageFits = ["cover", "contain", "fill"];
    private static readonly string[] SortDirections = ["asc", "desc"];
    private static readonly string[] TotalFunctions = ["SUM", "AVERAGE", "COUNT", "MIN", "MAX"];

    public static DocumentProcessingData ToDocumentProcessingData(PdfFromTemplateRequest request, RenderLimits? limits = null)
    {
        var errors = new List<ValidationFailure>();
        if (!FileTypes.Contains(request.FileType?.ToLowerInvariant()))
            errors.Add(new ValidationFailure("fileType", $"fileType must be one of: {string.Join(", ", FileTypes)}."));

        return Map(request, request.Table, errors, limits ?? RenderLimits.Default);
    }

    public static DocumentProcessingData ToDocumentProcessingData(ExcelFromTemplateRequest request, RenderLimits? limits = null) =>
        Map(request, request.Table, [], limits ?? RenderLimits.Default);

    private static DocumentProcessingData Map(DocumentProcessingRequestBase request, IEnumerable<TableDataRequest>? tables, List<ValidationFailure> errors, RenderLimits limits)
    {
        ValidateTemplateVersion(request, errors);
        ValidateAsync(request, errors);

        // Size limits first: an oversized request is rejected before any heavy mapping.
        var errorsBeforeLimits = errors.Count;
        CheckCount("replace", request.Replace?.Count, limits.MaxItemsPerField, "RENDER_MAX_ITEMS_PER_FIELD", errors);
        CheckCount("image", request.Image?.Count, limits.MaxItemsPerField, "RENDER_MAX_ITEMS_PER_FIELD", errors);
        CheckCount("qrcode", request.QrCode?.Count, limits.MaxItemsPerField, "RENDER_MAX_ITEMS_PER_FIELD", errors);
        CheckCount("barcode", request.Barcode?.Count, limits.MaxItemsPerField, "RENDER_MAX_ITEMS_PER_FIELD", errors);
        var tableList = tables?.ToList();
        for (var t = 0; t < (tableList?.Count ?? 0); t++)
            CheckCount($"table[{t}].rows", tableList![t].Rows.Count, limits.MaxTableRows, "RENDER_MAX_TABLE_ROWS", errors);
        if (errors.Count > errorsBeforeLimits) throw new ValidationException(errors);
        tables = tableList;

        var data = new DocumentProcessingData
        {
            Replace = ToKeyedDictionary(request.Replace, i => (string?)i.Value, "replace", errors)
        };

        if (tables != null)
            data.Table = tables.Select((t, i) => MapTable(t, $"table[{i}]", errors)).ToList();

        data.Image = ToKeyedDictionary(request.Image, (img, path) =>
        {
            if (string.IsNullOrWhiteSpace(img.Src)) errors.Add(new ValidationFailure($"{path}.src", "src is required."));
            if (img.Fit != null && !ImageFits.Contains(img.Fit.ToLowerInvariant()))
                errors.Add(new ValidationFailure($"{path}.fit", $"fit must be one of: {string.Join(", ", ImageFits)}."));
            return (ImageData?)new ImageData
            {
                Src = img.Src,
                Width = img.Width,
                Height = img.Height,
                ObjectFit = img.Fit ?? "contain"
            };
        }, "image", errors);

        data.Qrcode = ToKeyedDictionary(request.QrCode, (qr, path) =>
        {
            if (string.IsNullOrWhiteSpace(qr.Text)) errors.Add(new ValidationFailure($"{path}.text", "text is required."));
            return (QrCodeData?)new QrCodeData
            {
                Text = qr.Text,
                Size = qr.Size,
                Color = qr.Color,
                BackgroundColor = qr.BackgroundColor,
                Logo = qr.Logo
            };
        }, "qrcode", errors);

        data.Barcode = ToKeyedDictionary(request.Barcode, (bc, path) =>
        {
            if (string.IsNullOrWhiteSpace(bc.Text)) errors.Add(new ValidationFailure($"{path}.text", "text is required."));
            return (BarcodeData?)new BarcodeData
            {
                Text = bc.Text,
                Format = bc.Format,
                Width = bc.Width,
                Height = bc.Height,
                IncludeText = bc.IncludeText,
                Color = bc.Color,
                BackgroundColor = bc.BackgroundColor
            };
        }, "barcode", errors);

        if (errors.Count > 0) throw new ValidationException(errors);
        return data;
    }

    private static void CheckCount(string path, int? count, int max, string setting, List<ValidationFailure> errors)
    {
        if (max > 0 && count > max)
            errors.Add(new ValidationFailure(path, $"{count:N0} items exceeds the limit of {max:N0} ({setting}; 0 = unlimited)."));
    }

    private static void ValidateAsync(DocumentProcessingRequestBase request, List<ValidationFailure> errors)
    {
        if (request.WebhookUrl == null) return;
        if (!request.Async)
            errors.Add(new ValidationFailure("webhookUrl", "webhookUrl is only used with \"async\": true."));
        if (!Uri.TryCreate(request.WebhookUrl, UriKind.Absolute, out var uri) || (uri.Scheme != Uri.UriSchemeHttp && uri.Scheme != Uri.UriSchemeHttps))
            errors.Add(new ValidationFailure("webhookUrl", "webhookUrl must be an absolute http(s) URL."));
        else if (request.WebhookUrl.Length > 2048)
            errors.Add(new ValidationFailure("webhookUrl", "webhookUrl must be 2048 characters or fewer."));
    }

    private static void ValidateTemplateVersion(DocumentProcessingRequestBase request, List<ValidationFailure> errors)
    {
        var version = request switch
        {
            PdfFromTemplateRequest p => p.TemplateVersion,
            ExcelFromTemplateRequest e => e.TemplateVersion,
            _ => null
        };
        if (version is < 1) errors.Add(new ValidationFailure("templateVersion", "templateVersion must be 1 or greater."));
    }

    private static TableData MapTable(TableDataRequest table, string path, List<ValidationFailure> errors)
    {
        var columns = table.Columns;
        var known = new HashSet<string>(StringComparer.Ordinal);

        if (columns.Count == 0 && table.Rows.Count > 0)
            errors.Add(new ValidationFailure($"{path}.columns", "columns is required: list the column names once, e.g. [\"item\", \"qty\"]."));
        for (var c = 0; c < columns.Count; c++)
        {
            if (string.IsNullOrWhiteSpace(columns[c]))
                errors.Add(new ValidationFailure($"{path}.columns[{c}]", "Column name is required."));
            else if (!known.Add(columns[c]))
                errors.Add(new ValidationFailure($"{path}.columns[{c}]", $"Duplicate column '{columns[c]}'."));
        }

        var rows = new List<Dictionary<string, object?>>(table.Rows.Count);
        for (var r = 0; r < table.Rows.Count; r++)
        {
            var row = table.Rows[r];
            if (row.Count != columns.Count)
            {
                errors.Add(new ValidationFailure($"{path}.rows[{r}]",
                    $"Row has {row.Count} value(s) but there are {columns.Count} column(s)."));
                continue;
            }

            var dict = new Dictionary<string, object?>(columns.Count);
            for (var c = 0; c < columns.Count; c++)
                dict[columns[c]] = row[c].ValueKind == JsonValueKind.Null ? null : row[c];
            rows.Add(dict);
        }

        void RequireColumn(string? name, string fieldPath)
        {
            if (columns.Count > 0 && (string.IsNullOrWhiteSpace(name) || !known.Contains(name)))
                errors.Add(new ValidationFailure(fieldPath, $"'{name}' is not one of the table's columns."));
        }

        if (table.Sort != null)
        {
            for (var i = 0; i < table.Sort.Count; i++)
            {
                RequireColumn(table.Sort[i].Field, $"{path}.sort[{i}].field");
                if (!SortDirections.Contains(table.Sort[i].Direction?.ToLowerInvariant()))
                    errors.Add(new ValidationFailure($"{path}.sort[{i}].direction", "direction must be \"asc\" or \"desc\"."));
            }
        }
        for (var i = 0; i < (table.VerticalMerge?.Count ?? 0); i++) RequireColumn(table.VerticalMerge![i], $"{path}.verticalMerge[{i}]");
        for (var i = 0; i < (table.Collapse?.Count ?? 0); i++) RequireColumn(table.Collapse![i], $"{path}.collapse[{i}]");

        var td = new TableData
        {
            Rows = rows,
            Sort = table.Sort,
            VerticalMergeFields = table.VerticalMerge,
            CollapseFields = table.Collapse,
        };

        if (table is WordTableDataRequest wt)
        {
            td.RepeatHeader = wt.RepeatHeader;
        }
        else if (table is ExcelTableDataRequest et)
        {
            td.AutoFilter = et.AutoFilter;
            td.FreezeHeader = et.FreezeHeader;
            td.AutoFitColumns = et.AutoFitColumns;
            td.AsExcelTable = et.AsExcelTable;
            td.ExcelTableStyle = et.ExcelTableStyle;
            td.Outline = et.Outline;
            td.GenerateTotals = et.GenerateTotals == null ? null
                : ToKeyedDictionary(et.GenerateTotals, (item, itemPath) =>
                {
                    RequireColumn(item.Key, $"{itemPath}.key");
                    if (!TotalFunctions.Contains(item.Value?.ToUpperInvariant()))
                        errors.Add(new ValidationFailure($"{itemPath}.value", $"value must be one of: {string.Join(", ", TotalFunctions)}."));
                    return item.Value!;
                }, $"{path}.generateTotals", errors);
            td.NumberFormat = et.NumberFormat == null ? null
                : ToKeyedDictionary(et.NumberFormat, (item, itemPath) =>
                {
                    RequireColumn(item.Key, $"{itemPath}.key");
                    return item.Value;
                }, $"{path}.numberFormat", errors);
            td.ConditionalFormat = et.ConditionalFormat?.Select((cf, i) =>
            {
                RequireColumn(cf.Field, $"{path}.conditionalFormat[{i}].field");
                return new ConditionalFormatConfig
                {
                    Field = cf.Field,
                    Rules = cf.Rules.Select(r => new ConditionalFormatRule
                    {
                        Value = r.Value,
                        Operator = r.Operator,
                        FontColor = r.FontColor,
                        BackgroundColor = r.BackgroundColor,
                        Bold = r.Bold,
                        Italic = r.Italic
                    }).ToList()
                };
            }).ToList();
            if (et.SplitToSheets != null)
            {
                RequireColumn(et.SplitToSheets.Field, $"{path}.splitToSheets.field");
                td.SplitToSheets = new SplitToSheetsConfig
                {
                    Field = et.SplitToSheets.Field,
                    TemplateSheet = et.SplitToSheets.TemplateSheet
                };
            }
        }

        return td;
    }

    private static Dictionary<string, TValue> ToKeyedDictionary<TItem, TValue>(
        IEnumerable<TItem>? items, Func<TItem, TValue> selector, string field, List<ValidationFailure> errors)
        where TItem : IKeyedRequestItem =>
        ToKeyedDictionary(items, (item, _) => selector(item), field, errors);

    /// <summary>
    /// Converts a keyed request list into the marker-name dictionary used by the processors.
    /// Empty or duplicate keys are reported as validation errors.
    /// </summary>
    private static Dictionary<string, TValue> ToKeyedDictionary<TItem, TValue>(
        IEnumerable<TItem>? items, Func<TItem, string, TValue> selector, string field, List<ValidationFailure> errors)
        where TItem : IKeyedRequestItem
    {
        var result = new Dictionary<string, TValue>();
        if (items == null) return result;

        var index = 0;
        foreach (var item in items)
        {
            var path = $"{field}[{index}]";
            var value = selector(item, path);
            if (string.IsNullOrWhiteSpace(item.Key))
                errors.Add(new ValidationFailure($"{path}.key", "Key is required."));
            else if (!result.TryAdd(item.Key, value))
                errors.Add(new ValidationFailure($"{path}.key", $"Duplicate key '{item.Key}'."));
            index++;
        }
        return result;
    }

    public static PdfPasswordOptions? ToPdfPasswordOptions(PdfPasswordRequest? request) => request == null ? null : new PdfPasswordOptions
    {
        UserPassword = request.UserPassword,
        OwnerPassword = request.OwnerPassword,
        RestrictPrinting = request.RestrictPrinting,
        RestrictCopying = request.RestrictCopying,
        RestrictModifying = request.RestrictModifying
    };

    public static PdfWatermarkOptions? ToPdfWatermarkOptions(PdfWatermarkRequest? request) => request == null ? null : new PdfWatermarkOptions
    {
        Text = request.Text,
        FontSize = request.FontSize,
        FontFamily = request.FontFamily,
        FontWeight = request.FontWeight,
        FontItalic = request.FontItalic,
        Color = request.Color,
        Opacity = request.Opacity,
        Rotation = request.Rotation,
        PositionX = request.PositionX,
        PositionY = request.PositionY,
        Pages = request.Pages
    };
}
