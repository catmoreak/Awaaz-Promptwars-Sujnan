import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { env, features } from './config';

const client = features.objectStorage
  ? new S3Client({
      region: env.AWS_REGION,
      endpoint: env.AWS_ENDPOINT_URL_S3,
      // Neon does not support the SDK's default bucket-in-hostname addressing.
      forcePathStyle: true,
      credentials: { accessKeyId: env.AWS_ACCESS_KEY_ID, secretAccessKey: env.AWS_SECRET_ACCESS_KEY },
      // The SDK's newer default checksums are not part of the S3 API that compatible services promise.
      requestChecksumCalculation: 'WHEN_REQUIRED',
      responseChecksumValidation: 'WHEN_REQUIRED',
    })
  : null;

function storage(): S3Client {
  if (!client) throw new Error('Object storage is not configured');
  return client;
}

export async function putObject(key: string, body: Buffer, contentType: string): Promise<void> {
  await storage().send(new PutObjectCommand({ Bucket: env.S3_BUCKET, Key: key, Body: body, ContentType: contentType }));
}

export async function getObject(key: string): Promise<Buffer> {
  const { Body } = await storage().send(new GetObjectCommand({ Bucket: env.S3_BUCKET, Key: key }));
  if (!Body) throw new Error(`Stored object ${key} has no content`);
  return Buffer.from(await Body.transformToByteArray());
}

export async function deleteObject(key: string): Promise<void> {
  await storage().send(new DeleteObjectCommand({ Bucket: env.S3_BUCKET, Key: key }));
}
