import * as cdk from "aws-cdk-lib";
import * as acm from "aws-cdk-lib/aws-certificatemanager";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import * as s3deploy from "aws-cdk-lib/aws-s3-deployment";
import { Construct } from "constructs";
import * as path from "path";

export interface HostingProps {
  /** Path to the Next.js static export output directory */
  sitePath: string;
  /** Custom domain for the site, e.g. "illuminate.hurrey.dev". Its DNS is outside AWS. */
  siteDomain?: string;
}

/**
 * S3 + CloudFront static hosting for the Next.js exported site.
 * Uses a CloudFront Function to rewrite URIs so /foo/ resolves to /foo/index.html.
 */
export class Hosting extends Construct {
  public readonly distribution: cloudfront.Distribution;
  public readonly bucket: s3.Bucket;

  constructor(scope: Construct, id: string, props: HostingProps) {
    super(scope, id);

    this.bucket = new s3.Bucket(this, "SiteBucket", {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
    });

    // CloudFront Function to rewrite URIs:
    //   /            → /index.html
    //   /reporting/  → /reporting/index.html
    //   /developer/  → /developer/index.html
    //   /foo         → /foo/index.html  (trailing slash added)
    //   /foo.js      → /foo.js          (files with extensions pass through)
    const rewriteFunction = new cloudfront.Function(this, "UrlRewrite", {
      code: cloudfront.FunctionCode.fromInline(`
function handler(event) {
  var request = event.request;
  var uri = request.uri;

  // If URI has a file extension, pass through (static assets)
  if (uri.match(/\\.[a-zA-Z0-9]+$/)) {
    return request;
  }

  // Append /index.html for directory-like paths
  if (uri.endsWith('/')) {
    request.uri = uri + 'index.html';
  } else {
    request.uri = uri + '/index.html';
  }

  return request;
}
      `),
      runtime: cloudfront.FunctionRuntime.JS_2_0,
    });

    // No hosted zone: CloudFormation waits until the validation CNAME is added in Cloudflare.
    const certificate = props.siteDomain
      ? new acm.Certificate(this, "Certificate", {
          domainName: props.siteDomain,
          validation: acm.CertificateValidation.fromDns(),
        })
      : undefined;

    this.distribution = new cloudfront.Distribution(this, "Distribution", {
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(this.bucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        functionAssociations: [
          {
            function: rewriteFunction,
            eventType: cloudfront.FunctionEventType.VIEWER_REQUEST,
          },
        ],
      },
      ...(props.siteDomain && certificate
        ? { domainNames: [props.siteDomain], certificate }
        : {}),
      defaultRootObject: "index.html",
      // SPA fallback for truly unknown routes (not pre-rendered)
      errorResponses: [
        {
          httpStatus: 403,
          responseHttpStatus: 200,
          responsePagePath: "/index.html",
          ttl: cdk.Duration.minutes(5),
        },
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: "/index.html",
          ttl: cdk.Duration.minutes(5),
        },
      ],
    });

    const staticAssets = "_next/static/*";

    // Hashed build assets: cacheable forever. prune is off so this deployment never deletes HTML.
    const assetsDeployment = new s3deploy.BucketDeployment(this, "DeploySiteAssets", {
      sources: [s3deploy.Source.asset(props.sitePath)],
      destinationBucket: this.bucket,
      exclude: ["*"],
      include: [staticAssets],
      prune: false,
      cacheControl: [s3deploy.CacheControl.fromString("public,max-age=31536000,immutable")],
    });

    // Everything else (HTML, unhashed files) must revalidate. Excluded assets are left alone by prune.
    const siteDeployment = new s3deploy.BucketDeployment(this, "DeploySite", {
      sources: [s3deploy.Source.asset(props.sitePath)],
      destinationBucket: this.bucket,
      exclude: [staticAssets],
      cacheControl: [s3deploy.CacheControl.noCache()],
      distribution: this.distribution,
      distributionPaths: ["/*"],
    });
    // HTML goes live only after the assets it references exist.
    siteDeployment.node.addDependency(assetsDeployment);
  }
}
