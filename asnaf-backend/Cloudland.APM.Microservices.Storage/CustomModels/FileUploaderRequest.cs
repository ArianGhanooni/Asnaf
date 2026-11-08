namespace cloudland.APM.Microservices.Storage.CustomModels;

public sealed class FileUploaderRequest
{
    public string? BucketName { get; set; }
    public string? FolderName { get; set; }
    public IFormFile? File { get; set; }
    public string? FileName { get; set; }
    public bool IgnoreDefaultPath { get; set; }
}