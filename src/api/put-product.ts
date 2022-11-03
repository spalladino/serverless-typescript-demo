// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import { MetricUnits } from '@aws-lambda-powertools/metrics';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { Product } from "../model/Product";
import { logger, metrics } from "../powertools/utilities";
import { ReadWriteProducts, getProductStore } from "../store/product-store";
import { makeHandler } from "../utils";

async function lambdaHandler(event: APIGatewayProxyEvent, policies: ReadWriteProducts): Promise<APIGatewayProxyResult> {
  logger.appendKeys({
    resource_path: event.requestContext.resourcePath
  });

  const id = event.pathParameters!.id;
  if (id === undefined) {
    logger.warn('Missing \'id\' parameter in path while trying to create a product', {
      details: { eventPathParameters: event.pathParameters }
    });

    return {
      statusCode: 400,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message: "Missing 'id' parameter in path" }),
    };
  }

  if (!event.body) {
    logger.warn('Empty request body provided while trying to create a product');

    return {
      statusCode: 400,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message: "Empty request body" }),
    };
  }

  let product: Product;
  try {
    product = JSON.parse(event.body);

    if ((typeof product) !== "object" ){
      throw Error("Parsed product is not an object")
    }
  } catch (error: any) {
    logger.error('Unexpected error occurred while trying to create a product', error);

    return {
      statusCode: 400,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        message: "Failed to parse product from request body",
      }),
    };
  }

  if (id !== product.id) {
    logger.error( `Product ID in path ${id} does not match product ID in body ${product.id}`);

    return {
      statusCode: 400,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        message: "Product ID in path does not match product ID in body",
      }),
    };
  }

  const store = getProductStore(policies);

  try {
    await store.putProduct(product);

    metrics.addMetric('productCreated', MetricUnits.Count, 1);
    metrics.addMetadata('productId', id);

    return {
      statusCode: 201,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message: "Product created" }),
    };
  } catch (error: any) {
    logger.error('Unexpected error occurred while trying to create a product', error);

    return {
      statusCode: 500,
      headers: { "content-type": "application/json" },
      body: JSON.stringify(error),
    };
  }
};

export const handler = makeHandler(lambdaHandler, {
  policies: ReadWriteProducts,
  httpMethod: 'PUT',
  logicalName: 'PutProductFunction',
  resourcePath: 'products/{id}',
  entry: __filename,
});