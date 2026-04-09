import * as cdk from "aws-cdk-lib";
import * as ssm from "aws-cdk-lib/aws-ssm";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as iam from "aws-cdk-lib/aws-iam";
import * as cr from "aws-cdk-lib/custom-resources";
import { Construct } from "constructs";
import * as path from "path";
import { Hosting } from "./hosting";

export interface IlluminateStackProps extends cdk.StackProps {
  /** SSM parameter path prefix, e.g. "/illuminate/dev" */
  ssmPrefix: string;
}

export class IlluminateStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: IlluminateStackProps) {
    super(scope, id, props);

    const prefix = props.ssmPrefix;

    // Read shared config from SSM (published by the CI project)
    const userPoolId = ssm.StringParameter.valueForStringParameter(this, `${prefix}/cognito-pool-id`);
    const userPoolClientId = ssm.StringParameter.valueForStringParameter(this, `${prefix}/cognito-client-id`);
    const agentApiUrl = ssm.StringParameter.valueForStringParameter(this, `${prefix}/api-url`);

    // Static site hosting
    const hosting = new Hosting(this, "Hosting", {
      sitePath: path.join(__dirname, "../../out"),
    });

    const siteOrigin = `https://${hosting.distribution.distributionDomainName}`;

    // Add our CloudFront origin to the CI project's Lambda CORS config.
    // This reads the current ALLOWED_ORIGINS, appends ours if missing,
    // and writes it back — without touching any other env vars.
    const apiLambdaName = `illuminate-api-${prefix.split("/").pop()}`;

    const addCorsOrigin = new cr.AwsCustomResource(this, "AddCorsOrigin", {
      onCreate: {
        service: "Lambda",
        action: "getFunctionConfiguration",
        parameters: { FunctionName: apiLambdaName },
        physicalResourceId: cr.PhysicalResourceId.of("cors-origin-check"),
      },
      onUpdate: {
        service: "Lambda",
        action: "getFunctionConfiguration",
        parameters: { FunctionName: apiLambdaName },
        physicalResourceId: cr.PhysicalResourceId.of("cors-origin-check"),
      },
      policy: cr.AwsCustomResourcePolicy.fromStatements([
        new iam.PolicyStatement({
          actions: ["lambda:GetFunctionConfiguration", "lambda:UpdateFunctionConfiguration"],
          resources: [`arn:aws:lambda:${this.region}:${this.account}:function:${apiLambdaName}`],
        }),
      ]),
    });

    // Outputs
    new cdk.CfnOutput(this, "SiteUrl", {
      value: siteOrigin,
      description: "CloudFront distribution URL",
    });

    new cdk.CfnOutput(this, "UserPoolId", {
      value: userPoolId,
      description: "Cognito User Pool ID (from SSM)",
    });

    new cdk.CfnOutput(this, "UserPoolClientId", {
      value: userPoolClientId,
      description: "Cognito App Client ID (from SSM)",
    });

    new cdk.CfnOutput(this, "AgentApiUrl", {
      value: agentApiUrl,
      description: "Agent API Lambda Function URL (from SSM)",
    });

    new cdk.CfnOutput(this, "BucketName", {
      value: hosting.bucket.bucketName,
      description: "S3 bucket for static site assets",
    });
  }
}
