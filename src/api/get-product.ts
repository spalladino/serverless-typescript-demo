// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import { MetricUnits } from "@aws-lambda-powertools/metrics";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { logger, metrics } from "../powertools/utilities";
import { ReadOnlyProducts, getProductStore, ReadWriteProducts } from "../store/product-store";
import { makeHandler } from "../utils";

async function lambdaHandler(event: APIGatewayProxyEvent, policies: ReadOnlyProducts): Promise<APIGatewayProxyResult> {
  logger.appendKeys({
    resource_path: event.requestContext.resourcePath
  });

  const id = event.pathParameters!.id;
  if (id === undefined) {
    logger.warn('Missing \'id\' parameter in path while trying to retrieve a product', {
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
    const result = await store.getProduct(id);

    if (!result) {
      logger.warn('No product with ID '+ id + ' found in the databases while trying to retrieve a product');

      return {
        statusCode: 404,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: "Product not found" }),
      };
    }

    logger.info('Product retrieved with ID '+ id, { details: { product: result } });
    metrics.addMetric('productRetrieved', MetricUnits.Count, 1);
    metrics.addMetadata('productId', id);

    return {
      statusCode: 200,
      headers: { "content-type": "application/json" },
      body: JSON.stringify(result),
    };
  } catch (error: any) {
    logger.error('Unexpected error occurred while trying to retrieve a product', error);

    return {
      statusCode: 500,
      headers: { "content-type": "application/json" },
      body: JSON.stringify(error),
    };
  }
};

export const handler = makeHandler(lambdaHandler, {
  policies: ReadOnlyProducts,
  httpMethod: 'GET',
  logicalName: 'GetProductFunction',
  resourcePath: 'products/{id}',
  entry: __filename,
});
