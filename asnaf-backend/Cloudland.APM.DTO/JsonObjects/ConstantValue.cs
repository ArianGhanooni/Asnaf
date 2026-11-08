namespace cloudland.APM.DTO.JsonObjects;

public sealed class ConstantValue
{
    public string? ValueType { get; set; }


    public string? Value { get; set; }


    public string? ValueMask { get; set; }

    public int Priority { get; set; }
}