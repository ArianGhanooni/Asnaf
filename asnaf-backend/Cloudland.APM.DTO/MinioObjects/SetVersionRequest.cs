namespace cloudland.APM.DTO.MinioObjects;

public sealed class SetVersionRequest
{
    public string? BucketName { get; set; }
    public bool Enabled { get; set; }
}