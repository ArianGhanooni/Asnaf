namespace cloudland.APM.DTO.MinioObjects;

public sealed class MakeBucketRequest
{
    public string? bucketName { get; set; }
    public string? location { get; set; }
}