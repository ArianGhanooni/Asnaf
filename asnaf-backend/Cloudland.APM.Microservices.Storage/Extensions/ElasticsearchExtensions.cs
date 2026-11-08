using Nest;
//using Sin.Course.DTO;
//using Sin.Course.DTO.JsonObjects;

namespace cloudland.APM.Microservices.Storage.Extensions;

public static class ElasticsearchExtensions
{
    public static void AddElasticsearch(this IServiceCollection services, IConfiguration configuration)
    {
        var url = configuration["elasticsearch:url"];
        var defaultIndex = configuration["elasticsearch:index"];

        if (url == null) return;
        var settings = new ConnectionSettings(new Uri(url))
            .DefaultIndex(defaultIndex)
            .PrettyJson()
            .EnableApiVersioningHeader()
            .EnableHttpCompression()
            .ServerCertificateValidationCallback((_, _, _, _) => true);
        settings.BasicAuthentication(configuration["elasticsearch:userName"], configuration["elasticsearch:password"]);
        AddDefaultMappings(settings);
        var client = new ElasticClient(settings);
        services.AddSingleton<IElasticClient>(client);
    }

    private static void AddDefaultMappings(ConnectionSettings settings)
    {
        /*settings.DefaultMappingFor<CourseDTO>(m => m
            .IndexName(nameof(CourseDTO).ToLower())
            .IdProperty(p => p.Id));

        settings.DefaultMappingFor<CourseTermDTO>(m => m
            .IndexName(nameof(CourseTermDTO).ToLower())
            .IdProperty(p => p.Id));

        settings.DefaultMappingFor<CourseTermViewDTO>(m => m
            .IndexName(nameof(CourseTermViewDTO).ToLower())
            .IdProperty(p => p.Id));

        settings.DefaultMappingFor<CourseViewDTO>(m => m
            .IndexName(nameof(CourseViewDTO).ToLower())
            .IdProperty(p => p.Id));

        settings.DefaultMappingFor<VideoCommentInfo>(m => m
            .IndexName(nameof(VideoCommentInfo).ToLower())
            .IdProperty(p => p.Id));
        
        settings.DefaultMappingFor<ConstantDTO>(m => m
            .IndexName(nameof(ConstantDTO).ToLower())
            .IdProperty(p => p.Id));*/
    }
}