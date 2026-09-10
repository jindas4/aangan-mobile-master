/**
 * Compile-time contract check: hand-written client types vs the backend's
 * OpenAPI schema.
 *
 * Nothing here runs — these are type-level assertions evaluated by tsc, so a
 * backend change that breaks a client becomes a build failure instead of an
 * `undefined` rendered to a user.
 *
 * Three classes of drift are caught:
 *
 *   1. Phantom      — the client reads a field the backend never sends.
 *                     (This found `UserOut.is_field_agent`, whose absence had
 *                     silently made the whole /field console unreachable.)
 *   2. NullUnsafe   — the backend may send `null` where the client's type
 *                     says it cannot. Crash / "null"-in-the-UI risk.
 *   3. Incompatible — genuinely conflicting types (e.g. string vs number).
 *
 * Deliberately NOT flagged:
 *   · Optionality differences. `foo?: T` vs `foo: T` is noise, not risk.
 *   · Client narrowing. The backend types many enums as plain `str`; the
 *     client narrowing that to a string-union is intentional and safer.
 *   A check that cries wolf gets ignored, so it only fires on real problems.
 *
 * Reading a failure:
 *   "Type '"fieldName"' is not assignable to type 'never'" names the exact
 *   offending field. Hover the corresponding type to see both sides.
 *
 * When this file errors: run `npm run api:types` first (the checked-in schema
 * may be stale). If it still errors, the backend genuinely changed shape.
 */
import type {
  ApiBooking,
  ApiConversation,
  ApiListingCard,
  ApiListingFull,
  ApiMessage,
  ApiReview,
  ApiUser,
} from "./api-schema";
import type {
  BookingOut,
  Conversation,
  ListingCard,
  ListingFull,
  Message,
  Review,
  UserOut,
} from "./api";

/** Fails compilation unless T is exactly `true`. */
type Expect<T extends true> = T;

/** Normalises away optionality so `foo?: T` and `foo: T` compare equal. */
type Defined<T> = Exclude<T, undefined>;

/** Fields the client declares that the backend never sends. */
type Phantom<Client, Server> = Exclude<keyof Client, keyof Server>;

/** Backend may send null; the client's type doesn't allow it. */
type NullUnsafe<Client, Server> = keyof {
  [K in keyof Client & keyof Server as null extends Server[K]
    ? null extends Client[K]
      ? never
      : K
    : never]: unknown;
};

/** Types that conflict in both directions (client narrowing is allowed). */
type Incompatible<Client, Server> = keyof {
  [K in keyof Client & keyof Server as Defined<Client[K]> extends Defined<Server[K]>
    ? never
    : Defined<Server[K]> extends Defined<Client[K]>
      ? never
      : K]: unknown;
};

type Drift<C, S> = Phantom<C, S> | NullUnsafe<C, S> | Incompatible<C, S>;
type Clean<C, S> = Drift<C, S> extends never ? true : false;

// ── Assertions ───────────────────────────────────────────────────────────
type _User = Expect<Clean<UserOut, ApiUser>>;
type _ListingCard = Expect<Clean<ListingCard, ApiListingCard>>;
type _ListingFull = Expect<Clean<ListingFull, ApiListingFull>>;
type _Booking = Expect<Clean<BookingOut, ApiBooking>>;
type _Conversation = Expect<Clean<Conversation, ApiConversation>>;
type _Message = Expect<Clean<Message, ApiMessage>>;
type _Review = Expect<Clean<Review, ApiReview>>;

export type ContractChecks = [
  _User, _ListingCard, _ListingFull,
  _Booking, _Conversation, _Message, _Review,
];
