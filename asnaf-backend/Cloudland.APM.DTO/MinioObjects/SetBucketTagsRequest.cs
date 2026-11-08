namespace cloudland.APM.DTO.MinioObjects;

public sealed class SetBucketTagsRequest
{
    public string? BucketName { get; set; }
    public Dictionary<string, string>? tags { get; set; }
    public bool IsObject { get; set; }
}