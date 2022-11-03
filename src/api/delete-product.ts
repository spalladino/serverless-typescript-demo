// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import { MetricUnits } from "@aws-lambda-powertools/metrics";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { logger, metrics } from "../powertools/utilities";
import { ReadWriteProducts, getProductStore } from "../store/product-store";
import { makeHandler } from "../utils";

async function lambdaHandler(event: APIGatewayProxyEvent, policies: ReadWriteProducts): Promise<APIGatewayProxyResult> {
  logger.appendKeys({
    resource_path: event.requestContext.resourcePath
  });

  const id = event.pathParameters!.id;
  if (id === undefined) {
    logger.warn('Missing \'id\' parameter in path while trying to delete a product', {
      details: { eventPathParameters: event.pathParameters }
    });

    return {
      statusCode: 400,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message: "Missing 'id' parameter in path" }),
    };
  }

  const store = getProductStore(policies);

  try {
    await store.deleteProduct(id);

    logger.info('Deleted product with ID '+ id);
    metrics.addMetric('productDeleted', MetricUnits.Count, 1);
    metrics.addMetadata('productId', id);

    return {
      statusCode: 200,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message: "Product deleted" }),
    };
  } catch (error: any) {
    logger.error('Unexpected error occurred while trying to delete product with ID '+ id, error);

    return {
      statusCode: 500,
      headers: { "content-type": "application/json" },
      body: JSON.stringify(error),
    };
  }
};

export const handler = makeHandler(lambdaHandler, {
  policies: ReadWriteProducts,
  httpMethod: 'DELETE',
  logicalName: 'DeleteProductFunction',
  resourcePath: 'products/{id}',
  entry: __filename,
});