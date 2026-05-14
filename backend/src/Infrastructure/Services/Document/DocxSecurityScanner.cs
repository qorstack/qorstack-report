using DocumentFormat.OpenXml.Packaging;
using QorstackReportService.Application.Common.Models;

namespace QorstackReportService.Infrastructure.Services.Document;

/// <summary>
/// Lightweight DOCX security scanner that checks for VBA macros, OLE objects,
/// and external relationships without full document processing. ~1-5ms per scan.
/// </summary>
public static class DocxSecurityScanner
{
    public static DocxSecurityScanResult Scan(Stream docxStream)
    {
        var result = new DocxSecurityScanResult { IsSafe = true };
        var startPos = docxStream.Position;

        try
        {
            using var doc = WordprocessingDocument.Open(docxStream, false);
            var mainPart = doc.MainDocumentPart;
            if (mainPart == null)
            {
                result.IsSafe = false;
                result.Threats.Add("Document does not contain a main document part");
                return result;
            }

            // 1. VBA Macro Project
            if (mainPart.VbaProjectPart != null)
            {
                result.Threats.Add("File contains VBA macro project");
            }

            // 2. Embedded OLE objects / packages (potential executables)
            foreach (var part in mainPart.Parts)
            {
                if (part.OpenXmlPart is EmbeddedObjectPart)
                {
                    result.Threats.Add($"File contains embedded OLE object ({part.RelationshipId})");
                }
                else if (part.OpenXmlPart is EmbeddedPackagePart)
                {
                    result.Threats.Add($"File contains embedded package ({part.RelationshipId})");
                }
            }

            // 3. External relationships (remote template injection)
            foreach (var rel in mainPart.ExternalRelationships)
            {
                var relType = rel.RelationshipType?.ToLowerInvariant() ?? "";
                if (relType.Contains("attachedtemplate") ||
                    relType.Contains("frame") ||
                    relType.Contains("oleobject"))
                {
                    result.Threats.Add($"File contains suspicious external relationship: {rel.Uri}");
                }
            }

            result.IsSafe = result.Threats.Count == 0;
        }
        catch (Exception ex)
        {
            result.IsSafe = false;
            result.Threats.Add($"Failed to scan document: {ex.Message}");
        }
        finally
        {
            if (docxStream.CanSeek)
            {
                docxStream.Position = startPos;
            }
        }

        return result;
    }
}
