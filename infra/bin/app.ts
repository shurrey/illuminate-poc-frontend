#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { IlluminateStack } from "../lib/illuminate-stack";

const app = new cdk.App();

const environment = app.node.tryGetContext("environment") || "dev";

new IlluminateStack(app, "IlluminatePoc", {
  ssmPrefix: `/illuminate/${environment}`,
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || "us-east-1",
  },
});
