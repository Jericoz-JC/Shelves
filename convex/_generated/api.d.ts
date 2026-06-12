/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as books from "../books.js";
import type * as chronicles from "../chronicles.js";
import type * as devSeed from "../devSeed.js";
import type * as follows from "../follows.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_contentLimits from "../lib/contentLimits.js";
import type * as lib_feedPagination from "../lib/feedPagination.js";
import type * as lib_feedRanking from "../lib/feedRanking.js";
import type * as lib_follows from "../lib/follows.js";
import type * as lib_moderation from "../lib/moderation.js";
import type * as lib_spoilers from "../lib/spoilers.js";
import type * as lib_userHandles from "../lib/userHandles.js";
import type * as readingProgress from "../readingProgress.js";
import type * as reports from "../reports.js";
import type * as userPreferences from "../userPreferences.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  books: typeof books;
  chronicles: typeof chronicles;
  devSeed: typeof devSeed;
  follows: typeof follows;
  "lib/auth": typeof lib_auth;
  "lib/contentLimits": typeof lib_contentLimits;
  "lib/feedPagination": typeof lib_feedPagination;
  "lib/feedRanking": typeof lib_feedRanking;
  "lib/follows": typeof lib_follows;
  "lib/moderation": typeof lib_moderation;
  "lib/spoilers": typeof lib_spoilers;
  "lib/userHandles": typeof lib_userHandles;
  readingProgress: typeof readingProgress;
  reports: typeof reports;
  userPreferences: typeof userPreferences;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
