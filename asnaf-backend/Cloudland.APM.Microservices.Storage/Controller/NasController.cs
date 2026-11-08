using System.Net;
using Asp.Versioning;
using FFMediaToolkit.Decoding;
using MassTransit;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Renci.SshNet;
//using cloudland.APM.DTO.EventBusObjects;
using cloudland.APM.Microservices.Storage.CustomModels;
using cloudland.APM.Microservices.Storage.Extensions;
using SixLabors.ImageSharp.Formats.Png;

namespace cloudland.APM.Microservices.Storage.Controller;

[ApiVersion("1.0")]
[Route("api/v1/nas")]
[ApiController]
[ApiExplorerSettings(GroupName = "v1")]
[Authorize]
public class NasController(
    IConfiguration configuration,
    IPublishEndpoint _publishEndpoint) : ControllerBase
{
    [HttpPost("FileUploader")]
    [ProducesResponseType((int)HttpStatusCode.OK)]
    [ProducesResponseType((int)HttpStatusCode.BadRequest)]
    public async Task<ActionResult> FileUploader([FromForm] FileUploaderRequest request)
    {
        if (request.FolderName == null) return BadRequest();
        var defaultPath = request.IgnoreDefaultPath ? string.Empty : configuration["SFTConfiguration:DEFAULT_PATH"];
        var path = $"{defaultPath}{request.FolderName!.ToLower()}";
        try
        {
            var username = string.Empty;
            using SftpClient client = new(
                configuration["SFTConfiguration:URL"] ?? username,
                Convert.ToInt32(configuration["SFTConfiguration:PORT"]),
                configuration["SFTConfiguration:USERNAME"] ?? username,
                configuration["SFTConfiguration:PASSWORD"] ?? string.Empty);
            await client.ConnectAsync(CancellationToken.None);
            if (!await client.ExistsAsync(path)) await client.CreateDirectoryAsync(path);
            await client.UploadFileAsync(request.File!.OpenReadStream(),
                $"{path}/{(request.FileName != null ? request.FileName : Guid.NewGuid())}{new FileInfo(request.File.FileName).Extension}",
                FileMode.Create,
                CancellationToken.None);
            client.Disconnect();

            return Ok();
        }
        catch (Exception)
        {
            return BadRequest();
        }
    }

    /*[HttpPost("CourseTermContentUpload/{fileId}/{folderName}")]
    [ProducesResponseType((int)HttpStatusCode.OK)]
    [ProducesResponseType((int)HttpStatusCode.BadRequest)]
    public async Task<ActionResult> CourseTermContentUpload(string fileId, string folderName)
    {
        if (Request.Form.Files.Count == 0) return BadRequest();

        var defaultPath = configuration["SFTConfiguration:DEFAULT_PATH"];
        var path = $"{defaultPath}{folderName.ToLower()}/1500";
        var file = Request.Form.Files[0];
        try
        {
            using SftpClient client = new(
                configuration["SFTConfiguration:URL"] ?? string.Empty,
                Convert.ToInt32(configuration["SFTConfiguration:PORT"]),
                configuration["SFTConfiguration:USERNAME"] ?? string.Empty,
                configuration["SFTConfiguration:PASSWORD"] ?? string.Empty);
            await client.ConnectAsync(CancellationToken.None);
            if (!await client.ExistsAsync(path)) await client.CreateDirectoryAsync(path);
            await client.UploadFileAsync(file.OpenReadStream(),
                $"{path}/{fileId}_1500{new FileInfo(file.FileName).Extension}",
                FileMode.Create,
                CancellationToken.None);

            var mediaFileInfo = MediaFile.Open(file.OpenReadStream());
            var image = mediaFileInfo.Video.GetFrame(TimeSpan.FromSeconds(15)).ToBitmap();
            var memFrame = new MemoryStream();
            await image.SaveAsync(memFrame, new PngEncoder());
            memFrame.Seek(0, SeekOrigin.Begin);

            CourseTermContentAdded data = new CourseTermContentAdded
            {
                CourseTermId = new Guid(fileId),
                FileSize = mediaFileInfo.Info.FileInfo.Length,
                BitRate = mediaFileInfo.Info.Bitrate,
                Duration = mediaFileInfo.Video.Info.Duration
            };

            var runConvertJob = new CourseTermContentConvertJob
            {
                CourseTermId = new Guid(fileId),
                FilePath = $"{path}/{fileId}_1500{new FileInfo(file.FileName).Extension}",
                Res1500 = true
            };

            await client.UploadFileAsync(memFrame,
                $"/mnt/vod_images/{fileId}.png",
                FileMode.Create,
                CancellationToken.None);
            client.Disconnect();

            await _publishEndpoint.Publish(data);
            await _publishEndpoint.Publish(runConvertJob);
            return Ok(data);
        }
        catch (Exception)
        {
            return BadRequest();
        }
    }*/

    [HttpPost("CourseTermCoverUpload/{fileId}")]
    [ProducesResponseType((int)HttpStatusCode.OK)]
    [ProducesResponseType((int)HttpStatusCode.BadRequest)]
    public async Task<ActionResult> CourseTermCoverUpload(string fileId)
    {
        var defaultPath = configuration["SFTConfiguration:DEFAULT_COVER_PATH"];
        var path = $"{defaultPath}";
        var file = Request.Form.Files[0];
        try
        {
            using SftpClient client = new(
                configuration["SFTConfiguration:URL"] ?? string.Empty,
                Convert.ToInt32(configuration["SFTConfiguration:PORT"]),
                configuration["SFTConfiguration:USERNAME"] ?? string.Empty,
                configuration["SFTConfiguration:PASSWORD"] ?? string.Empty);
            await client.ConnectAsync(CancellationToken.None);
            await client.UploadFileAsync(file.OpenReadStream(),
                $"{path}/{fileId}{new FileInfo(file.FileName).Extension}",
                FileMode.Create,
                CancellationToken.None);

            client.Disconnect();
            return Ok();
        }
        catch (Exception)
        {
            return BadRequest();
        }
    }
}