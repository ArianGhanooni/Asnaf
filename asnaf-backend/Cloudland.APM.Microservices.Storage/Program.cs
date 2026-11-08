using System.IO.Compression;
using Asp.Versioning;
using cloudland.APM.Microservices.Storage.Extensions;
using Cloudland.APM.Models.JWT;
using Exceptionless;
using MassTransit;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.OData;
using Microsoft.AspNetCore.ResponseCompression;
using Microsoft.AspNetCore.Server.Kestrel.Core;
using Microsoft.OpenApi;
using Newtonsoft.Json;
using Scalar.AspNetCore;
using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Minio;
using StackExchange.Redis;

var builder = WebApplication.CreateBuilder(args);
var environmentName = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT");

var configuration = new ConfigurationBuilder()
    .AddJsonFile("appsettings.json", false)
    .AddJsonFile($"appsettings.{environmentName}.json", optional: true)
    .AddEnvironmentVariables()
    .Build();
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy
            .AllowAnyHeader()
            .AllowAnyMethod()
            .WithOrigins(
                "http://localhost",
                "https://localhost",
                "http://localhost:9000",
                "https://localhost:9000",
                "https://market-lancer.com")
            .AllowCredentials();
    });
});
builder.Services.AddDataProtection()
    .PersistKeysToFileSystem(new DirectoryInfo(@"DataProtectionKeys/"))
    .SetApplicationName("APM")
    .SetDefaultKeyLifetime(TimeSpan.FromDays(14));
builder.Services.AddResponseCaching();
builder.Services.Configure<GzipCompressionProviderOptions>(options => { options.Level = CompressionLevel.Optimal; });
builder.Services.Configure<BrotliCompressionProviderOptions>(options => { options.Level = CompressionLevel.Optimal; });
builder.Services.AddResponseCompression(action =>
{
    action.Providers.Add<BrotliCompressionProvider>();
    action.Providers.Add<GzipCompressionProvider>();
});
builder.Services.AddSingleton<IConfiguration>(configuration);
builder.Services.AddElasticsearch(configuration);

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddJwtAuthentication(configuration);
builder.Services.AddApiVersioning(options =>
{
    options.DefaultApiVersion = new ApiVersion(1, 0); // Default version: 1.0
    options.AssumeDefaultVersionWhenUnspecified = true;
    options.ReportApiVersions = true;
    options.ApiVersionReader = ApiVersionReader.Combine(
        new QueryStringApiVersionReader("version"),
        new UrlSegmentApiVersionReader(),
        new HeaderApiVersionReader("X-API-Version"),
        new MediaTypeApiVersionReader("version")
    );
});
    
builder.Services.AddStackExchangeRedisCache(options =>
{
    options.ConfigurationOptions = new ConfigurationOptions
    {
        ClientName = "APM-PLATFORM",
        AbortOnConnectFail = true,
        EndPoints =
        {
            {
                "localhost", 6379
            }
        },
    };
    //options.ConfigurationOptions.CertificateValidation += RedisExtensions.CheckServerCertificate!;
});

builder.Services.AddMemoryCache();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSignalRCore();
builder.Services.AddHttpContextAccessor();

// Configure MinIO client
var minioUrl = configuration["MinIO:MinIOUrl"] ?? "62.60.211.182:9000";
var useSsl = configuration.GetValue<bool>("MinIO:UseSSL", false);
var minioAccessKey = configuration["MinIO:AccessKey"] ?? "admin";
var minioSecretKey = configuration["MinIO:SecretKey"] ?? "Kabinet95##";
var minioRegion = configuration["MinIO:Region"] ?? "Iran";

// MinIO client expects endpoint without protocol (just hostname:port)
// Remove any protocol prefix if present
var minioEndpoint = minioUrl.Replace("http://", "").Replace("https://", "");

// Configure MinIO client
// MinIO client expects endpoint without protocol (just hostname:port)
// Use WithSSL(false) to specify HTTP connection when UseSSL is false
if (useSsl)
{
    builder.Services.AddMinio(configureClient => configureClient
        .WithEndpoint(minioEndpoint)
        .WithCredentials(minioAccessKey, minioSecretKey)
        .WithRegion(minioRegion)
        .Build());
}
else
{
    builder.Services.AddMinio(configureClient => configureClient
        .WithEndpoint(minioEndpoint)
        .WithCredentials(minioAccessKey, minioSecretKey)
        .WithRegion(minioRegion)
        .WithSSL(false)
        .Build());
}

builder.Services.AddMassTransit(x =>
{
    x.SetEndpointNameFormatter(new KebabCaseEndpointNameFormatter("notification.service", false));
    x.UsingRabbitMq((context, cfg) =>
    {
        cfg.Host(configuration.GetValue("RabbitMq:Host", "admin"), "/", host =>
        {
            host.Username(configuration.GetValue("RabbitMq:Username", "admin"));
            host.Password(configuration.GetValue("RabbitMq:Password", "Kabinet95##"));
        });
        cfg.ConfigureEndpoints(context);
    });
});

builder.Services.Configure<KestrelServerOptions>(options => { options.Limits.MaxRequestBodySize = int.MaxValue; });

builder.Services.Configure<FormOptions>(x =>
{
    x.ValueLengthLimit = int.MaxValue;
    x.MultipartBodyLengthLimit = int.MaxValue;
    x.MultipartHeadersLengthLimit = int.MaxValue;
});
builder.Services.AddHealthChecks();
builder.Services.AddOpenApi();
builder.Services.AddOutputCache(options =>
{
    options.AddBasePolicy(policy => policy.Expire(TimeSpan.FromMinutes(10)));
});
builder.Services.AddControllers()
    .AddOData()
    .AddNewtonsoftJson(x =>
        x.SerializerSettings.ReferenceLoopHandling = ReferenceLoopHandling.Ignore);
builder.Services.AddExceptionHandler<GlobalExceptionHandler>();
builder.Services.AddProblemDetails();
builder.Services.AddExceptionless();
builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
    options.KnownIPNetworks.Clear();
    options.KnownProxies.Clear();
});

builder.Services.Configure<JwtSettings>(
    builder.Configuration.GetSection("JwtSettings"));

builder.Services.AddHttpClient<IpApiClient>();
builder.Services.AddSwaggerGen(opt => 
{
    opt.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        BearerFormat = "JWT",
        Description = "JWT Authorization header using the Bearer scheme.",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.Http,
        Scheme = "Bearer"
    });
    opt.AddSecurityRequirement(document => new OpenApiSecurityRequirement
    {
        {
            // تغییر مهم: استفاده از OpenApiSecuritySchemeReference به جای OpenApiSecurityScheme
            new OpenApiSecuritySchemeReference("Bearer", document),
            []
        }
    });
});

var app = builder.Build();
app.UseForwardedHeaders();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger(opt =>
    {
        opt.RouteTemplate = "openapi/{documentName}.json";
    });
    app.MapScalarApiReference(opt =>
    {
        opt.Title = "SEEN Platform Storage API";
        opt.Theme = ScalarTheme.Mars;
        opt.DefaultHttpClient = new KeyValuePair<ScalarTarget, ScalarClient>(ScalarTarget.Http, ScalarClient.Http11);
    });
}

app.UseCors();

app.UseAuthentication();
app.UseAuthorization();
app.MapHealthChecks("/api/health");
app.UseExceptionless();
app.UseResponseCompression();
app.UseResponseCaching();
app.MapOpenApi()
    .RequireAuthorization("ApiTesterPolicy")
    .CacheOutput();
app.MapControllers();
app.Run("http://localhost:20002");