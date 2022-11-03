// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import { aws_apigateway, aws_dynamodb, aws_lambda, aws_lambda_nodejs, aws_logs, CfnOutput, RemovalPolicy, Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import * as path from 'path';
import { HandlerParams } from "../src/utils";

export class ServerlessTypescriptDemoStack extends Stack {
  private productsTable: aws_dynamodb.Table;
  private api: aws_apigateway.RestApi;

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const productsTable = new aws_dynamodb.Table(this, "Products", {
      tableName: "Products",
      partitionKey: {
        name: "id",
        type: aws_dynamodb.AttributeType.STRING,
      },
      billingMode: aws_dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY
    });
    
    this.productsTable = productsTable;
    
    const api = new aws_apigateway.RestApi(this, "ProductsApi", {
      restApiName: "ProductsApi",
      deployOptions: {
        tracingEnabled: true,
        dataTraceEnabled: true,
        loggingLevel: aws_apigateway.MethodLoggingLevel.INFO,
        metricsEnabled: true,
      }
    });
    
    this.api = api;

    new CfnOutput(this, "ApiURL", {
      value: `${api.url}products`,
    });
  }

  public makeFunction(params: HandlerParams) {
    const fn = new aws_lambda_nodejs.NodejsFunction(
      this,
      params.logicalName,
      {
        awsSdkConnectionReuse: true,
        entry: path.relative(path.resolve(__dirname, '..'), params.entry),
        ...this.getFunctionSettings(),
      }
    );

    if (params.policies.ReadProducts) this.productsTable.grantReadData(fn);
    if (params.policies.WriteProducts) this.productsTable.grantWriteData(fn);

    this.api.root.resourceForPath(params.resourcePath).addMethod(params.httpMethod, new aws_apigateway.LambdaIntegration(fn));
  }

  private getFunctionSettings() {
    const envVariables = {
      AWS_ACCOUNT_ID: Stack.of(this).account,
      POWERTOOLS_SERVICE_NAME: 'serverless-typescript-demo',
      POWERTOOLS_LOGGER_LOG_LEVEL: 'WARN',
      POWERTOOLS_LOGGER_SAMPLE_RATE: '0.01',
      POWERTOOLS_LOGGER_LOG_EVENT: 'true',
      POWERTOOLS_METRICS_NAMESPACE: 'AwsSamples',
    };

    const esBuildSettings = {
      minify: true
    }

    return {
      handler: "handler",
      runtime: aws_lambda.Runtime.NODEJS_16_X,
      memorySize: 256,
      environment: {
        TABLE_NAME: this.productsTable.tableName,
        ...envVariables
      },
      logRetention: aws_logs.RetentionDays.ONE_WEEK,
      tracing: aws_lambda.Tracing.ACTIVE,
      bundling: esBuildSettings
    }
  }
}
