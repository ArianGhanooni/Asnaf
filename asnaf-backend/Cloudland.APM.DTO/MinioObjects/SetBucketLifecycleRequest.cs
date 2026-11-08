namespace cloudland.APM.DTO.MinioObjects;

public sealed class SetBucketLifecycleRequest
{
    public string? BucketName { get; set; }
    public DateTime ExpireDate { get; set; }
    public bool IsDeleteMaker { get; set; }
}