using System.Collections.ObjectModel;
using System.Net;
using Asp.Versioning;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Minio;
using Minio.DataModel;
using Minio.DataModel.Args;
using Minio.DataModel.Encryption;
using Minio.DataModel.ILM;
using Minio.DataModel.Notification;
using Minio.DataModel.Tags;
using Nest;
using cloudland.APM.DTO.MinioObjects;
using Bucket = Minio.DataModel.Bucket;

namespace cloudland.APM.Microservices.Storage.Controller;

[ApiVersion("1.0")]
[Route("api/v1/buckets")]
[ApiController]
[ApiExplorerSettings(GroupName = "v1")]
[Authorize]
public class BucketsController(IMinioClient minioClient, IElasticClient _elasticClient) : ControllerBase
{
    public IElasticClient ElasticClient { get; } = _elasticClient;

    [HttpGet("ListBuckets")]
    [ProducesResponseType(typeof(Collection<Bucket>), (int)HttpStatusCode.OK)]
    public async Task<ActionResult> ListBuckets()
    {
        return Ok(await minioClient.ListBucketsAsync());
    }

    [HttpPost("MakeBucket")]
    [ProducesResponseType((int)HttpStatusCode.OK)]
    [ProducesResponseType((int)HttpStatusCode.BadRequest)]
    public async Task<ActionResult> MakeBucket([FromBody] MakeBucketRequest bucketInfo)
    {
        var beArgs = new BucketExistsArgs()
            .WithBucket(bucketInfo.bucketName?.ToLower());
        var found = await minioClient.BucketExistsAsync(beArgs);
        if (found) return BadRequest();
        var newBucket = new MakeBucketArgs()
            .WithLocation(bucketInfo.location)
            .WithBucket(bucketInfo.bucketName?.ToLower());
        await minioClient.MakeBucketAsync(newBucket);
        return Ok();
    }

    [HttpGet("IsExistBucket/{bucketName}")]
    [ProducesResponseType(typeof(bool), (int)HttpStatusCode.OK)]
    [ProducesResponseType((int)HttpStatusCode.NotFound)]
    public async Task<ActionResult> IsExistBucket(string bucketName)
    {
        var beArgs = new BucketExistsArgs()
            .WithBucket(bucketName.ToLower());
        var found = await minioClient.BucketExistsAsync(beArgs);
        if (found) return Ok();
        return NotFound();
    }


    [HttpDelete("RemoveBucket")]
    [ProducesResponseType(typeof(bool), (int)HttpStatusCode.OK)]
    [ProducesResponseType((int)HttpStatusCode.NotFound)]
    public async Task<ActionResult> RemoveBucket([FromBody] MakeBucketRequest bucketInfo)
    {
        var beArgs = new BucketExistsArgs()
            .WithBucket(bucketInfo.bucketName?.ToLower());
        var found = await minioClient.BucketExistsAsync(beArgs);
        if (!found) return NotFound();
        await minioClient.RemoveBucketAsync(
            new RemoveBucketArgs()
                .WithBucket(bucketInfo.bucketName?.ToLower()));
        return Ok();
    }

    [HttpPost("SetVersion")]
    [ProducesResponseType((int)HttpStatusCode.OK)]
    [ProducesResponseType((int)HttpStatusCode.NotFound)]
    public async Task<ActionResult> SetVersion([FromBody] SetVersionRequest request)
    {
        var beArgs = new BucketExistsArgs()
            .WithBucket(request.BucketName?.ToLower());
        var found = await minioClient.BucketExistsAsync(beArgs);
        if (!found) return NotFound();
        SetVersioningArgs? args;
        if (request.Enabled)
            args = new SetVersioningArgs()
                .WithBucket(request.BucketName?.ToLower())
                .WithVersioningEnabled();
        else
            args = new SetVersioningArgs()
                .WithBucket(request.BucketName?.ToLower())
                .WithVersioningSuspended();

        await minioClient.SetVersioningAsync(args);
        return Ok();
    }

    [HttpGet("GetVersion/{bucketName}")]
    [ProducesResponseType(typeof(VersioningConfiguration), (int)HttpStatusCode.OK)]
    [ProducesResponseType((int)HttpStatusCode.NotFound)]
    public async Task<ActionResult> GetVersion(string bucketName)
    {
        var beArgs = new BucketExistsArgs()
            .WithBucket(bucketName.ToLower());
        var found = await minioClient.BucketExistsAsync(beArgs);
        if (found)
            return Ok(await minioClient.GetVersioningAsync(new GetVersioningArgs().WithBucket(bucketName.ToLower())));
        return NotFound();
    }

    [HttpPost("SetBucketEncryption")]
    [ProducesResponseType((int)HttpStatusCode.OK)]
    [ProducesResponseType((int)HttpStatusCode.NotFound)]
    public async Task<ActionResult> SetBucketEncryption([FromBody] BucketEncryptionRequest request)
    {
        var beArgs = new BucketExistsArgs()
            .WithBucket(request.BucketName?.ToLower());
        var found = await minioClient.BucketExistsAsync(beArgs);
        if (!found) return NotFound();
        var args = new SetBucketEncryptionArgs()
            .WithBucket(request.BucketName?.ToLower())
            .WithAESConfig();
        await minioClient.SetBucketEncryptionAsync(args);
        return Ok();
    }

    [HttpGet("GetBucketEncryption/{bucketName}")]
    [ProducesResponseType(typeof(ServerSideEncryptionConfiguration), (int)HttpStatusCode.OK)]
    [ProducesResponseType((int)HttpStatusCode.NotFound)]
    public async Task<ActionResult> GetBucketEncryption(string bucketName)
    {
        var beArgs = new BucketExistsArgs()
            .WithBucket(bucketName.ToLower());
        var found = await minioClient.BucketExistsAsync(beArgs);
        if (!found) return NotFound();
        var args = new GetBucketEncryptionArgs()
            .WithBucket(bucketName.ToLower());
        return Ok(await minioClient.GetBucketEncryptionAsync(args));
    }

    [HttpDelete("RemoveBucketEncryption")]
    [ProducesResponseType(typeof(ServerSideEncryptionConfiguration), (int)HttpStatusCode.OK)]
    [ProducesResponseType((int)HttpStatusCode.NotFound)]
    public async Task<ActionResult> RemoveBucketEncryption(string bucketName)
    {
        var beArgs = new BucketExistsArgs()
            .WithBucket(bucketName.ToLower());
        var found = await minioClient.BucketExistsAsync(beArgs);
        if (!found) return NotFound();
        var args = new RemoveBucketEncryptionArgs()
            .WithBucket(bucketName.ToLower());
        await minioClient.RemoveBucketEncryptionAsync(args);
        return Ok();
    }

    [HttpPost("SetBucketTags")]
    [ProducesResponseType((int)HttpStatusCode.OK)]
    [ProducesResponseType((int)HttpStatusCode.NotFound)]
    public async Task<ActionResult> SetBucketTags([FromBody] SetBucketTagsRequest request)
    {
        var beArgs = new BucketExistsArgs()
            .WithBucket(request.BucketName?.ToLower());
        var found = await minioClient.BucketExistsAsync(beArgs);
        if (!found) return NotFound();
        var args = new SetBucketTagsArgs()
            .WithTagging(new Tagging(request.tags, request.IsObject))
            .WithBucket(request.BucketName?.ToLower());
        await minioClient.SetBucketTagsAsync(args);
        return Ok();
    }

    [HttpGet("GetBucketTags/{bucketName}")]
    [ProducesResponseType(typeof(Tagging), (int)HttpStatusCode.OK)]
    [ProducesResponseType((int)HttpStatusCode.NotFound)]
    public async Task<ActionResult> GetBucketTags(string bucketName)
    {
        var beArgs = new BucketExistsArgs()
            .WithBucket(bucketName.ToLower());
        var found = await minioClient.BucketExistsAsync(beArgs);
        if (!found) return NotFound();
        var args = new GetBucketTagsArgs()
            .WithBucket(bucketName.ToLower());
        return Ok(await minioClient.GetBucketTagsAsync(args));
    }

    [HttpDelete("RemoveBucketTags/{bucketName}")]
    [ProducesResponseType((int)HttpStatusCode.OK)]
    [ProducesResponseType((int)HttpStatusCode.NotFound)]
    public async Task<ActionResult> RemoveBucketTags(string bucketName)
    {
        var beArgs = new BucketExistsArgs()
            .WithBucket(bucketName.ToLower());
        var found = await minioClient.BucketExistsAsync(beArgs);
        if (!found) return NotFound();
        var args = new RemoveBucketTagsArgs()
            .WithBucket(bucketName.ToLower());
        await minioClient.RemoveBucketTagsAsync(args);
        return Ok();
    }

    [HttpPost("SetBucketLifecycle")]
    [ProducesResponseType((int)HttpStatusCode.OK)]
    [ProducesResponseType((int)HttpStatusCode.NotFound)]
    public async Task<ActionResult> SetBucketLifecycle([FromBody] SetBucketLifecycleRequest request)
    {
        var beArgs = new BucketExistsArgs()
            .WithBucket(request.BucketName?.ToLower());
        var found = await minioClient.BucketExistsAsync(beArgs);
        if (!found) return NotFound();
        var rules = new List<LifecycleRule>
            { new() { Expiration = new Expiration(request.ExpireDate, request.IsDeleteMaker) } };
        var args = new SetBucketLifecycleArgs()
            .WithLifecycleConfiguration(new LifecycleConfiguration(rules))
            .WithBucket(request.BucketName?.ToLower());
        await minioClient.SetBucketLifecycleAsync(args);
        return Ok();
    }

    [HttpGet("GetBucketLifecycle")]
    [ProducesResponseType(typeof(LifecycleConfiguration), (int)HttpStatusCode.OK)]
    [ProducesResponseType((int)HttpStatusCode.NotFound)]
    public async Task<ActionResult> GetBucketLifecycle(string bucketName)
    {
        var beArgs = new BucketExistsArgs()
            .WithBucket(bucketName.ToLower());
        var found = await minioClient.BucketExistsAsync(beArgs);
        if (!found) return NotFound();
        var args = new GetBucketLifecycleArgs()
            .WithBucket(bucketName.ToLower());
        return Ok(await minioClient.GetBucketLifecycleAsync(args));
    }

    [HttpDelete("RemoveBucketLifecycle/{bucketName}")]
    [ProducesResponseType((int)HttpStatusCode.OK)]
    [ProducesResponseType((int)HttpStatusCode.NotFound)]
    public async Task<ActionResult> RemoveBucketLifecycle(string bucketName)
    {
        var beArgs = new BucketExistsArgs()
            .WithBucket(bucketName.ToLower());
        var found = await minioClient.BucketExistsAsync(beArgs);
        if (!found) return NotFound();
        var args = new RemoveBucketLifecycleArgs()
            .WithBucket(bucketName.ToLower());
        await minioClient.RemoveBucketLifecycleAsync(args);
        return Ok();
    }

    [HttpGet("ListenBucketNotifications/{bucketName}")]
    [ProducesResponseType(typeof(BucketNotification), (int)HttpStatusCode.OK)]
    [ProducesResponseType((int)HttpStatusCode.NotFound)]
    public async Task<ActionResult> ListenBucketNotifications(string bucketName)
    {
        var beArgs = new BucketExistsArgs()
            .WithBucket(bucketName.ToLower());
        var found = await minioClient.BucketExistsAsync(beArgs);
        if (found)
            return Ok(await minioClient.GetBucketNotificationsAsync(
                new GetBucketNotificationsArgs()
                    .WithBucket(bucketName.ToLower())));
        return NotFound();
    }
}