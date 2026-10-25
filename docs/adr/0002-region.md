# ADR 0002: Region

Status: Accepted (pending Yash's confirmation of grid numbers).

**Decision:** user-facing Cloud Run services and Firestore run in `asia-south1` (Mumbai).

**Why:** users are elderly people in India on slow phones and 3G (Bittu persona: LCP < 3 s). A US region adds roughly 200+ ms of round-trip time per request, which a 400 ms-RTT 3G link compounds.

**Carbon trade-off:** `asia-south1` has a higher grid intensity than many US/EU regions (see `scripts/sci/coefficients.json`, values to verify against Google's published region data). We accept this for the serving path because latency directly affects whether the app is used at all. We reduce it by: scale-to-zero staging, `min-instances=0` prod outside judging, small images, a page-weight budget, and running heavy non-user-facing work (nightly full suites) on GitLab runners, deferrable by the carbon gate.
