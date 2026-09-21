/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as aiChat from "../aiChat.js";
import type * as aiDocs from "../aiDocs.js";
import type * as auth from "../auth.js";
import type * as auth_emailOtp from "../auth/emailOtp.js";
import type * as dhamma from "../dhamma.js";
import type * as http from "../http.js";
import type * as library from "../library.js";
import type * as profile from "../profile.js";
import type * as seed from "../seed.js";
import type * as users from "../users.js";
import type * as watchRooms from "../watchRooms.js";
import type * as youtubeSync from "../youtubeSync.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  aiChat: typeof aiChat;
  aiDocs: typeof aiDocs;
  auth: typeof auth;
  "auth/emailOtp": typeof auth_emailOtp;
  dhamma: typeof dhamma;
  http: typeof http;
  library: typeof library;
  profile: typeof profile;
  seed: typeof seed;
  users: typeof users;
  watchRooms: typeof watchRooms;
  youtubeSync: typeof youtubeSync;
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
