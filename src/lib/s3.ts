import {
  DeleteObjectCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
  type S3ClientConfig,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const DEFAULT_EXPIRES_IN = 3600;

const globalForS3 = globalThis as unknown as {
  s3: S3Client | undefined;
};

function assertEnv(names: readonly string[]): void {
  const missing = names.filter((name) => !process.env[name]);
  if (missing.length > 0) {
    throw new Error(
      `Missing required S3 environment variable(s): ${missing.join(", ")}`,
    );
  }
}

function getEnv(name: string): string {
  assertEnv([name]);
  return process.env[name] as string;
}

function pathStyleEnabled(): boolean {
  const override = process.env.S3_FORCE_PATH_STYLE;
  if (override !== undefined && override !== "") {
    return override === "true";
  }
  return Boolean(process.env.S3_ENDPOINT);
}

function createS3Client(): S3Client {
  assertEnv(["S3_REGION", "S3_ACCESS_KEY_ID", "S3_SECRET_ACCESS_KEY"]);

  const endpoint = process.env.S3_ENDPOINT;
  const config: S3ClientConfig = {
    region: getEnv("S3_REGION"),
    credentials: {
      accessKeyId: getEnv("S3_ACCESS_KEY_ID"),
      secretAccessKey: getEnv("S3_SECRET_ACCESS_KEY"),
    },
    forcePathStyle: pathStyleEnabled(),
  };

  if (endpoint) {
    config.endpoint = endpoint;
  }

  return new S3Client(config);
}

function getS3Client(): S3Client {
  if (!globalForS3.s3) {
    globalForS3.s3 = createS3Client();
  }
  return globalForS3.s3;
}

function bucket(): string {
  return getEnv("S3_BUCKET");
}

function sanitizeFilename(filename: string): string {
  const lower = filename.toLowerCase();
  const dot = lower.lastIndexOf(".");
  const hasExtension = dot > 0 && dot < lower.length - 1;
  const rawBase = hasExtension ? lower.slice(0, dot) : lower;
  const rawExtension = hasExtension ? lower.slice(dot + 1) : "";

  const base = rawBase
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "")
    .slice(0, 160);
  const extension = rawExtension.replace(/[^a-z0-9]+/g, "").slice(0, 16);

  const safeBase = base || "file";
  return extension ? `${safeBase}.${extension}` : safeBase;
}

export const s3: S3Client = new Proxy({} as S3Client, {
  get(_target, property) {
    const client = getS3Client();
    const value = Reflect.get(client, property, client);
    return typeof value === "function" ? value.bind(client) : value;
  },
});

export async function getUploadUrl(
  key: string,
  options?: { contentType?: string; expiresIn?: number },
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: bucket(),
    Key: key,
    ...(options?.contentType ? { ContentType: options.contentType } : {}),
  });

  return getSignedUrl(getS3Client(), command, {
    expiresIn: options?.expiresIn ?? DEFAULT_EXPIRES_IN,
  });
}

export async function getReadUrl(
  key: string,
  options?: { expiresIn?: number },
): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: bucket(),
    Key: key,
  });

  return getSignedUrl(getS3Client(), command, {
    expiresIn: options?.expiresIn ?? DEFAULT_EXPIRES_IN,
  });
}

export function getPublicUrl(key: string): string {
  const base = getEnv("S3_PUBLIC_URL").replace(/\/+$/, "");
  return `${base}/${key}`;
}

export async function putObject(
  key: string,
  body: Uint8Array | Buffer,
  options?: { contentType?: string },
): Promise<void> {
  await getS3Client().send(
    new PutObjectCommand({
      Bucket: bucket(),
      Key: key,
      Body: body,
      ...(options?.contentType ? { ContentType: options.contentType } : {}),
    }),
  );
}

export async function deleteObject(key: string): Promise<void> {
  await getS3Client().send(
    new DeleteObjectCommand({
      Bucket: bucket(),
      Key: key,
    }),
  );
}

const DELETE_OBJECTS_MAX_KEYS = 1000;

export async function deleteObjects(keys: string[]): Promise<void> {
  const nonEmptyKeys = keys.filter((key) => key.length > 0);
  if (nonEmptyKeys.length === 0) {
    return;
  }

  const client = getS3Client();
  const targetBucket = bucket();

  for (let i = 0; i < nonEmptyKeys.length; i += DELETE_OBJECTS_MAX_KEYS) {
    const batch = nonEmptyKeys.slice(i, i + DELETE_OBJECTS_MAX_KEYS);

    const result = await client.send(
      new DeleteObjectsCommand({
        Bucket: targetBucket,
        Delete: {
          Objects: batch.map((key) => ({ Key: key })),
        },
      }),
    );

    const errors = result.Errors ?? [];
    if (errors.length > 0) {
      const details = errors
        .map((error, index) => {
          const label = error.Key ?? batch[index] ?? "(unknown key)";
          const code = error.Code ?? "UnknownError";
          const message = error.Message ?? "No message provided";
          return `${label} [${code}]: ${message}`;
        })
        .join("; ");
      throw new Error(
        `S3 DeleteObjects failed for ${errors.length} of ${batch.length} object(s): ${details}`,
      );
    }
  }
}

export function buildObjectKey(questionId: number, filename: string): string {
  const unique = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
  return `questions/${questionId}/${unique}-${sanitizeFilename(filename)}`;
}
