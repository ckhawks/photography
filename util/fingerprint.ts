import FingerprintJS from "@fingerprintjs/fingerprintjs";

/**
 * The visitor id, computed once per page.
 *
 * FingerprintJS builds its id partly from canvas and WebGL probes, so every
 * call to `load()` takes a WebGL context. Calling it from each LikeButton meant
 * one agent and one context per photo on the wall — browsers cap live contexts
 * at ~16 and start dropping the oldest, which is what the flood of
 * "Too many active WebGL contexts" warnings was. The id is per visitor, not per
 * photo, so one shared promise is all that was ever needed.
 *
 * The promise is cached, not the value, so buttons that mount while it is still
 * resolving await the same work instead of starting their own.
 */
let visitorId: Promise<string> | null = null;

export function getVisitorId(): Promise<string> {
  if (!visitorId) {
    visitorId = FingerprintJS.load()
      .then((agent) => agent.get())
      .then((result) => result.visitorId)
      .catch((error) => {
        // let the next caller retry rather than caching the failure forever
        visitorId = null;
        throw error;
      });
  }
  return visitorId;
}
