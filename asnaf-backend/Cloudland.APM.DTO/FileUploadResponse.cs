namespace Cloudland.APM.DTO;

public class FileUploadResponse
{
        public bool Success { get; set; }
        public string Message { get; set; }
    
        // File information
        public string ObjectName { get; set; } // e.g., "uploads/abc123.pdf"
        public string BucketName { get; set; }
        public string OriginalFileName { get; set; }
        public long FileSize { get; set; }
        public string ContentType { get; set; }
        public string ETag { get; set; }
        public DateTime? LastModified { get; set; }
    
        // For database storage (store these)
        public string StoragePath { get; set; } // "bucketName/objectName"
        public string FileIdentifier { get; set; } // Just objectName
    
        // URLs for frontend access
        public string DirectUrl { get; set; } // Direct MinIO URL
        public string PresignedUrl { get; set; } // Presigned URL (recommended)
        public string DownloadUrl { get; set; } // Your API download URL
        public string ThumbnailUrl { get; set; } // For images
        public string PreviewUrl { get; set; } // For documents
    
        // For immediate frontend display
        public string FileUrl { get; set; } // Use this in frontend (presigned URL)
    
        // Error handling
        public string ErrorMessage { get; set; }
        public string Warning { get; set; }
    
}