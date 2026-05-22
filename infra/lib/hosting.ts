import * as cdk from "aws-cdk-lib";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import * as s3deploy from "aws-cdk-lib/aws-s3-deployment";
import { Construct } from "constructs";
import * as path from "path";

export interface HostingProps {
  /** Path to the Next.js static export output directory */
  sitePath: string;
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

    new s3deploy.BucketDeployment(this, "DeploySite", {
      sources: [s3deploy.Source.asset(props.sitePath)],
      destinationBucket: this.bucket,
      distribution: this.distribution,
      distributionPaths: ["/*"],
    });
  }
}
