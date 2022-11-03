// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
// blob/main/src/api/get-products.ts
import { MetricUnits } from '@aws-lambda-powertools/metrics';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { logger, metrics } from "../powertools/utilities";
import { ReadOnlyProducts, getProductStore } from "../store/product-store";
import { makeHandler } from "../utils";

async function lambdaHandler(event: APIGatewayProxyEvent, policies: ReadOnlyProducts): Promise<APIGatewayProxyResult> {
  logger.appendKeys({
    resource_path: event.requestContext.resourcePath
  });

  const store = getProductStore(policies);

  try {
    const result = await store.getProducts();

    logger.info('Products retrieved', { details: { products: result } });
    metrics.addMetric('productsRetrieved', MetricUnits.Count, 1);

    return {
      statusCode: 200,
      headers: { "content-type": "application/json" },
      body: `{"products":${JSON.stringify(result)}}`,
    };
  } catch (error) {
      logger.error('Unexpected error occurred while trying to retrieve products', error as Error);

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
  logicalName: 'GetProductsFunction',
  resourcePath: 'products',
  entry: __filename,
});