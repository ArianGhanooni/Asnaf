using cloudland.APM.DTO.JsonObjects;

namespace cloudland.APM.Microservices.Storage.Extensions;

public sealed class IpApiClient(HttpClient httpClient)
{
    private const string BaseUrl = "https://ip-api.com";

    public async Task<IpApiResponse?> Get(string? ipAddress, CancellationToken ct)
    {
        if (string.IsNullOrEmpty(ipAddress)) return null;

        var route = $"{BaseUrl}/json/{ipAddress}";
        var response = await httpClient.GetFromJsonAsync<IpApiResponse>(route, ct);
        return response;
    }
}