import { fail } from "@/lib/http";

/**
 * Sign-up is closed server-side (`site.signup-closed` of the dev checklist): this door exists only to answer 403, whatever the
 * method and whatever is sent. There is no other way to create an account here: the cast is fixed (lib/store.ts).
 */
const closed = () => fail(403, "SIGNUP_CLOSED");
export { closed as DELETE, closed as GET, closed as PATCH, closed as POST, closed as PUT };
