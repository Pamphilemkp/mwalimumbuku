# Performance audit

The target of about 500 concurrent users is a target. This environment has no staging URL and no load-test credentials, so that capacity was not measured.

## Measured locally

`npm run build` (Next.js 16.4.6, Turbopack) completed. TypeScript during the build finished in about 10 seconds. Compile time was about 8.6 seconds on this machine.

Routes are server-rendered on demand except `robots.txt` and `sitemap.xml`. The build lists a proxy middleware. First-load JavaScript per route was not printed by this Next version.

Built client assets under `.next/static`:

| Item | Size |
| --- | --- |
| Static directory | 3.0 MB |
| Server directory | 33 MB |
| Largest JS chunk | 405.2 KB (`1tc2yldmzkv9e.js`) |
| Next JS chunks | 258.7 KB, 223.7 KB, 165.5 KB, 133.9 KB |
| CSS chunk | 84.1 KB |

Those sizes are the files on disk, not transferred bytes over a network and not a single route's first load. The largest chunk was not mapped to one page.

`src/hooks/usePagination.ts` slices an array already in memory (`pageSize` default 5). Hooks under `src/hooks` do not call `.range(`. The academic screen selects schools, years, classes, courses, memberships, profiles, and up to 40 audit rows in one server render (`app/(app)/dashboard/academic/page.tsx`). That is a small fixed audit limit and an unbounded read of the other tables.

## Not run

- A staging or production load test, including 500 concurrent users.
- A cold-cache measurement of the HTML document or of the largest chunk over a slow link.
- Android Chrome, a throttled mobile network, or a long session-refresh loop.
- Realtime channel fan-out (support typing and similar client subscriptions were not connected).
- Concurrent database load, index timing, or a count of queries per dashboard request.
- Error recovery while the network drops mid-request.
- Media (homework, support audio, course files) through the signed-URL path against a real bucket.

In-process rate limits (`lib/auth/limiter.ts`) would not be shared across multiple Node processes. That was not timed.
