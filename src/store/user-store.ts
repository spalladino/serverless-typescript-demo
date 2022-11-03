// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import { User } from "../model/User";

export const ReadOnlyUsers = { ReadUsers: true } as const;
export const ReadWriteUsers = { ...ReadOnlyUsers, WriteUsers: true } as const;

export type ReadOnlyUsers = typeof ReadOnlyUsers;
export type ReadWriteUsers = typeof ReadWriteUsers;

export interface ReadOnlyUserStore {
  getUser: (id: string) => Promise<User | undefined>;
  getUsers: () => Promise<User[] | undefined>;
}

export interface UserStore extends ReadOnlyUserStore {
  putUser: (User: User) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
}
