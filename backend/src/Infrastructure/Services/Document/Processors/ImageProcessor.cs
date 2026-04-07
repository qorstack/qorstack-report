using DocumentFormat.OpenXml;
using DocumentFormat.OpenXml.Wordprocessing;
using A = DocumentFormat.OpenXml.Drawing;
using DW = DocumentFormat.OpenXml.Drawing.Wordprocessing;
using PIC = DocumentFormat.OpenXml.Drawing.Pictures;

namespace QorstackReportService.Infrastructure.Services.Document.Processors;

/// <summary>
/// Helper class for processing images in Word documents
/// </summary>
public static class ImageProcessor
{
    /// <summary>
    /// Creates a Drawing element containing an image for insertion into a Word document
    /// </summary>
    /// <param name="relationshipId">The relationship ID of the image part</param>
    /// <param name="widthEmu">Width in EMUs</param>
    /// <param name="heightEmu">Height in EMUs</param>
    /// <param name="imageName">Name/description of the image</param>
    /// <returns>A Drawing element ready for insertion</returns>
    public static Drawing CreateImageElement(string relationshipId, long widthEmu, long heightEmu, string imageName)
    {
        var element = new Drawing(
            new DW.Inline(
                new DW.Extent { Cx = widthEmu, Cy = heightEmu },
                new DW.EffectExtent
                {
                    LeftEdge = 0L,
                    TopEdge = 0L,
                    RightEdge = 0L,
                    BottomEdge = 0L
                },
                new DW.DocProperties
                {
                    Id = (UInt32Value)1U,
                    Name = imageName,
                    Description = imageName
                },
                new DW.NonVisualGraphicFrameDrawingProperties(
                    new A.GraphicFrameLocks { NoChangeAspect = true }
                ),
                new A.Graphic(
                    new A.GraphicData(
                        new PIC.Picture(
                            new PIC.NonVisualPictureProperties(
                                new PIC.NonVisualDrawingProperties
                                {
                                    Id = (UInt32Value)0U,
                                    Name = imageName
                                },
                                new PIC.NonVisualPictureDrawingProperties()
                            ),
                            new PIC.BlipFill(
                                new A.Blip
                                {
                                    Embed = relationshipId,
                                    CompressionState = A.BlipCompressionValues.Print
                                },
                                new A.Stretch(
                                    new A.FillRectangle()
                                )
                            ),
                            new PIC.ShapeProperties(
                                new A.Transform2D(
                                    new A.Offset { X = 0L, Y = 0L },
                                    new A.Extents { Cx = widthEmu, Cy = heightEmu }
                                ),
                                new A.PresetGeometry(
                                    new A.AdjustValueList()
                                )
                                { Preset = A.ShapeTypeValues.Rectangle }
                            )
                        )
                    )
                    { Uri = "http://schemas.openxmlformats.org/drawingml/2006/picture" }
                )
            )
            {
                DistanceFromTop = (UInt32Value)0U,
                DistanceFromBottom = (UInt32Value)0U,
                DistanceFromLeft = (UInt32Value)0U,
                DistanceFromRight = (UInt32Value)0U
            }
        );

        return element;
    }

    /// <summary>
    /// Creates a Drawing element with specified pixel dimensions
    /// </summary>
    /// <param name="relationshipId">The relationship ID of the image part</param>
    /// <param name="widthPixels">Width in pixels</param>
    /// <param name="heightPixels">Height in pixels</param>
    /// <param name="imageName">Name/description of the image</param>
    /// <returns>A Drawing element ready for insertion</returns>
    public static Drawing CreateImageElementFromPixels(string relationshipId, int widthPixels, int heightPixels, string imageName)
    {
        // Convert pixels to EMUs (1 pixel ≈ 9525 EMUs at 96 DPI)
        const long emuPerPixel = 9525;
        return CreateImageElement(relationshipId, widthPixels * emuPerPixel, heightPixels * emuPerPixel, imageName);
    }

    /// <summary>
    /// Creates a DrawingML Picture element for use inside text boxes (DrawingML shapes)
    /// This is different from WordprocessingML Drawing - it's pure DrawingML for shape content
    /// </summary>
    /// <param name="relationshipId">The relationship ID of the image part</param>
    /// <param name="widthEmu">Width in EMUs</param>
    /// <param name="heightEmu">Height in EMUs</param>
    /// <param name="imageName">Name/description of the image</param>
    /// <returns>A DrawingML Picture element ready for insertion into text box content</returns>
    public static PIC.Picture CreateDrawingMLPicture(string relationshipId, long widthEmu, long heightEmu, string imageName)
    {
        return new PIC.Picture(
            new PIC.NonVisualPictureProperties(
                new PIC.NonVisualDrawingProperties
                {
                    Id = (UInt32Value)0U,
                    Name = imageName
                },
                new PIC.NonVisualPictureDrawingProperties()
            ),
            new PIC.BlipFill(
                new A.Blip
                {
                    Embed = relationshipId,
                    CompressionState = A.BlipCompressionValues.Print
                },
                new A.Stretch(
                    new A.FillRectangle()
                )
            ),
            new PIC.ShapeProperties(
                new A.Transform2D(
                    new A.Offset { X = 0L, Y = 0L },
                    new A.Extents { Cx = widthEmu, Cy = heightEmu }
                ),
                new A.PresetGeometry(
                    new A.AdjustValueList()
                )
                { Preset = A.ShapeTypeValues.Rectangle }
            )
        );
    }

    /// <summary>
    /// Creates a Blip element for embedding in existing DrawingML structures (like text box fills)
    /// </summary>
    public static A.Blip CreateBlip(string relationshipId)
    {
        return new A.Blip
        {
            Embed = relationshipId,
            CompressionState = A.BlipCompressionValues.Print
        };
    }
}
