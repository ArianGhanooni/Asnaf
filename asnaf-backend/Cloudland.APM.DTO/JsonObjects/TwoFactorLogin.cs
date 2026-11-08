namespace cloudland.APM.DTO.JsonObjects;

public sealed class TwoFactorLogin
{
    public Guid applicationId { get; set; }
    public Guid userId { get; set; }
    public string? twoFactorId { get; set; }
    public string? code { get; set; }
    public string? ipAddress { get; set; }
}