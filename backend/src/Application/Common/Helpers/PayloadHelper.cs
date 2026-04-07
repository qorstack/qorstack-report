using System.Text.Json;
using System.Text.Json.Nodes;
using QorstackReportService.Application.Common.Interfaces;

namespace QorstackReportService.Application.Common.Helpers;

public static class PayloadHelper
{
    public static string SyncPayloadWithMarkers(string? currentPayloadJson, List<TemplateMarker> markers, bool deleteUnused = false, bool preserveOrder = false)
    {
        JsonNode? rootNode = null;

        if (!string.IsNullOrEmpty(currentPayloadJson))
        {
            try
            {
                rootNode = JsonNode.Parse(currentPayloadJson);
            }
            catch
            {
                // If invalid JSON, start fresh
            }
        }

        if (rootNode is not JsonObject payload)
        {
            payload = new JsonObject();
            preserveOrder = false;
        }



        // 1. Collect all markers (Preserve order)
        var variables = new List<string>();
        var tableVariables = new Dictionary<int, List<string>>(); // TableIndex -> List of variables
        var images = new List<string>();
        var qrCodes = new List<string>();
        var barcodes = new List<string>();

        foreach (var marker in markers)
        {
            // Normalize marker type to lowercase for switch
            switch (marker.Type.ToLowerInvariant())
            {
                case "variable":
                    if (marker.IsTable && marker.TableIndex.HasValue)
                    {
                        if (!tableVariables.ContainsKey(marker.TableIndex.Value))
                        {
                            tableVariables[marker.TableIndex.Value] = new List<string>();
                        }
                        if (!tableVariables[marker.TableIndex.Value].Contains(marker.Name))
                        {
                            tableVariables[marker.TableIndex.Value].Add(marker.Name);
                        }
                    }
                    else
                    {
                         if (!variables.Contains(marker.Name))
                         {
                             variables.Add(marker.Name);
                         }
                    }
                    break;
                case "image":
                    if (!images.Contains(marker.Name)) images.Add(marker.Name);
                    break;
                case "qr":
                case "qrcode":
                    if (!qrCodes.Contains(marker.Name)) qrCodes.Add(marker.Name);
                    break;
                case "barcode":
                    if (!barcodes.Contains(marker.Name)) barcodes.Add(marker.Name);
                    break;
            }
        }

        // 2. Sync Replace (Variables) -> "replace"
        // To enforce order "Top to Bottom", we recreate the section
        var oldReplaceSection = payload.ContainsKey("replace") && payload["replace"] is JsonObject oldRep
            ? oldRep
            : new JsonObject();

        var newReplaceSection = new JsonObject();
        foreach (var variable in variables)
        {
            if (oldReplaceSection.ContainsKey(variable))
            {
                // Move existing value (Clone to be safe or just reassign if not parented,
                // but JsonNode can only have one parent. Need to detach or deep clone?
                // JsonNode.DeepClone() is available in newer versions, or we just take the value.
                // Actually, if we are building a new tree, we can just assign,
                // but we must remove it from old parent first or clone.
                // DeepClone is safest.
                newReplaceSection[variable] = oldReplaceSection[variable]?.DeepClone();
            }
            else
            {
                newReplaceSection[variable] = null;
            }
        }

        // If 'deleteUnused' is FALSE, we might want to keep variables that are NOT in the document?
        // The user requirement says "sort ... from top to bottom".
        // If we keep unused variables, where do they go? At the bottom?
        // The current logic PruneSection removes them if deleteUnused is true.
        // If deleteUnused is false, we should append the remaining keys from oldSection.
        if (!deleteUnused)
        {
             foreach (var kvp in oldReplaceSection)
             {
                 if (!newReplaceSection.ContainsKey(kvp.Key))
                 {
                     newReplaceSection[kvp.Key] = kvp.Value?.DeepClone();
                 }
             }
        }

        payload["replace"] = newReplaceSection;

        // 3. Sync Tables -> "table" (List of TableData)
        if (!payload.ContainsKey("table") || !(payload["table"] is JsonArray))
        {
            payload["table"] = new JsonArray();
        }

        var tablesArray = (JsonArray)payload["table"]!;

        // Ensure we have enough tables in the array
        int maxIndex = tableVariables.Keys.Count > 0 ? tableVariables.Keys.Max() : -1;

        // If existing array is smaller than the highest index found, add empty placeholders/structures
        // Note: TableIndex is 0-based.
        while (tablesArray.Count <= maxIndex)
        {
            var newTableData = new JsonObject();
            newTableData["rows"] = new JsonArray();
            // Optional: sort and groupBy can be null or omitted
            newTableData["sort"] = new JsonArray(); // Default to empty array to support multiple sort keys
            tablesArray.Add(newTableData);
        }

        // Remove unused tables if requested
        if (deleteUnused)
        {
             // Remove tables beyond maxIndex (tables that no longer exist in the document)
             while (tablesArray.Count > maxIndex + 1)
             {
                 tablesArray.RemoveAt(tablesArray.Count - 1);
             }
        }

        // Sync each table structure
        foreach (var (index, vars) in tableVariables)
        {
            if (index < tablesArray.Count && tablesArray[index] is JsonObject tableData)
            {
                // Ensure "rows" exists
                if (!tableData.ContainsKey("rows") || !(tableData["rows"] is JsonArray))
                {
                    tableData["rows"] = new JsonArray();
                }

                // Ensure sort and groupBy exist
                if (!tableData.ContainsKey("sort")) tableData["sort"] = new JsonArray();
                if (!tableData.ContainsKey("groupBy")) tableData["groupBy"] = null;

                var tableRows = (JsonArray)tableData["rows"]!;

                // Ensure at least one row exists to show structure
                if (tableRows.Count == 0)
                {
                    tableRows.Add(new JsonObject());
                }

                // Sync keys for the first row (as a sample)
                if (tableRows.Count > 0 && tableRows[0] is JsonObject oldFirstRow)
                {
                    var newFirstRow = new JsonObject();
                    foreach (var variable in vars)
                    {
                        if (oldFirstRow.ContainsKey(variable))
                        {
                            newFirstRow[variable] = oldFirstRow[variable]?.DeepClone();
                        }
                        else
                        {
                            newFirstRow[variable] = null;
                        }
                    }

                    if (!deleteUnused)
                    {
                        foreach (var kvp in oldFirstRow)
                        {
                            if (!newFirstRow.ContainsKey(kvp.Key))
                            {
                                newFirstRow[kvp.Key] = kvp.Value?.DeepClone();
                            }
                        }
                    }

                    tableRows[0] = newFirstRow;
                }
                else
                {
                    // No existing rows, create a sample row with all variables
                    var sampleRow = new JsonObject();
                    foreach (var variable in vars)
                    {
                        sampleRow[variable] = null;
                    }
                    tableRows.Add(sampleRow);
                }
            }
            // Fallback for legacy format (List<List<Dictionary>>) -> Migrate to new format
            else if (index < tablesArray.Count && tablesArray[index] is JsonArray oldFormatRows)
            {
                 // Convert old format to new format
                 var newTableData = new JsonObject();
                 var newRows = new JsonArray();

                 // Use first row of old format as sample if available
                 if (oldFormatRows.Count > 0 && oldFormatRows[0] is JsonObject oldFirstRow)
                 {
                      var newFirstRow = new JsonObject();
                      foreach (var variable in vars)
                      {
                          if (oldFirstRow.ContainsKey(variable)) newFirstRow[variable] = oldFirstRow[variable]?.DeepClone();
                          else newFirstRow[variable] = null;
                      }
                      newRows.Add(newFirstRow);
                 }
                 else
                 {
                      // Create sample row
                      var sampleRow = new JsonObject();
                      foreach (var variable in vars) sampleRow[variable] = null;
                      newRows.Add(sampleRow);
                 }

                 newTableData["rows"] = newRows;
                 newTableData["sort"] = new JsonArray(); // Default to empty array
                 tablesArray[index] = newTableData;
            }
        }

        // 4. Sync Images -> "image"
        var oldImageSection = payload.ContainsKey("image") && payload["image"] is JsonObject oldImg ? oldImg : new JsonObject();
        var newImageSection = new JsonObject();

        foreach (var image in images)
        {
            if (oldImageSection.ContainsKey(image))
            {
                newImageSection[image] = oldImageSection[image]?.DeepClone();
            }
            else
            {
                var imgObj = new JsonObject();
                imgObj["src"] = null;
                imgObj["width"] = 200;
                imgObj["height"] = 200;
                imgObj["objectFit"] = "cover";
                newImageSection[image] = imgObj;
            }
        }

        if (!deleteUnused)
        {
             foreach (var kvp in oldImageSection)
             {
                 if (!newImageSection.ContainsKey(kvp.Key)) newImageSection[kvp.Key] = kvp.Value?.DeepClone();
             }
        }
        payload["image"] = newImageSection;

        // 5. Sync QrCodes -> "qrcode"
        var oldQrSection = payload.ContainsKey("qrcode") && payload["qrcode"] is JsonObject oldQr ? oldQr : new JsonObject();
        var newQrSection = new JsonObject();

        foreach (var qr in qrCodes)
        {
            if (oldQrSection.ContainsKey(qr))
            {
                newQrSection[qr] = oldQrSection[qr]?.DeepClone();
            }
            else
            {
                var qrObj = new JsonObject();
                qrObj["text"] = null;
                qrObj["size"] = 150;
                newQrSection[qr] = qrObj;
            }
        }
         if (!deleteUnused)
        {
             foreach (var kvp in oldQrSection)
             {
                 if (!newQrSection.ContainsKey(kvp.Key)) newQrSection[kvp.Key] = kvp.Value?.DeepClone();
             }
        }
        payload["qrcode"] = newQrSection;

        // 6. Sync Barcodes -> "barcode"
        var oldBcSection = payload.ContainsKey("barcode") && payload["barcode"] is JsonObject oldBc ? oldBc : new JsonObject();
        var newBcSection = new JsonObject();

        foreach (var barcode in barcodes)
        {
            if (oldBcSection.ContainsKey(barcode))
            {
                newBcSection[barcode] = oldBcSection[barcode]?.DeepClone();
            }
            else
            {
                var bcObj = new JsonObject();
                bcObj["text"] = "";
                bcObj["includeText"] = true;
                bcObj["format"] = "Code128";
                bcObj["width"] = 200;
                bcObj["height"] = 100;
                newBcSection[barcode] = bcObj;
            }
        }
         if (!deleteUnused)
        {
             foreach (var kvp in oldBcSection)
             {
                 if (!newBcSection.ContainsKey(kvp.Key)) newBcSection[kvp.Key] = kvp.Value?.DeepClone();
             }
        }
        payload["barcode"] = newBcSection;

        // 7. Remove Sections (Conditions) if exists and deleteUnused is true
        if (deleteUnused && payload.ContainsKey("sections"))
        {
            payload.Remove("sections");
        }
        // Also remove legacy "tables" object if exists (since we use "table" now)
        if (deleteUnused && payload.ContainsKey("tables"))
        {
            payload.Remove("tables");
        }
        // Also remove legacy "images" object if exists (since we use "image" now)
        if (deleteUnused && payload.ContainsKey("images"))
        {
             payload.Remove("images");
        }
        // Also remove legacy "qrcodes" object if exists (since we use "qrcode" now)
        if (deleteUnused && payload.ContainsKey("qrcodes"))
        {
             payload.Remove("qrcodes");
        }
        // Also remove legacy "qrCode" object if exists (since we use "qrcode" now)
        if (deleteUnused && payload.ContainsKey("qrCode"))
        {
             payload.Remove("qrCode");
        }

        return payload.ToJsonString(new JsonSerializerOptions { WriteIndented = true });
    }
}
