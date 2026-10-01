// Creates the upload bucket and applies a public read policy.
// Replaces the old minio/mc one-shot container, whose image no longer exists.

import * as Minio from 'minio';

const endpoint = process.env.MINIO_ENDPOINT ?? 'minio';
const port = parseInt(process.env.MINIO_PORT ?? '9000', 10);
const bucket = process.env.MINIO_BUCKET ?? 'user-uploads';
const accessKey = process.env.MINIO_ACCESS_KEY ?? process.env.MINIO_ROOT_USER;
const secretKey = process.env.MINIO_SECRET_KEY ?? process.env.MINIO_ROOT_PASSWORD;

if (!accessKey || !secretKey) {
  console.error('Storage credentials are not set.');
  process.exit(1);
}

const client = new Minio.Client({
  endPoint: endpoint,
  port,
  useSSL: false,
  accessKey,
  secretKey,
});

async function main() {
  console.log(`Waiting for ${endpoint}:${port} ...`);

  for (let attempt = 1; attempt <= 30; attempt++) {
    try {
      await client.bucketExists(bucket);
      break;
    } catch (err) {
      if (attempt === 30) throw err;
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }

  if (!(await client.bucketExists(bucket))) {
    await client.makeBucket(bucket);
    console.log(`Created bucket ${bucket}`);
  } else {
    console.log(`Bucket ${bucket} already exists`);
  }

  await client.setBucketPolicy(
    bucket,
    JSON.stringify({
      Version: '2012-10-17',
      Statement: [
        {
          Effect: 'Allow',
          Principal: '*',
          Action: ['s3:GetObject'],
          Resource: [`arn:aws:s3:::${bucket}/*`],
        },
      ],
    })
  );
  console.log('Applied public read policy');
  console.log('Storage setup complete.');
}

main().catch((err) => {
  console.error('Storage setup failed:', err);
  process.exit(1);
});