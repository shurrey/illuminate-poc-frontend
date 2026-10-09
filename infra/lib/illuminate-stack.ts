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

    // Add our CloudFront origin to the API Lambda's ALLOWED_ORIGINS, keeping its other environment
    // variables. An API stack deploy resets ALLOWED_ORIGINS, so this runs on every deploy of this stack.
    const apiLambdaName = `illuminate-api-${prefix.split("/").pop()}`;
    const apiLambdaArn = `arn:aws:lambda:${this.region}:${this.account}:function:${apiLambdaName}`;

    const corsOriginHandler = new lambda.Function(this, "AddCorsOriginHandler", {
      runtime: lambda.Runtime.PYTHON_3_12,
      handler: "index.handler",
      timeout: cdk.Duration.minutes(2),
      code: lambda.Code.fromInline(`
import boto3

def handler(event, context):
    props = event["ResourceProperties"]
    if event["RequestType"] != "Delete":
        client = boto3.client("lambda")
        name, origin = props["FunctionName"], props["Origin"]
        client.get_waiter("function_updated_v2").wait(FunctionName=name)
        env = client.get_function_configuration(FunctionName=name).get("Environment", {}).get("Variables", {})
        origins = [o.strip() for o in env.get("ALLOWED_ORIGINS", "").split(",") if o.strip()]
        if origin not in origins:
            env["ALLOWED_ORIGINS"] = ",".join(origins + [origin])
            client.update_function_configuration(FunctionName=name, Environment={"Variables": env})
            client.get_waiter("function_updated_v2").wait(FunctionName=name)
    return {"PhysicalResourceId": "cors-origin-" + props["FunctionName"]}
`),
    });
    corsOriginHandler.addToRolePolicy(new iam.PolicyStatement({
      // The function_updated_v2 waiter polls GetFunction.
      actions: ["lambda:GetFunction", "lambda:GetFunctionConfiguration", "lambda:UpdateFunctionConfiguration"],
      resources: [apiLambdaArn],
    }));

    new cdk.CustomResource(this, "AddCorsOrigin", {
      serviceToken: new cr.Provider(this, "AddCorsOriginProvider", { onEventHandler: corsOriginHandler }).serviceToken,
      properties: { FunctionName: apiLambdaName, Origin: siteOrigin, DeployedAt: new Date().toISOString() },
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
