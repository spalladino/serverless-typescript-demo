import { injectLambdaContext } from "@aws-lambda-powertools/logger";
import { logMetrics } from "@aws-lambda-powertools/metrics";
import { captureLambdaHandler } from "@aws-lambda-powertools/tracer";
import middy from "@middy/core";
import { APIGatewayProxyEvent, APIGatewayProxyHandler, APIGatewayProxyResult } from "aws-lambda";
import { logger, metrics, tracer } from "./powertools/utilities";
import { Policies } from "./store";

export type HandlerParams<P = Partial<Policies>> = {
  logicalName: string,
  httpMethod: string,
  resourcePath: string,
  entry: string,
  policies: P,
}

export type APIGatewayProxyHandlerWithParams = APIGatewayProxyHandler & { params: HandlerParams }

export function makeHandler<P extends Partial<Policies>>(
  handler: (event: APIGatewayProxyEvent, policies: P) => Promise<APIGatewayProxyResult>, 
  params: HandlerParams<P>
): APIGatewayProxyHandlerWithParams {
  const wrappedHandler = (event: APIGatewayProxyEvent) => handler(event, params.policies);
  wrappedHandler.params = params;
  injectMiddleware(wrappedHandler);
  return wrappedHandler;
}

function injectMiddleware(handler: (event: APIGatewayProxyEvent) => Promise<APIGatewayProxyResult>) {
  if (typeof(middy) === 'function') {
    return middy(handler)
    .use(captureLambdaHandler(tracer))
    .use(logMetrics(metrics, { captureColdStartMetric: true }))
    .use(injectLambdaContext(logger, { clearState: true }));
  }
  return handler;
}
