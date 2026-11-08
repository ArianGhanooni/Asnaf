namespace cloudland.APM.DTO.JsonObjects;

public sealed class TwoFactorSecretDetail
{
    public string? secret { get; set; }
    public string? secretBase32Encoded { get; set; }
}