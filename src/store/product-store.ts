// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import { Product } from "../model/Product";
import { DynamoProductStore } from "./dynamodb/product-store";

export const ReadOnlyProducts = { ReadProducts: true } as const;
export const ReadWriteProducts = { ...ReadOnlyProducts, WriteProducts: true } as const;

export type ReadOnlyProducts = typeof ReadOnlyProducts;
export type ReadWriteProducts = typeof ReadWriteProducts;

export interface ProductStore {
  getProduct: (id: string) => Promise<Product | undefined>;
  getProducts: () => Promise<Product[] | undefined>;
  putProduct: (product: Product) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
}

export type ReadOnlyProductStore = Pick<ProductStore, 'getProduct' | 'getProducts'>;

export function getProductStore<Policy extends typeof ReadOnlyProducts>(_policy: Policy): Policy extends typeof ReadWriteProducts ? ProductStore : ReadOnlyProductStore {
  return new DynamoProductStore();
}
