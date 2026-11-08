using FFMediaToolkit.Graphics;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.PixelFormats;

namespace cloudland.APM.Microservices.Storage.Extensions;

public static class Extentions
{
    public static Image<Bgr24> ToBitmap(this ImageData imageData)
    {
        return Image.LoadPixelData<Bgr24>(imageData.Data, imageData.ImageSize.Width, imageData.ImageSize.Height);
    }

    public static bool IsGuid(string value)
    {
        Guid x;
        return Guid.TryParse(value, out x);
    }
}