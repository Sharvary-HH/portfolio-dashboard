# What went wrong, and what I did about it

This is the long version of the technical notes. The short version lives in
[TECHNICAL_NOTES.md](../TECHNICAL_NOTES.md); this one is the story of the build, including the
parts where my first attempt was wrong.

## Neither data source is really an API

Yahoo Finance and Google Finance both shut their public APIs years ago. What is left is the
traffic their own web pages make, and two ways of tapping into it: the `yahoo-finance2` package,
which reverse-engineers Yahoo's internal endpoints and handles the cookie-and-crumb dance they
require, and plain HTML scraping for Google.

The first thing I hit was that `yahoo-finance2` had moved to v4 while I was reading v2 docs. The
constructor changed (`new YahooFinance()` instead of a default export), and the package declares
Node 22 as its minimum while my machine runs 20. It prints a warning on every start but works, so I
kept Node 20 as the floor and said so in the README rather than pretending the warning isn't there.

## The spreadsheet did not have a sector column

The brief said holdings were grouped by sector. I assumed that meant a column. It didn't. The sheet
has sector *title rows*: a row with "Financial Sector" in the name column and nothing else, then the
holdings below it, then another title row. There is also a grand total row at the bottom, and below
*that* a separate block of sold positions with a "Sale price" column that has nothing to do with the
live portfolio.

So the importer walks down the sheet keeping track of the current sector. A row with a name but no
serial number and no price is a heading. A row with no name but an investment figure is the grand
total, and that is where it stops, which keeps the sold block out. I trimmed trailing spaces from
"Consumer " and dropped the redundant "Sector" suffix. The column names live in one object at the top
so they can be changed without reading the parser.

The NSE/BSE column was the other surprise: it mixes ticker symbols like `HDFCBANK` with numeric BSE
codes like `532174`. Detecting the exchange is easy — all digits means BSE — but it set up the
biggest problem in the whole project.

## Yahoo will not quote most BSE codes

Mapping `532174` to `532174.BO` is what every guide says to do. When I ran it against all 26
holdings, seven came back with prices. Nineteen were simply absent from Yahoo's response. Not an
error, not a null, just missing, and the library returns `undefined` rather than throwing.

I tried the search endpoint by hand. Searching "ICICI Bank" returned `ICICIBANK.NS` and
`ICICIBANK.BO`, both quotable. So the fix was a second pass: fetch everything with the mapped
symbols, then for any holding that came back empty, search Yahoo by company name, take the first
NSE-listed equity, and cache that mapping for a day.

My first version of this was broken in two ways, and both showed up only against live data.

First, I appended the exchange to the search query — "ICICI Bank BSE" — thinking it would help.
Yahoo's search returned nothing for most of those. Just the company name works fine.

Second, one holding came back with a price of ₹10,603,328,500. Fine Organic Industries trades around
₹5,000. Yahoo does have a `541557.BO`, it just isn't the share; it looks like a bond or some other
instrument sharing the code. That one row took the portfolio's present value to ₹1.7 trillion. I
added a plausibility check: any price more than 25× above or below the purchase price is treated as
a wrong match, dropped, and the holding goes back through search. That guard now applies to the
direct lookup too, not only to search results, because the direct lookup is exactly where the bad
number came from.

There was a third, quieter bug. When a search found nothing I cached `null` for 24 hours, so the
dashboard would never try again. But "nothing" was often a transient 429 from Yahoo, not a real
absence. So there are now two kinds of miss: a search that genuinely found no match gets a 15-minute
cooldown and the holding keeps its original symbol, while a holding whose direct symbol returned an
implausible price and has no better match gets dropped for the day so it can't show garbage.

That took live coverage from 7 of 26 to 22 of 26. The other four are thinly traded names Yahoo's
search doesn't return.

## Google's HTML is deliberately unreadable

Every class name on a Google Finance quote page is an obfuscated token like `SwQK7` or `dO6ijd`, and
they rotate between builds. Writing `$('.dO6ijd')` would work for about a week.

Instead the parser never looks at a class. It walks every leaf element once and builds a map from
visible label text to the text of its sibling: `"P/E ratio" → "13.97"`, `"EPS" → "₹51.21"`. The
quarterly earnings come from the one table on the page that contains a "Net income" row; the header
row gives the period labels and the parser takes the rightmost column that has an actual number, so a
quarter Google hasn't filled in yet doesn't blank the cell.

I saved two real pages, one NSE and one BSE, as fixtures and wrote the parser against them, plus a
hand-made page with dashes for every value and a cookie-consent interstitial. Google serves that
consent page to some regions and to most cloud IPs; the parser detects it by the absence of any key
stat labels plus the consent markers, and the provider treats it as a failure rather than a page full
of nulls.

The one place I compromised: the fixtures are 1.1 MB each of real HTML. It felt wasteful, but a
synthetic fixture would test my assumptions about the page rather than the page.

## Keeping the poll cheap

A 15-second poll with 26 holdings and two scraped sources could easily be 200 outbound requests a
minute. Steady state is one. Quotes are cached for 15 seconds because prices move constantly.
Fundamentals are cached for six hours because P/E and quarterly earnings don't change between polls.
So a refresh costs one batched Yahoo call and zero Google calls until the six hours are up.

Around that sit the usual defences, each of which earned its place at some point during the build: a
cache that hands concurrent callers the same in-flight promise; retry with exponential backoff and
jitter that honours `Retry-After`; a per-provider circuit breaker that opens after five failures and
serves cache for a minute; and stale-while-error, so a failed refresh returns the last good value
flagged as stale rather than a blank table. Google scrapes go through a concurrency limit of two with
a random pause between them, so a cold start looks like a person browsing.

## Deploying it broke twice, and the second time was interesting

The first Render deploy failed at build. I had set `NODE_ENV=production` in the blueprint, and npm
respects that by skipping devDependencies. TypeScript is a devDependency. `tsc: not found`. I
reproduced it by cloning the repo fresh and running Render's exact commands with that variable set,
which is how I knew the fix — `--include=dev` on the install — actually worked before pushing it.

The second failure was the real one. The API deployed, answered `/api/health`, and then returned
`MARKET_DATA_UNAVAILABLE` for the portfolio: `Failed to get crumb, status 429`. Yahoo rate-limits
Render's IP range at the very first step, permanently. Three retries over a minute, same answer.
Google, from the same host, was fine.

I had written in the technical notes that cloud IPs would be blocked more aggressively than a laptop.
It is a different thing to watch it happen on your own deployment. The options were to ship the demo
in mock mode, or to make the fallback chain genuinely handle it.

The Google Finance page has the live price on it. I was already fetching that page for fundamentals.
So the parser now also returns `price`, `dayChangePercent` and `currency`, and when Yahoo fails the
quote service reads prices from Google instead, on a five-minute TTL rather than fifteen seconds —
26 holdings on a 15-second cycle would be 104 scrapes a minute and a certain block; five minutes is
about five a minute. The dashboard still polls every 15 seconds, the price just moves every few
minutes, and the warnings banner says exactly that.

With Yahoo blocked completely, this prices 24 of 26 holdings. That is *better* than Yahoo managed
when it was working, because Google accepts the numeric BSE codes Yahoo rejects.

Finding the price on the page without class names was its own puzzle. The answer was structural: the
live price is the first standalone currency amount inside `<main>` whose parent element contains
nothing but that amount. Key stats like `Open ₹717.50` have a label in the same parent, so they fail
that test. The day change comes from the text immediately after the price in its container.

## The 650% day change

That last part had a bug. In production, Savani Financials showed a day change of +650%. The page
itself said +1.98%. My parser walked up to five ancestors looking for a percentage and, in whatever
layout Google served to Render, grabbed an unrelated one.

The fix was to only read the 60 characters of text following the price within each ancestor, and to
reject any day change above 100%, since no equity moves that much in a session. I added a fixture
that plants a stray "+650%" near a price block to make sure it stays fixed. A wrong number in a
portfolio table is worse than no number, so this class of guard is worth the few lines.

## The front end fought me in smaller ways

**React Compiler lint rules.** Next 16 ships with rules that flag `setState` called synchronously
inside an effect. My "am I mounted yet" pattern for the theme toggle, and the initial fetch in the
polling hook, both tripped it. The mounted flag became a `useSyncExternalStore` with a server snapshot
of `false` and a client snapshot of `true`, which is the idiomatic way to do it and has no effect at
all. The initial fetch moved into a promise chain so every state update happens in a callback.

**Hydration mismatches.** Two of them. The first was me initialising "last updated" to `new Date()`,
which the server and client evaluate at different moments; it now comes from the `generatedAt`
timestamp in the payload. The second was the theme toggle's `aria-label` branching on the theme before
mount. Both showed up as the dev overlay's "1 Issue" badge, which I have learned to treat as a real
bug rather than noise.

**The table got clipped.** When I moved to a two-column layout with a details panel on the right, the
eleven-column table lost its last three columns to horizontal scroll inside the card. The holdings
table now spans the full width below the charts, which is also how the reference dashboards do it.

**Prompt has no tabular figures.** The font I was asked to use is lovely, but I measured its digits:
eight `1`s render at 57 px against 107 px for eight `0`s. `font-variant-numeric: tabular-nums` does
nothing when the font lacks the feature, so a price ticking from 711 to 700 would have reflowed the
whole table. I gave the table fixed layout with percentage widths that sum to exactly 100, so columns
are pinned regardless of what the digits do. My first attempt used the existing rem widths, which
summed to more than the container and made two columns overlap; percentages fixed it.

## Colour is a measurement, not a taste

Every palette I was given was too light to carry text. The sage green from one was 2.3:1 on white,
the peach from another 1.5:1. I stopped eyeballing and computed WCAG contrast for every token
against its actual surface, in both themes, and picked steps from the same hue family that clear
4.5:1. Those numbers are in the technical notes as a table.

The sector donut taught me something. Six warm hues from one palette cannot be told apart: the
colour-blindness check put the worst adjacent pair at ΔE 4.9 for protanopia and 13.8 for normal
vision, both under the floor. Rather than invent cold hues the palette didn't contain, the donut is
now a single-hue sequential ramp with sectors sorted largest first. Magnitude is the encoding, the
legend names everything, and the ramp passes the ordinal checks: monotone lightness, every gap at
least 0.06, light end above 2:1.

Gains and losses stayed classic green and red throughout. I tried the palette's own colours for them
once and it was wrong; a portfolio table is not the place to be clever with that.

## Logos, honestly

Google Finance pages carry only news-source favicons, and Yahoo's company profile endpoint is blocked
from the deployed host, so there was no automatic way to get a company logo. I mapped each holding to
its official domain and then verified every one by fetching the site and matching its `<title>` to
the company — `astralpipes.com` really does say "Astral Pipes". The logo itself loads from Google's
favicon service, falls back to DuckDuckGo's when that 404s, and falls back to a coloured initials
tile when neither has one. Twenty of twenty-five resolve. Savani Financials has no reachable site at
all, so it keeps its initials, and I would rather that than a guessed domain and someone else's logo.

## What the data cannot tell you

The purchase prices in the sheet are historical. HDFC Bank at ₹1,490 is from before its split; it
trades near ₹715 now, so the dashboard shows a 52% loss that isn't real. The arithmetic is right and
the input is stale. I noted it in the README rather than "correcting" the sheet, because that is the
owner's data, not mine to change.

The portfolio-value chart only covers the time since the API last started. Neither source gives
historical series for free, so the server keeps a ring buffer of the last 240 readings and the chart
labels itself with how many it has. I would rather show twelve honest points than a fabricated
month.

## If I had another week

Redis for the cache so several API instances agree; a paid data feed as the primary with Yahoo and
Google demoted to fallbacks, which removes most of this document; WebSockets for real tick updates;
and a nightly check that fetches each holding's live Google page and runs the parser against it, so a
markup change shows up in CI instead of on the dashboard.
