# Serverless Typescript Demo with type-checked permissions

This is a fork of the [Serverless Typescript Demo](https://github.com/aws-samples/serverless-typescript-demo) to showcase using type-checked permissions in typescript to catch missing permissions errors, and using CDK to retrieve these permissions definitions and use them to create the IAM policies to be deployed.

## TL;DR

We can define the permissions for our lambda functions in our serverless apps using typescript objects. This lets us **type-check access to resources**, raising at compile-time any errors caused by missing permissions.

```typescript
// We define our app permissions as objects
const ProductsAccess = { Products: true } as const;
const MailerAccess = { Mailer: true } as const;

// And we restrict access to any resource by requiring those permissions
getProductStore = (_policy: typeof ProductsAccess) => new DynamoProductStore();
getMailService = (_policy: typeof MailerAccess) => new SESMailer();

// Then we define the type of policies required by our lambda as an argument
async function lambdaHandler(event: Event, policies: typeof ProductsAccess & typeof UsersAccess): Promise<Result> {
  // And use those policies when requesting access to a resource
  // so the compiler catches if we try to access a resource for which we don't have the required policy
  const store = getProductStore(policies);

  // Next line fails to compile since our policies do not include acess to the mail service
  const mailer = getMailService(policies);
}
```

And since we have defined our policies in code as part of each lambda handler, we can declare all parameters for each lambda in its handler file and **use CDK to parse them and create the associated resources**.

```typescript
// src/api/get-product.ts
export const handler = makeHandler(lambdaHandler, {
  policies: ReadOnlyProducts,
  httpMethod: 'GET',
  logicalName: 'GetProductFunction',
  resourcePath: 'products/{id}',
  entry: __filename,
});
```

```typescript
// bin/stack.ts
import { MyStack } from '../lib/my-stack';
import * as handlers from '../src/api';

const app = new cdk.App();
const stack = new MyStack(app, 'MyStack', { ... });

for (const handler of Object.values(handlers)) {
  stack.makeFunction(handler.params);
}
```

```typescript
// lib/stack.ts
export class MyStack extends Stack {
  public makeFunction(params: HandlerParams) {
    const fn = new NodejsFunction(this, params.logicalName, {
      entry: path.relative(path.resolve(__dirname, '..'), params.entry),
      ...this.getFunctionSettings(),
    });

    this.grantRights(fn, params.policies);
    this.api.root.resourceForPath(params.resourcePath)
      .addMethod(params.httpMethod, new LambdaIntegration(fn));
  }
}
```

This lets us define each handler for our application, along with its required permissions, in the same file where we declare the handler function, and **leverage the type checker to catch any missing permissions**.