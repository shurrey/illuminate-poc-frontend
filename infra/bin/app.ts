#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { IlluminateStack } from "../lib/illuminate-stack";

const app = new cdk.App();

const environment = app.node.tryGetContext("environment") || "dev";

// Per-environment custom domain, e.g. { "dev": "illuminate.hurrey.dev" }; absent means CloudFront only.
const siteDomain = (app.node.tryGetContext("siteDomains") ?? {})[environment] as string | undefined;

new IlluminateStack(app, "IlluminatePoc", {
  siteDomain,
  ssmPrefix: `/illuminate/${environment}`,
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || "us-east-1",
  },
});
