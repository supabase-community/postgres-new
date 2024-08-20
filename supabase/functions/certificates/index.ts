import { X509Certificate } from "node:crypto";
/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/certificates' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json'

*/
import { NoSuchKey, S3 } from "npm:@aws-sdk/client-s3";
import * as ACME from "https://deno.land/x/acme@v0.4.1/acme.ts";
import { env } from "./env.ts";

const s3Client = new S3({
  forcePathStyle: true,
});

Deno.serve(async () => {
  // Check if we need to renew the certificate
  const certificate = await getObject("tls/cert.pem");
  if (certificate) {
    const { validTo } = new X509Certificate(certificate);
    // if the validity is more than 30 days, no need to renew
    const day = 24 * 60 * 60 * 1000;
    if (new Date(validTo) > new Date(Date.now() + 30 * day)) {
      return new Response(null, { status: 304 });
    }
  }

  // Load account keys if they exist
  const [publicKey, privateKey] = await Promise.all([
    getObject("tls/account/publicKey.pem"),
    getObject("tls/account/privateKey.pem"),
  ]);
  let accountKeys: { privateKeyPEM: string; publicKeyPEM: string } | undefined;
  if (publicKey && privateKey) {
    accountKeys = {
      privateKeyPEM: privateKey,
      publicKeyPEM: publicKey,
    };
  }

  const { domainCertificates, pemAccountKeys } = await ACME
    .getCertificatesWithCloudflare(
      env.CLOUDFLARE_API_TOKEN,
      [
        {
          domainName: env.ACME_DOMAIN,
          subdomains: ["*"],
        },
      ],
      {
        acmeDirectoryUrl:
          "https://acme-staging-v02.api.letsencrypt.org/directory",
        yourEmail: env.ACME_EMAIL,
        pemAccountKeys: accountKeys,
      },
    );

  const persistOperations = [
    s3Client.putObject({
      Bucket: env.AWS_S3_BUCKET,
      Key: "tls/key.pem",
      Body: domainCertificates[0].pemPrivateKey,
    }),
    s3Client.putObject({
      Bucket: env.AWS_S3_BUCKET,
      Key: "tls/cert.pem",
      Body: domainCertificates[0].pemCertificate,
    }),
  ];

  if (!accountKeys) {
    persistOperations.push(
      s3Client.putObject({
        Bucket: env.AWS_S3_BUCKET,
        Key: "tls/account/publicKey.pem",
        Body: pemAccountKeys.publicKeyPEM,
      }),
      s3Client.putObject({
        Bucket: env.AWS_S3_BUCKET,
        Key: "tls/account/privateKey.pem",
        Body: pemAccountKeys.privateKeyPEM,
      }),
    );
  }

  await Promise.all(persistOperations);

  if (certificate) {
    return Response.json({
      status: "renewed",
      message: "Certificate renewed successfully",
    });
  }

  return Response.json(
    {
      status: "created",
      message: "New certificate created successfully",
    },
    { status: 201 },
  );
});

async function getObject(key: string) {
  const response = await s3Client
    .getObject({
      Bucket: env.AWS_S3_BUCKET,
      Key: key,
    })
    .catch((e) => {
      if (e instanceof NoSuchKey) {
        return undefined;
      }
      throw e;
    });

  return await response?.Body?.transformToString();
}
