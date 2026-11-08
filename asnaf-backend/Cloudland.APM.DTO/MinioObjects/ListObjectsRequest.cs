namespace cloudland.APM.DTO.MinioObjects;

public sealed class ListObjectsRequest
{
    public string? BucketName { get; set; }
    public bool Recursive { get; set; }
    public bool Versioning { get; set; }
    public string? Prefix { get; set; }
    public bool ListObjectV1 { get; set; }
}