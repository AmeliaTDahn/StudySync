import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl as getAwsSignedUrl } from '@aws-sdk/s3-request-presigner';

// Initialize S3 client with credentials
const s3Client = new S3Client({
  region: 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY!,
    secretAccessKey: process.env.AWS_SECRET_KEY!
  }
});

const BUCKET_NAME = process.env.AWS_BUCKET_NAME!;

// Get signed URL for various operations
export async function getSignedUrl(key: string, contentType: string, operation: 'putObject' | 'getObject') {
  try {
    let command;
    if (operation === 'putObject') {
      command = new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
        ContentType: contentType
      });
    } else {
      command = new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key
      });
    }

    const signedUrl = await getAwsSignedUrl(s3Client, command, { expiresIn: 3600 });
    return signedUrl;
  } catch (error) {
    console.error('Error generating signed URL:', error);
    throw error;
  }
}

// Delete object from S3
export async function deleteObject(key: string) {
  try {
    const command = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key
    });

    await s3Client.send(command);
  } catch (error) {
    console.error('Error deleting object:', error);
    throw error;
  }
} 