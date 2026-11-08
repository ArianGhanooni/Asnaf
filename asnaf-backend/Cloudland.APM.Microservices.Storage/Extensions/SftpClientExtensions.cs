using Renci.SshNet;

namespace cloudland.APM.Microservices.Storage.Extensions;

public static class SftpClientExtensions
{
    private const int BufferSize = 81920;

    public static async Task DownloadFileAsync(this SftpClient sftpClient, string path, Stream output,
        CancellationToken cancellationToken)
    {
        await using Stream remoteStream = await sftpClient
            .OpenAsync(path, FileMode.Open, FileAccess.Read, cancellationToken).ConfigureAwait(false);
        await remoteStream.CopyToAsync(output, BufferSize, cancellationToken).ConfigureAwait(false);
    }

    public static async Task UploadFileAsync(this SftpClient sftpClient, Stream input, string path, FileMode createMode,
        CancellationToken cancellationToken)
    {
        await using Stream remoteStream = await sftpClient
            .OpenAsync(path, createMode, FileAccess.Write, cancellationToken).ConfigureAwait(false);
        await input.CopyToAsync(remoteStream, BufferSize, cancellationToken).ConfigureAwait(false);
    }
}