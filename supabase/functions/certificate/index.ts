import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { X509Certificate } from 'node:crypto'
import { NoSuchKey, S3 } from 'npm:@aws-sdk/client-s3@3.645.0'
import { createClient } from 'jsr:@supabase/supabase-js@2'
import * as ACME from 'https://deno.land/x/acme@v0.4.1/acme.ts'
import { env } from './env.ts'

const supabaseClient = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

const s3Client = new S3({
  forcePathStyle: true,
})

Deno.serve(async (req) => {
  // Check if the request is authorized
  if (!(await isAuthorized(req))) {
    return Response.json(
      {
        status: 'error',
        message: 'Unauthorized',
      },
      { status: 401 }
    )
  }

  const { domainName } = await req.json()

  if (!domainName) {
    return Response.json(
      {
        status: 'error',
        message: 'Domain name is required',
      },
      { status: 400 }
    )
  }

  // Check if we need to renew the certificate
  const certificate = await getObject('tls/cert.pem')
  if (certificate) {
    const { validTo } = new X509Certificate(certificate)
    // if the validity is more than 30 days, no need to renew
    const day = 24 * 60 * 60 * 1000
    if (new Date(validTo) > new Date(Date.now() + 30 * day)) {
      return new Response(null, { status: 304 })
    }
  }

  // Load account keys if they exist
  const [publicKey, privateKey] = await Promise.all([
    getObject('tls/account/publicKey.pem'),
    getObject('tls/account/privateKey.pem'),
  ])
  let accountKeys: { privateKeyPEM: string; publicKeyPEM: string } | undefined
  if (publicKey && privateKey) {
    accountKeys = {
      privateKeyPEM: privateKey,
      publicKeyPEM: publicKey,
    }
  }

  const { domainCertificates, pemAccountKeys } = await ACME.getCertificatesWithCloudflare(
    env.CLOUDFLARE_API_TOKEN,
    [
      {
        domainName,
        subdomains: ['*'],
      },
    ],
    {
      acmeDirectoryUrl: env.ACME_DIRECTORY_URL,
      yourEmail: env.ACME_EMAIL,
      pemAccountKeys: accountKeys,
    }
  )

  const persistOperations = [
    s3Client.putObject({
      Bucket: env.AWS_S3_BUCKET,
      Key: `tls/${domainName}/key.pem`,
      Body: domainCertificates[0].pemPrivateKey,
    }),
    s3Client.putObject({
      Bucket: env.AWS_S3_BUCKET,
      Key: `tls/${domainName}/cert.pem`,
      Body: domainCertificates[0].pemCertificate,
    }),
  ]

  if (!accountKeys) {
    persistOperations.push(
      s3Client.putObject({
        Bucket: env.AWS_S3_BUCKET,
        Key: 'tls/account/publicKey.pem',
        Body: pemAccountKeys.publicKeyPEM,
      }),
      s3Client.putObject({
        Bucket: env.AWS_S3_BUCKET,
        Key: 'tls/account/privateKey.pem',
        Body: pemAccountKeys.privateKeyPEM,
      })
    )
  }

  await Promise.all(persistOperations)

  if (certificate) {
    return Response.json({
      status: 'renewed',
      message: `Certificate renewed successfully for domain ${domainName}`,
    })
  }

  return Response.json(
    {
      status: 'created',
      message: `New certificate created successfully for domain ${domainName}`,
    },
    { status: 201 }
  )
})

async function isAuthorized(req: Request) {
  const authHeader = req.headers.get('Authorization')

  if (!authHeader) {
    return false
  }

  const bearerToken = authHeader.split(' ')[1]

  const { data: sharedSecret } = await supabaseClient.rpc('supabase_functions_certificate_secret')

  if (sharedSecret !== bearerToken) {
    return false
  }

  return true
}

async function getObject(key: string) {
  const response = await s3Client
    .getObject({
      Bucket: env.AWS_S3_BUCKET,
      Key: key,
    })
    .catch((e) => {
      if (e instanceof NoSuchKey) {
        return undefined
      }
      throw e
    })

  return await response?.Body?.transformToString()
}
