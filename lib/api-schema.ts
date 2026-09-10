/**
 * Backend contract types, generated from FastAPI's OpenAPI schema.
 *
 * The schema is produced by the backend repo:
 *     python scripts/export_openapi.py     → backend/openapi.json
 * and copied here (openapi.json) so this repo builds standalone.
 *
 * Refresh both with:
 *     npm run api:types            (from the committed openapi.json)
 *     npm run api:types:remote     (pull straight from a running backend)
 *
 * Do not edit lib/api-types.gen.ts by hand.
 *
 * The hand-written interfaces in lib/api.ts stay the ergonomic surface used
 * by screens; lib/api-contract.ts asserts they remain structurally compatible
 * with these generated types, so a backend rename becomes a compile error
 * instead of `undefined` on a user's phone.
 */
import type { components } from "./api-types.gen";

export type Schemas = components["schemas"];

// ── Core resources ───────────────────────────────────────────────────────
export type ApiUser = Schemas["UserOut"];
export type ApiListingCard = Schemas["ListingCardOut"];
export type ApiListingFull = Schemas["ListingOut"];
export type ApiBooking = Schemas["BookingOut"];
export type ApiConversation = Schemas["ConversationOut"];
export type ApiMessage = Schemas["MessageOut"];
export type ApiReview = Schemas["ReviewOut"];
