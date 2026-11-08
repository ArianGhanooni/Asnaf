using System.Net;
using Asp.Versioning;
using Cloudland.APM.DTO;
using cloudland.APM.DTO.MinioObjects;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Minio;
using Minio.DataModel;
using Minio.DataModel.Args;
using Nest;
using cloudland.APM.Microservices.Storage.CustomModels;
using Minio.Exceptions;

namespace cloudland.APM.Microservices.Storage.Controller;

[ApiVersion("1.0")]
[Route("api/v1/buckets-objects")]
[ApiController]
[ApiExplorerSettings(GroupName = "v1")]
[Authorize]
public class BucketObjectsController(IMinioClient minioClient, IElasticClient _elasticClient) : ControllerBase
{
    public IElasticClient ElasticClient { get; } = _elasticClient;

    [HttpPost("ListObjects")]
    [ProducesResponseType(typeof(IList<Item>), (int)HttpStatusCode.OK)]
    [ProducesResponseType((int)HttpStatusCode.NotFound)]
    public async Task<ActionResult> ListObjects([FromBody] ListObjectsRequest request)
    {
        var beArgs = new BucketExistsArgs()
            .WithBucket(request.BucketName?.ToLower());
        var found = await minioClient.BucketExistsAsync(beArgs);
        if (!found) return NotFound();
        var args = new ListObjectsArgs()
            .WithRecursive(request.Recursive)
            .WithPrefix(request.Prefix)
            .WithVersions(request.Versioning)
            .WithListObjectsV1(request.ListObjectV1)
            .WithBucket(request.BucketName?.ToLower());
        return Ok(minioClient.ListObjectsEnumAsync(args));
    }
    
    
    [HttpGet("download-by-path/{*storagePath}")]
[ProducesResponseType(typeof(FileContentResult), (int)HttpStatusCode.OK)]
[ProducesResponseType((int)HttpStatusCode.NotFound)]
[ProducesResponseType((int)HttpStatusCode.BadRequest)]
public async Task<IActionResult> DownloadByPath(string storagePath)
{
    try
    {
        // Validate input
        if (string.IsNullOrWhiteSpace(storagePath))
            return BadRequest("Storage path is required");
        
        // Parse bucket and object from storagePath
        // Format: "bucketName/objectName" or "bucketName/folder/objectName.ext"
        var parts = storagePath.Split('/', 2);
        
        if (parts.Length < 2)
            return BadRequest("Invalid storage path format. Expected: bucketName/objectPath");
        
        var bucketName = parts[0];
        var objectName = parts[1];
        
        // Get object metadata
        var statArgs = new StatObjectArgs()
            .WithBucket(bucketName)
            .WithObject(objectName);
            
        var objectStat = await minioClient.StatObjectAsync(statArgs);
        
        // Download file
        using var memoryStream = new MemoryStream();
        
        var getObjectArgs = new GetObjectArgs()
            .WithBucket(bucketName)
            .WithObject(objectName)
            .WithCallbackStream(stream => stream.CopyTo(memoryStream));
            
        await minioClient.GetObjectAsync(getObjectArgs);
        memoryStream.Position = 0;
        
        // Get original filename from metadata or use object name
        var originalFileName = objectStat.MetaData
            .TryGetValue("original-filename", out var filename) 
            ? filename 
            : Path.GetFileName(objectName);
        
        return File(memoryStream.ToArray(), objectStat.ContentType, originalFileName);
    }
    catch (Minio.Exceptions.ObjectNotFoundException)
    {
        return NotFound($"File not found: {storagePath}");
    }
    catch (Minio.Exceptions.BucketNotFoundException)
    {
        return NotFound($"Bucket not found in path: {storagePath}");
    }
    catch (Exception ex)
    {
        // Log the error
        return StatusCode(500, $"Error downloading file: {ex.Message}");
    }
}
    
    
    
    [HttpPost("FileUploader")]
[ProducesResponseType(typeof(FileUploadResponse), (int)HttpStatusCode.OK)]
[ProducesResponseType((int)HttpStatusCode.BadRequest)]
public async Task<ActionResult<FileUploadResponse>> FileUploader([FromForm] FileUploaderRequest request)
{
    try
    {
        // Validate input
        if (request == null || request.File == null || request.File.Length == 0)
            return BadRequest(new FileUploadResponse
            {
                Success = false,
                ErrorMessage = "No file provided or file is empty"
            });
        
        if (string.IsNullOrWhiteSpace(request.BucketName))
            return BadRequest(new FileUploadResponse
            {
                Success = false,
                ErrorMessage = "Bucket name is required"
            });

        var bucketName = request.BucketName.ToLower();
        
        // Ensure bucket exists
        await EnsureBucketExistsAsync(bucketName);

        // Generate object name
        var objectName = GenerateObjectName(request.FolderName, request.File.FileName);
        
        // Upload file
        using var stream = request.File.OpenReadStream();
        
        var putObjectArgs = new PutObjectArgs()
            .WithBucket(bucketName)
            .WithObject(objectName)
            .WithStreamData(stream)
            .WithObjectSize(request.File.Length)
            .WithContentType(request.File.ContentType ?? "application/octet-stream");

        var result = await minioClient.PutObjectAsync(putObjectArgs);
        
        // Generate Presigned URL
        var presignedUrl = await GeneratePresignedUrlAsync(bucketName, objectName, 24 * 60 * 60); // 24 hours
        
        // Generate Direct URL
        var directUrl = $"http://62.60.211.182:9000/{bucketName}/{objectName}";
        
        // Generate API URL for download
        var apiDownloadUrl = $"/api/v1/buckets-objects/download/{bucketName}/{objectName}";
        
        // Try to get object stats (with error handling)
        try
        {
            var statObjectArgs = new StatObjectArgs()
                .WithBucket(bucketName)
                .WithObject(objectName);

            var objectStat = await minioClient.StatObjectAsync(statObjectArgs);
            
            return Ok(new FileUploadResponse
            {
                Success = true,
                Message = "File uploaded successfully",
                ObjectName = objectName,
                BucketName = bucketName,
                OriginalFileName = request.File.FileName,
                FileSize = request.File.Length,
                ContentType = request.File.ContentType,
                ETag = result.Etag,
                LastModified = objectStat.LastModified,
                
                // URLs for frontend access
                DirectUrl = directUrl,
                PresignedUrl = presignedUrl,
                DownloadUrl = apiDownloadUrl,
                
                // For database storage
                StoragePath = $"{bucketName}/{objectName}",
                FileIdentifier = objectName,
                
                // For immediate frontend display
                FileUrl = presignedUrl // Recommended: Presigned URL
            });
        }
        catch (PartialContentException)
        {
            // If stat fails but upload succeeded, return success with partial info
            return Ok(new FileUploadResponse
            {
                Success = true,
                Message = "File uploaded successfully (metadata retrieval failed)",
                ObjectName = objectName,
                BucketName = bucketName,
                OriginalFileName = request.File.FileName,
                FileSize = request.File.Length,
                ContentType = request.File.ContentType,
                ETag = result.Etag,
                
                // URLs
                DirectUrl = directUrl,
                PresignedUrl = presignedUrl,
                DownloadUrl = apiDownloadUrl,
                
                // For database storage
                StoragePath = $"{bucketName}/{objectName}",
                FileIdentifier = objectName,
                
                // For immediate frontend display
                FileUrl = presignedUrl,
                
                Warning = "Could not retrieve full metadata"
            });
        }
    }
    catch (Exception ex)
    {
        // Log the error
        return StatusCode(500, new FileUploadResponse
        {
            Success = false,
            Message = "Upload failed",
            ErrorMessage = ex.Message
        });
    }
}

private async Task<string> GeneratePresignedUrlAsync(string bucketName, string objectName, int expirySeconds)
{
    try
    {
        var args = new PresignedGetObjectArgs()
            .WithBucket(bucketName)
            .WithObject(objectName)
            .WithExpiry(expirySeconds);
        
        return await minioClient.PresignedGetObjectAsync(args);
    }
    catch (Exception ex)
    {
        // Log error but don't fail upload
        Console.WriteLine($"Failed to generate presigned URL: {ex.Message}");
        return null;
    }
}

// Add this method for downloading files
[HttpGet("download/{bucketName}/{objectName}")]
[ProducesResponseType(typeof(FileContentResult), (int)HttpStatusCode.OK)]
[ProducesResponseType((int)HttpStatusCode.NotFound)]
public async Task<IActionResult> DownloadFile(string bucketName, string objectName)
{
    try
    {
        // Get object metadata first
        var statArgs = new StatObjectArgs()
            .WithBucket(bucketName.ToLower())
            .WithObject(objectName);
            
        var objectStat = await minioClient.StatObjectAsync(statArgs);
        
        // Download file
        using var memoryStream = new MemoryStream();
        
        var getObjectArgs = new GetObjectArgs()
            .WithBucket(bucketName.ToLower())
            .WithObject(objectName)
            .WithCallbackStream(stream => stream.CopyTo(memoryStream));
            
        await minioClient.GetObjectAsync(getObjectArgs);
        memoryStream.Position = 0;
        
        return File(memoryStream.ToArray(), objectStat.ContentType, objectName);
    }
    catch (Exception ex)
    {
        return NotFound($"File not found: {ex.Message}");
    }
}

// Add this method to get presigned URL separately
[HttpGet("presigned-url/{bucketName}/{objectName}")]
[ProducesResponseType(typeof(string), (int)HttpStatusCode.OK)]
[ProducesResponseType((int)HttpStatusCode.BadRequest)]
public async Task<ActionResult<string>> GetPresignedUrl(
    string bucketName, 
    string objectName, 
    [FromQuery] int expirySeconds = 3600)
{
    try
    {
        var url = await GeneratePresignedUrlAsync(bucketName.ToLower(), objectName, expirySeconds);
        
        if (string.IsNullOrEmpty(url))
            return BadRequest("Failed to generate URL");
            
        return Ok(new { url });
    }
    catch (Exception ex)
    {
        return BadRequest($"Failed to generate URL: {ex.Message}");
    }
}


    /*
    [HttpPost("FileUploader")]
[ProducesResponseType(typeof(ObjectStat), (int)HttpStatusCode.OK)]
[ProducesResponseType((int)HttpStatusCode.BadRequest)]
public async Task<ActionResult> FileUploader([FromForm] FileUploaderRequest request)
{
    try
    {
        // Validate input
        if (request == null || request.File == null || request.File.Length == 0)
            return BadRequest("No file provided or file is empty");
        
        if (string.IsNullOrWhiteSpace(request.BucketName))
            return BadRequest("Bucket name is required");

        var bucketName = request.BucketName.ToLower();
        
        // Ensure bucket exists
        await EnsureBucketExistsAsync(bucketName);

        // Generate object name
        var objectName = GenerateObjectName(request.FolderName, request.File.FileName);
        
        // Upload file
        using var stream = request.File.OpenReadStream();
        
        var putObjectArgs = new PutObjectArgs()
            .WithBucket(bucketName)
            .WithObject(objectName)
            .WithStreamData(stream)
            .WithObjectSize(request.File.Length)
            .WithContentType(request.File.ContentType ?? "application/octet-stream");

        var result = await minioClient.PutObjectAsync(putObjectArgs);
        
        // Try to get object stats (with error handling)
        try
        {
            var statObjectArgs = new StatObjectArgs()
                .WithBucket(bucketName)
                .WithObject(objectName);

            var objectStat = await minioClient.StatObjectAsync(statObjectArgs);
            
            return Ok(new
            {
                Success = true,
                Message = "File uploaded successfully",
                ObjectName = objectName,
                BucketName = bucketName,
                FileSize = request.File.Length,
                ContentType = request.File.ContentType,
                ETag = result.Etag,
                LastModified = objectStat.LastModified
            });
        }
        catch (PartialContentException)
        {
            // If stat fails but upload succeeded, return success with partial info
            return Ok(new
            {
                Success = true,
                Message = "File uploaded successfully (metadata retrieval failed)",
                ObjectName = objectName,
                BucketName = bucketName,
                FileSize = request.File.Length,
                ContentType = request.File.ContentType,
                ETag = result.Etag,
                Warning = "Could not retrieve full metadata"
            });
        }
    }
    catch (Exception ex)
    {
        // Log the error
        return StatusCode(500, new
        {
            Success = false,
            Message = "Upload failed",
            Error = ex.Message,
            StackTrace = ex.StackTrace
        });
    }
}*/

private async Task EnsureBucketExistsAsync(string bucketName)
{
    var bucketExistsArgs = new BucketExistsArgs().WithBucket(bucketName);
    var exists = await minioClient.BucketExistsAsync(bucketExistsArgs);
    
    if (!exists)
    {
        var makeBucketArgs = new MakeBucketArgs().WithBucket(bucketName);
        await minioClient.MakeBucketAsync(makeBucketArgs);
    }
}

private string GenerateObjectName(string folderName, string fileName)
{
    var extension = Path.GetExtension(fileName);
    var baseFileName = Path.GetFileNameWithoutExtension(fileName);
    var cleanFolderName = string.IsNullOrWhiteSpace(folderName) 
        ? "uploads" 
        : folderName.Trim('/');
    
    // Create a clean object name
    var objectName = $"{cleanFolderName}/{Guid.NewGuid():N}{extension}";
    
    return objectName.Replace("//", "/");
}
    
    
    /*[HttpPost("FileUploader")]
    [ProducesResponseType(typeof(ObjectStat), (int)HttpStatusCode.OK)]
    [ProducesResponseType((int)HttpStatusCode.BadRequest)]
    public async Task<ActionResult> FileUploader([FromForm] FileUploaderRequest request)
    {
        var args = new PutObjectArgs()
            .WithBucket(request.BucketName?.ToLower())
            .WithStreamData(request.File?.OpenReadStream())
            .WithObjectSize(request.File!.OpenReadStream().Length)
            .WithObject($"{request.FolderName}/{Guid.NewGuid()}{new FileInfo(request.File.FileName).Extension}")
            .WithContentType("application/octet-stream");
        var result = await minioClient.PutObjectAsync(args);

        var resultState = await minioClient.StatObjectAsync(new StatObjectArgs()
            .WithObject(result.ObjectName)
            .WithMatchETag(result.Etag)
            .WithLength(result.Size)
            .WithBucket(request.BucketName!.ToLower()));

        if (resultState != null) return Ok(resultState);
        return BadRequest();
    }*/
}