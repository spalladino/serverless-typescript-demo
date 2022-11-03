import { ReadWriteProducts } from "./product-store";
import { ReadWriteUsers } from "./user-store";

export type Policies = ReadWriteProducts & ReadWriteUsers;