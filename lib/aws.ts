import { S3Client, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { getSignedUrl as awsGetSignedUrl } from '@aws-sdk/s3-request-presigner';

if (!process.env.NEXT_PUBLIC_AWS_ACCESS_KEY || !process.env.NEXT_PUBLIC_AWS_SECRET_KEY || !process.env.NEXT_PUBLIC_AWS_BUCKET_NAME) {
  throw new Error('Missing required AWS environment variables');
}

// Initialize S3 client
export const s3Client = new S3Client({
  region: 'us-east-1', // Change this to your desired region
  credentials: {
    accessKeyId: process.env.NEXT_PUBLIC_AWS_ACCESS_KEY,
    secretAccessKey: process.env.NEXT_PUBLIC_AWS_SECRET_KEY,
  },
});

// Function to upload file to S3
export async function uploadToS3(file: File, key: string) {
  try {
    const upload = new Upload({
      client: s3Client,
      params: {
        Bucket: process.env.NEXT_PUBLIC_AWS_BUCKET_NAME!,
        Key: key,
        Body: file,
        ContentType: file.type,
      },
    });

    console.log('Starting upload to S3...');
    const result = await upload.done();
    console.log('Upload complete:', result);
    return { data: result, error: null };
  } catch (error) {
    console.error('Error uploading to S3:', error);
    return { data: null, error };
  }
}

// Function to get a signed URL for downloading
export async function getSignedUrl(key: string, expiresIn = 3600): Promise<{ url: string | null; error: Error | null }> {
  try {
    const command = new GetObjectCommand({
      Bucket: process.env.NEXT_PUBLIC_AWS_BUCKET_NAME!,
      Key: key,
    });

    const signedUrl = await awsGetSignedUrl(s3Client, command, { expiresIn });
    return { url: signedUrl, error: null };
  } catch (error) {
    console.error('Error generating signed URL:', error);
    return { url: null, error: error instanceof Error ? error : new Error('Unknown error') };
  }
}

// Function to delete file from S3
export async function deleteFromS3(key: string) {
  try {
    const command = new DeleteObjectCommand({
      Bucket: process.env.NEXT_PUBLIC_AWS_BUCKET_NAME!,
      Key: key,
    });

    const result = await s3Client.send(command);
    return { data: result, error: null };
  } catch (error) {
    console.error('Error deleting from S3:', error);
    return { data: null, error };
  }
} 