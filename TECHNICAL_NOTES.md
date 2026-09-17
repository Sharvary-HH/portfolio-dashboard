# Technical notes

A longer, narrative account of the same problems — including the first attempts that did not work —
is in [docs/challenges.md](docs/challenges.md).

## 1. No official API on either source

Yahoo Finance and Google Finance both dropped their public APIs years ago. Quotes come from
`yahoo-finance2`, which wraps the same undocumented endpoints the Yahoo site uses; P/E and quarterly
earnings come from scraping the public Google Finance quote page with axios and cheerio.

The parser is a pure function, `parseGoogleFinance(html)`, tested against two real pages saved under
`apps/api/tests/fixtures/` plus a hand-written page with dashes for every value and a cookie-consent
page. It locates values by **visible label text**, never by class name: Google's classes
(`SwQK7`, `dO6ijd`, …) are obfuscated build output and rotate. The parser walks every leaf element
once, builds a label→value map from each element's sibling, and reads `P/E ratio` and `EPS` out of
it. Quarterly earnings come from the one table on the page containing a `Net income` row: the header
row gives the period labels and the parser takes the most recent column that actually has a number,
so a quarter Google has not filled in yet does not blank the cell.

**Trade-off:** fixtures make the parser testable offline but they age. When Google changes the page,
the fixture tests keep passing while production breaks, so the provider also treats "page parsed but
no usable fields" as a failure and falls back rather than reporting nulls as fact.

## 2. Rate limits and blocking

Six defences, in the order a request meets them:

1. **Batching.** All symbols go to Yahoo in one `quote([...])` call, chunked at 50. One poll costs
   one outbound request, not 26.
2. **Tiered TTLs.** Prices change every second, so quotes are cached for 15 seconds. P/E and
   earnings change quarterly, so they are cached for 6 hours. In steady state a 15-second poll costs
   **one Yahoo call and zero Google calls**. Twenty-six scrapes happen roughly four times a day.
3. **In-flight de-duplication.** Concurrent callers for the same cache key share one promise, so a
   burst of browser tabs cannot multiply outbound traffic.
4. **Throttling.** Google scrapes run through `p-limit(2)` with a random 250–750 ms delay each, so a
   cold start looks like a person browsing rather than a scraper.
5. **Retry with backoff.** Three attempts on network errors, 429 and 5xx; 500 ms, 1 s, 2 s with ±30%
   jitter; `Retry-After` honoured when present; other 4xx never retried, because they will not
   succeed.
6. **Circuit breaker, per provider.** Five consecutive failures opens it for 60 seconds, after which
   one trial request decides whether to close or reopen. While open, cached values are served and no
   outbound request is made, which is the behaviour that stops a rate-limited provider from being
   hammered into a longer ban. `/api/health` exposes both breakers' states.

## 3. Data accuracy

Every boundary is validated with zod: the holdings file at startup (failing fast with the offending
field), each quote, each scraped page, and the API response itself.

Every value carries a source. `status.quote.source` and `status.fundamentals.source` say whether a
number came from Yahoo, Google, mock data or cache, and `stale` says whether it is being served past
its TTL. The UI shows a small icon on any such cell whose tooltip names the reason, and the footer
states plainly that the data is unofficial and not advice.

A sanity check guards against a wrong match: Yahoo returns a quote for `541557.BO` that is off by six
orders of magnitude (a different instrument on the same code). Any quote more than 25× above or below
the purchase price is rejected rather than shown, because a plainly wrong number in a portfolio table
is worse than a blank one.

## 4. BSE vs NSE symbols — the largest real problem

The sheet's NSE/BSE column mixes NSE tickers (`HDFCBANK`) with numeric BSE codes (`532174`), so the
importer detects the exchange by shape: all digits → BSE, otherwise NSE. Mapping is a pure, tested
function: `HDFCBANK` → `HDFCBANK.NS` / `HDFCBANK:NSE`, `532174` → `532174.BO` / `532174:BOM`.

Google Finance accepts the numeric BSE codes happily — 25 of 26 holdings resolve. Yahoo mostly does
not: `532174.BO`, `500400.BO` and most other numeric codes come back empty, and for one code Yahoo
returns an unrelated instrument. So the quote service resolves symbols in two passes: fetch with the
mapped symbols, then for any holding with no quote (or an implausible one), search Yahoo by company
name, prefer an `NSI`-listed `EQUITY` result, and cache the resolved symbol for 24 hours. Lookups
that find nothing are marked for retry in 15 minutes rather than cached as permanent failures, so a
transient rate limit does not blank a holding for a day.

That takes live coverage from 7 of 26 holdings to 22. The remaining four are thin or newly listed
names Yahoo's search does not return; they show `—`, are excluded from totals, and are counted in
`meta.warnings`.

## 4b. When Yahoo blocks the server outright

Deploying to Render proved the point section 2 warns about: Yahoo answers a laptop fine but returns
`429 Too Many Requests` on the crumb endpoint to the datacentre IP, permanently. Google Finance was
unaffected from the same host.

So the price chain has one more link. When the Yahoo call fails or its circuit is open, the quote
service reads the price straight off the Google Finance page it already knows how to parse: the
parser returns `price`, `dayChangePercent` and `currency` alongside the fundamentals, found without
class names by taking the first standalone currency amount inside `main` whose parent holds nothing
but that amount — which distinguishes the live price from labelled key stats like `Open ₹717.50`.

These prices use a separate 5-minute TTL (`GOOGLE_PRICE_TTL_SECONDS`), not the 15-second quote TTL:
26 holdings on a 15-second cycle would be 104 scrapes a minute and a certain block, while 5 minutes
costs about 5 a minute alongside the existing concurrency limit and jitter. The UI keeps polling
every 15 seconds; it simply sees a price that changes every few minutes, `status.quote.source` reads
`google`, and `meta.warnings` says so in plain words.

With Yahoo blocked entirely, this returns real prices for 24 of 26 holdings — one better than Yahoo
manages, because Google accepts the numeric BSE codes that Yahoo rejects.

**Trade-off:** prices are up to five minutes old in this mode, and the whole portfolio then depends
on one scraper. It is a degraded mode, labelled as such, not the design target.

## 5. Real-time updates

Polling every 15 seconds is the baseline because the requirement is a 15-second refresh, not
sub-second streaming, and because Yahoo has no push feed — an SSE or WebSocket channel would still be
a 15-second poll on the server, with reconnect logic on top. `GET /api/portfolio/stream` exists as
the push variant for clients that want it.

The hook uses `setInterval`, with the details that matter: an `AbortController` per request; a tick
skipped entirely if the previous request is still in flight; polling paused when the tab is hidden
and an immediate refetch when it becomes visible; previous data kept on screen when a request fails,
with the error surfaced separately; every timer and listener cleaned up on unmount. The first
snapshot is fetched in a server component and passed in as initial data, so there is no loading flash
and no hydration mismatch.

## 6. Performance

The server computes every derived value — investment, portfolio %, present value, gain/loss, sector
subtotals, grand total — so there is one source of truth and the client only renders. For 26 holdings
the payload is a few KB.

On the client, `HoldingRow`, `SectorGroup`, `PriceCell`, `GainLossCell`, the mobile card and both
charts are memoised on stable `holding.id` keys, column definitions and grouped data are `useMemo`d,
and callbacks passed to memoised children are `useCallback`d, so a refresh re-renders the cells whose
numbers changed rather than the table. Charts load through `next/dynamic` with `ssr: false` and a
fixed-height placeholder, so they never block the table or shift the layout. Numbers are
right-aligned with `tabular-nums`, which keeps digits from jiggling as prices tick.

## 7. Error handling, at three levels

- **Per cell:** a missing value renders `—`; a stale or fallback value renders with an icon whose
  tooltip names the source and the reason.
- **Per provider:** Google failing falls through to Yahoo's `trailingPE`/`epsTrailingTwelveMonths`,
  then to the last cached value, then to null, and `meta.warnings` explains which happened in plain
  sentences ("Google Finance did not answer for 1 holdings. Showing Yahoo Finance fundamentals
  instead.").
- **Global:** an outage with cached data returns 200 with stale flags; an outage with nothing cached
  returns 503 `MARKET_DATA_UNAVAILABLE`. If the API disappears entirely, the dashboard keeps the last
  data on screen and shows a banner with a "Try again" action. `app/error.tsx` catches render errors.

## 8. Excel parsing quirks

The sheet has no sector column. Sectors are title rows — a row with a name in `Particulars` but no
serial number and no purchase price — so the importer tracks the current sector as it walks down and
stops at the grand-total row (no name, but an investment figure). Below that total sits a block of
sold positions with a `Sale price` column; those are excluded deliberately, since they are not part of
the live portfolio. Trailing spaces in sector names are trimmed and the redundant "Sector" suffix is
dropped, giving Financial, Tech, Consumer, Power, Pipe and Others. Column names live in one `COLUMNS`
object at the top of the script, and any row that fails to parse aborts the import with its row
number.

## 9. Design plan

**Layout concept:** an app shell, not a page — a dark brown rail on the left carrying the portfolio
value and section switcher, a sticky top bar with search and market status on the left, the pause and refresh
controls with an inline countdown ring in the middle, and a ticking clock in the right corner, and a work area of cards on a warm off-white canvas. Overview stacks four stat
tiles, the portfolio-value chart, best and worst performers and the two sector charts, with a
details rail on the right; the holdings table runs full width beneath them.

**Colour tokens** are derived from a four-colour "opal seashell" palette (`#3EBCB8` teal, `#B78BA5`
mauve, `#F4CCA9` peach, `#DBDBDB` grey). The raw swatches are too light to carry text — the teal is
2.3:1 on white, the peach 1.5:1 — so each role uses a step measured against its own surface:

| Role | Light | Dark | Contrast |
|---|---|---|---|
| Canvas / surface | `#f4f6f6` / `#ffffff` | `#101b1f` / `#16242a` | — |
| Ink | `#1f2a2e` | `#edf2f2` | 14.7 : 1 |
| Brand, rail accent | `#1f7f7c` | `#3ebcb8` | 4.8 / 6.9 : 1 |
| Rail | `#14312f` | `#0c1519` | 7.5 : 1 for its text |
| Gain | `#137333` | `#4ade80` | 6.0 / 9.1 : 1 |
| Loss | `#c0271d` | `#f87171` | 5.9 / 5.8 : 1 |
| Accent | `#8a5f2c` | `#f4cca9` | 5.6 / 10.7 : 1 |

Gain and loss stay the conventional green and red — a portfolio table is the wrong place to be
inventive, and a palette's decorative colours read as ornament rather than direction. The teal,
mauve and peach carry the interface instead, so the semantic colours never compete with them.

**The donut is a sequential ramp, not a categorical palette.** Six warm hues from one family cannot
be told apart: the validator put the worst adjacent pair at ΔE 4.9 for protanopia and 13.8 for
normal vision, well under the floors. Rather than invent cold hues the palette does not contain, the
sectors are sorted largest first and coloured with a single-hue teal ramp
(`#0a3a38`→`#79c2be` light, reversed for dark), which passes the ordinal checks in both modes:
lightness monotone, every adjacent gap ≥ 0.06, light end above the 2:1 contrast floor, hue spread
1°. Magnitude is the encoding, and the legend names every sector with its share and return.

**Type:** Amethysta, bold, for headings and the wordmark; Prompt (300–600) for everything else. Prompt has
no `tnum` feature — measured, eight `1`s render at 57px against 107px for eight `0`s — so
`tabular-nums` cannot hold the columns steady. Instead the holdings table is `table-fixed` with
percentage column widths summing to 100, which pins every column so a price tick can never reflow
the layout. Numbers are right-aligned inside those fixed cells.

**Company logos** come from a verified domain per holding (`apps/web/lib/logos.ts`). Google Finance
carries only news-source favicons, and Yahoo's profile endpoint is blocked from the deployed host, so
each domain was confirmed by fetching the site and matching its `<title>` to the company. The logo
itself loads from Google's favicon service, falls back to DuckDuckGo's when that 404s, and falls back
to a coloured initials tile when neither has one — 20 of 25 resolve today.

## 10. With more time

- Redis instead of an in-memory cache, so several API instances share one set of quotes and one
  circuit-breaker state.
- A paid market-data feed (or the NSE/BSE official feeds) as the primary source, with Yahoo and
  Google demoted to fallbacks. That removes most of section 2.
- WebSockets for genuine tick-level updates, with the 15-second poll kept as a fallback.
- Historical charts, XIRR and a per-holding drill-down.
- Authentication and multiple portfolios, which turns `holdings.json` into a real table.
- A nightly job that verifies each holding's resolved symbol and the Google parser against live
  pages, so a breakage shows up in CI rather than on the dashboard.
