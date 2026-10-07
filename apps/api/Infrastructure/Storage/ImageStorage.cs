using Amazon.Runtime;
using Amazon.S3;
using Amazon.S3.Model;

namespace MawridTravel.Api.Infrastructure.Storage;

internal interface IImageStorage
{
    bool IsConfigured { get; }

    string GetPublicUrl(string objectKey);

    Task UploadAsync(
        string objectKey,
        Stream content,
        string contentType,
        CancellationToken cancellationToken);

    Task DeleteAsync(string objectKey, CancellationToken cancellationToken);
}

internal sealed class R2ImageStorage : IImageStorage, IDisposable
{
    private readonly R2StorageOptions _options;
    private readonly Lazy<AmazonS3Client> _client;

    public R2ImageStorage(IConfiguration configuration)
    {
        _options = configuration
            .GetSection(R2StorageOptions.SectionName)
            .Get<R2StorageOptions>() ?? new R2StorageOptions();
        _client = new Lazy<AmazonS3Client>(CreateClient);
    }

    public bool IsConfigured =>
        !string.IsNullOrWhiteSpace(_options.AccountId) &&
        !string.IsNullOrWhiteSpace(_options.AccessKeyId) &&
        !string.IsNullOrWhiteSpace(_options.SecretAccessKey) &&
        !string.IsNullOrWhiteSpace(_options.BucketName) &&
        Uri.TryCreate(_options.PublicBaseUrl, UriKind.Absolute, out _);

    public string GetPublicUrl(string objectKey)
    {
        EnsureConfigured();
        return $"{_options.PublicBaseUrl!.TrimEnd('/')}/{objectKey}";
    }

    public async Task UploadAsync(
        string objectKey,
        Stream content,
        string contentType,
        CancellationToken cancellationToken)
    {
        EnsureConfigured();
        var request = new PutObjectRequest
        {
            BucketName = _options.BucketName,
            Key = objectKey,
            InputStream = content,
            ContentType = contentType,
            AutoCloseStream = false,
            DisablePayloadSigning = true,
            DisableDefaultChecksumValidation = true
        };

        await _client.Value.PutObjectAsync(request, cancellationToken);
    }

    public async Task DeleteAsync(
        string objectKey,
        CancellationToken cancellationToken)
    {
        EnsureConfigured();
        await _client.Value.DeleteObjectAsync(
            _options.BucketName,
            objectKey,
            cancellationToken);
    }

    public void Dispose()
    {
        if (_client.IsValueCreated)
        {
            _client.Value.Dispose();
        }
    }

    private AmazonS3Client CreateClient()
    {
        EnsureConfigured();
        var credentials = new BasicAWSCredentials(
            _options.AccessKeyId,
            _options.SecretAccessKey);
        var config = new AmazonS3Config
        {
            ServiceURL = $"https://{_options.AccountId}.r2.cloudflarestorage.com",
            ForcePathStyle = true,
            AuthenticationRegion = "auto"
        };

        return new AmazonS3Client(credentials, config);
    }

    private void EnsureConfigured()
    {
        if (!IsConfigured)
        {
            throw new InvalidOperationException(
                "Cloudflare R2 image storage is not configured.");
        }
    }
}

internal sealed class R2StorageOptions
{
    public const string SectionName = "R2";

    public string? AccountId { get; init; }

    public string? AccessKeyId { get; init; }

    public string? SecretAccessKey { get; init; }

    public string? BucketName { get; init; }

    public string? PublicBaseUrl { get; init; }
}
