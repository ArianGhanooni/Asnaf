namespace cloudland.APM.DTO.JsonObjects;

public sealed class TwoFactorRequestFromClient
{
    public Guid UserId { get; set; }
    public string? secret { get; set; }
    public string? secretBase32Encoded { get; set; }
    public string? code { get; set; }
}