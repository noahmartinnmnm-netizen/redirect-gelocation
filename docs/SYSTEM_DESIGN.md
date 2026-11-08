# Country routing app — product and system design

This is the design for the app in this repository. It describes merchant features, storefront behavior, data ownership, and the edge cases the product must handle.

Names in this document are roles. They are not keys, endpoint paths, or theme-block handles. Those get chosen when each piece is built.

---

## 1. Product

The app sends a storefront visitor to the right market, store, or URL based on their country.

A merchant can:

1. Use Shopify Markets only.
2. Create custom country-to-URL rules. A destination can be another Shopify store, a Markets URL, a product, a collection, a landing page, or any external site.
3. Use both.

When a country is in a custom rule and in Shopify Markets, the custom rule wins, but only while the visitor is not already on that rule’s destination. If they are already on it, routing stops. It does not continue into a Markets switch.

Storefront delivery is four independent theme embeds. Redirection runs only when at least one of the first three is enabled. They can be combined.

| Embed | What the visitor sees |
| --- | --- |
| Confirmation popup | A designed popup. The visitor is sent onward only after they confirm. |
| Automatic redirect | Immediate redirect, with no popup. Known crawlers get a confirmation modal instead of a silent redirect. |
| Floating switcher | A persistent country and language switcher. It does not redirect on page load. |
| Country and IP blocker | A full-page overlay for selected countries, IPs, or IP ranges. This is separate from redirection. |

---

## 2. System

Three runtimes. One database for business data. Shopify holds the published snapshot the storefront can read without calling our API.

```
Shopify Admin (embedded app)
  |-- OAuth session in the app database (sessions only)
  |-- Billing gate: no active payment sends the merchant to Shopify pricing plans
  |-- Admin GraphQL: markets, shop metafields, theme settings, files, optional abandoned checkouts
  |
  +-- Our API
        rules, designs, country catalog
        database is the source of truth

Shopify storefront (theme app extension, target: body)
  |-- Reads the published shop snapshot
  |-- Detects country from a geo lookup service, with a second service as fallback
  |-- Sends the visitor by:
        custom rule URL, or Shopify’s localization form (country code + return path)
```

### Why there is a database

The geo API from the original product is not available. This app owns that layer.

| Data | Owner | Why |
| --- | --- | --- |
| OAuth sessions | App database | Required by the Shopify app library. Nothing else lives here. |
| Redirect rules | Our API database | Source of truth. Create, edit, delete, and country exclusivity are enforced here. |
| Country catalog | Our API database, seeded | Continents and ISO codes for admin pickers. Same list for rules and the blocker. |
| Popup design | Our API database | Source of truth for the editor. |
| Published storefront snapshot | Shop metafields, app-owned, storefront-readable | The theme extension reads these on every page. It does not call our API. |
| Embed on or off | Theme `config/settings_data.json` | Shopify theme state, not a row in our database. |
| Onboarding progress | Browser storage and a cookie | Per browser. Not server-side. |

A rule save that only writes the database does nothing on the storefront. After every successful rule change, the app publishes a country-to-URL map into the shop snapshot. The storefront reads that map.

### Who talks to Shopify

The embedded app is the only Shopify Admin API client.

- The browser never receives the Admin API access token.
- On an authenticated admin request, the app server talks to our API with the shop domain and a server credential.
- After our API commits a change, the app server writes the matching shop snapshot with the session it already holds.
- Our API stores no Shopify access token in the first version.

Support editing of another shop (section 6) changes rows in our database for that shop domain. The snapshot for that shop is published with that shop’s own session the next time that shop loads the app, unless a later version stores offline tokens for background publish. The logged-in shop’s snapshot is never overwritten with another shop’s data.

### Shop snapshot (published fields)

Declare every field in app config before the theme reads it. All of them are shop-owned. Storefront access is public read. Types:

| Role | Type | Written by |
| --- | --- | --- |
| Country destination map | JSON object, ISO code to absolute URL | App server, after rule create, edit, or delete |
| Popup design | JSON | App server, when the merchant saves a design |
| Markets routing switch | Single-line text | App server, from the home-page toggle |
| Blocked countries | JSON array of ISO codes | Blocker page |
| Blocked IPs | JSON array of strings | Blocker page |
| Blocked IP ranges | JSON array of strings | Blocker page |
| Whitelisted IPs | JSON array of strings | Settings and Blocker, same field, same validation |
| Whitelisted URLs | JSON array of strings | Settings |
| Inverted URL list | JSON array of strings | Settings |
| Preserve-relative base paths | JSON array of strings | Settings |

The markets switch is text, not JSON. The storefront treats an explicit off value as off. A missing value is treated as on, and the home page writes an explicit on value the first time it sees a missing field.

### Uninstall

The uninstall webhook deletes sessions for that shop. Snapshot fields and theme embeds remain until the merchant removes them. Rules and designs in our database are kept until a later retention job deletes them. Document that for the merchant.

---

## 3. Our API and database

### Tables

**shops**

- Shop domain, unique (`store.myshopify.com`)
- Created when the app first syncs the shop
- No access token column in v1

**redirect_rules**

- Id
- Shop
- Name (optional)
- Destination URL
- Timestamps

**rule_countries**

- Rule id
- ISO country code
- Country display name (denormalized for the table)
- Unique on `(shop, country code)` so one country belongs to one rule

**designs**

- Shop, unique (one saved design)
- Template id
- Content, style, preferences, image reference, custom CSS, custom HTML
- Updated time

**countries**

- ISO code, unique
- English name
- Continent
- Seeded. Not per shop.

### Operations

The app server calls these. The browser does not.

| Operation | Input | Result |
| --- | --- | --- |
| Sync shop | Shop domain | Shop row exists |
| List rules | Shop domain | Rules, plus the country catalog grouped by continent |
| Create rule | Shop domain, URL, optional name, country codes | Rule id. Rejects a country already used by another rule of that shop. |
| Update rule | Shop domain, rule id, URL, optional name, country codes | Replaces that rule’s countries. Empty country list is allowed. |
| Delete rule | Shop domain, rule id | Removes the rule and its countries |
| Read design | Shop domain | Saved design, or empty |
| Save design | Shop domain, design payload | Upserts the one design |

Create and update return the full compiled destination map for that shop: `{ "FR": "https://example.com/eu", "DE": "https://example.com/eu" }`. The app server writes that object into the country destination map. Keys are uppercase ISO codes. Values are absolute URLs.

Delete returns the map with that rule’s countries removed.

Country codes on write are an array of ISO codes. Country names in the admin table come from the catalog, not from a JSON string stored on the rule.

### Publish rule

1. API commits the database change.
2. API returns the compiled map (or the saved design).
3. App server writes the shop snapshot.
4. If the snapshot write fails, the API change remains, the response is an error, and the shop is marked dirty so the next load republishes. The merchant sees the failure.
5. A successful response means the database and the snapshot match.

### Admin authorization

Every mutating call uses the shop on the Shopify session. A client-supplied shop domain is ignored unless the session shop is the internal support shop (section 6).

---

## 4. Admin shell

Embedded app. Session storage is the app database. Billing uses Shopify managed pricing: if there is no active payment, every authenticated app page leaves the iframe for that store’s pricing plans page.

Navigation:

| Page | Role |
| --- | --- |
| Home | Rules, Markets switch, embed activation, onboarding |
| Blocker | Country, IP, and range block lists, plus whitelist IPs |
| Design | Popup template editor |
| Settings | URL whitelist, IP whitelist, inverted URL list, base paths |
| FAQ | Static help, search, accordion |
| Contact | Form that emails support and confirms to the merchant |

An analytics page can exist and stay unlinked until it is approved. It is checkout analytics, not routing analytics (section 11).

Webhooks: uninstall deletes sessions. Scope updates store the new scope string.

Access the app needs:

- Markets read, for the Markets card and country lists
- Themes read, for embed on/off
- Shop snapshot write, for every published field
- Files write, for popup header images
- Checkouts read, only if the analytics page is enabled

---

## 5. Home

### Load

1. Authenticate.
2. Read markets (first 50) and each market’s regions (first 50), plus the markets-routing field.
3. Read the main theme’s `settings_data.json` and detect the three redirect embeds.
4. If the markets-routing field is missing and the shop id exists, write the explicit on value.
5. Sync the shop to our API and load rules.

A markets query failure still renders the page, with an empty market list.

### Markets card

Markets are display-only. A button opens Shopify Admin Markets in a new tab.

The card is shown when either of these is true:

- More than one market
- One market whose country list contains more than one country

A shop with a single market and a single country does not see the card.

The table inside the card is shown only when the card is visible and the switch is on.

Switch values:

- On: explicit on token
- Off: explicit off token
- Missing, before the auto-write: treated as on

When the switch is off, automatic redirect ignores Shopify Markets and only follows custom rule URLs. The floating switcher hides countries that are not in the destination map.

Market status is shown as active only when the Admin API status is active.

The admin table can truncate at 50 markets and 50 regions. The storefront uses the theme’s real available-country list, which is not truncated by that query.

### Rules table

Columns: name, URL, countries, edit, delete.

URL display truncates around 40 characters, with a control that reveals the full URL. Countries show the first five, then a more-control. Empty state is a short “no rules” message.

Create validation:

- URL is required and must start with `http://` or `https://`. No further URL parsing.
- At least one country is required.
- Name is optional.
- Countries already used by another rule are absent from the picker.

Edit validation:

- Same URL rule.
- Countries may be cleared. An empty list removes those countries from the destination map.
- The current rule’s countries stay selectable. Other rules’ countries do not.
- A rule without an id cannot be saved. Our API always returns an id, so the UI never invents one.

Country picker:

- Search matches country name or continent name.
- Continents expand. Checking a continent selects every visible country in it.
- Click outside closes the list.
- A country with no continent sits in an “Other” group.

Delete asks for confirmation, then the app server deletes and republishes. The row disappears only after success.

Country exclusivity is by ISO code in the database. The picker also hides used countries by display name. A country name that itself contains a comma must be matched as a whole name, not split on comma-space.

### Activate redirection

Three rows, one per redirect embed. Each shows active or inactive, and a configure action.

A block is active when the current theme settings contain that embed and it is not disabled. Comment blocks in the JSON are stripped before parse. `current` may be an object or a preset name. Any parse failure shows all three inactive.

Configure opens the theme editor on that embed for the current theme.

The blocker page has its own theme-editor link for the blocker embed.

### Onboarding

Shown until the merchant finishes or dismisses it.

1. Explain that rules are destination URLs per country.
2. Create rules. If rules already exist, skip to step 3.
3. Enable an embed. Offer the three theme-editor links and a way to open the design editor.
4. Complete.

Progress is stored in the browser, keyed by shop. Dismiss hides onboarding for 15 minutes. Finish hides it for 7 days with a cookie that works inside the admin iframe (`SameSite=None; Secure`).

If rules disappear after the merchant had already finished, onboarding returns to step 1 and the finish cookie is cleared.

After step 4, the home page shows a short welcome. A merchant who dismisses before finishing does not see that welcome.

---

## 6. Internal support shop

If the session shop is the configured support shop:

- A “load store” card is shown.
- Input accepts a handle or a `*.myshopify.com` domain.
- Create, edit, delete, and design save then target that domain in our API.
- Reset returns to the support shop’s own rules.
- A banner names the store being edited.

Any other shop always uses its session shop. The server enforces this on every mutation, including delete.

A design save for another store writes that store’s design in our database and does not write the support shop’s popup-design snapshot.

This is privileged. The UI check is not the authorization. The API allows a foreign shop domain only when the caller is the support shop.

---

## 7. Design editor

Desktop editor. The page tells the merchant not to use a phone. The page includes a live preview.

### Nine templates, two jobs

Selector templates (country, language, and currency controls):

| Id | Layout |
| --- | --- |
| Selector A | Selectors and a header image. Default family for the first three selector layouts. |
| Selector B | Selectors and a header image |
| Selector C | Selectors only |
| Selector D | Selectors only. This is the default when nothing is saved. |

Confirm templates (go to the local destination, or stay):

| Id | Layout |
| --- | --- |
| Confirm A | Confirm or stay |
| Confirm B | Confirm or stay |
| Confirm C | Confirm or stay, with a world map |
| Confirm D | Confirm or stay, side image, two feature blurbs (each has a title, body, and show toggle) |
| Confirm E | Full-width bar pinned to the top of the viewport |

Only the saved template is live. The popup embed reads the published design. When that design has content and style, the theme-editor template picker is ignored. When the published design is empty, the embed uses Selector D.

### Editable fields

Content:

- Heading, message, primary button, secondary button
- Tokens for country name and flag. Adjacent pairs render as one inline flag plus name. Buttons are plain text, so a flag token in a button is removed. Some buttons can uppercase the country name.
- Confirm D feature titles and bodies, each with a show toggle

Style:

- Heading size
- Popup width, stored as a number that means rem. A stored value above 100 is a legacy pixel value and is divided by 10.
- Corner radius, glass effect
- Background, heading color, message color, button colors, dropdown colors
- Side image width from 25 to 70 where the template uses a side image

Preferences (booleans stored as `"true"` / `"false"`, or a number string):

| Field | Behavior |
| --- | --- |
| Close button | Shown by default on Confirm B, C, D, and E |
| Show languages | Language dropdown |
| Show language name | Endonym, otherwise the ISO code |
| Show currency symbol | |
| Show currency code | |
| Hide when already in this market | Hide if the visitor’s country is already in the current market |
| Hide when there is nowhere to send them | Hide if no rule and no other market applies |
| Preserve relative path | Default on for the popup. Automatic redirect has its own control, default off. |
| Cookie minutes | How long close and confirm hide the popup. Default 30. |
| Header image enabled | Selector A, Selector B, and Confirm D |
| Side image width | Templates that use it |

Also: custom CSS, custom HTML, header image.

Custom CSS and custom HTML are merchant-controlled and run on the storefront. Custom HTML may run scripts. That is an intentional merchant feature. The support shop must not be able to inject that into another store’s storefront without the publish rules in section 6.

Header image: staged upload, then file create, then poll up to 24 times every 500 ms for a CDN URL. A pasted CDN URL is accepted. A protocol-relative URL is prefixed with `https:`. If processing is still pending when polling ends, the UI shows the file error instead of a silent empty image.

### Load and save

Load order:

1. Read the published design snapshot.
2. Read the design from our API.
3. If the snapshot is in the current shape, a designs array, or a legacy flat object, the editor source is the snapshot. Otherwise if the API returned a design, the source is the API. Otherwise defaults.
4. The loaded design is merged onto the matching template in the local nine-template list.
5. A `template` query param opens that template in the editor. It does not publish it.

Legacy shapes the editor still reads:

- Current shape: template id, content, style, preferences, image, custom CSS, custom HTML
- Older flat field names
- A wrapper with a designs array and an active template id

Save writes one current-shape object, not the nine-template array, and adds an updated time.

The app server saves to our API and publishes the snapshot. Both must succeed before the merchant is told the design is live.

---

## 8. Settings

Four lists. Add is local until save. Delete confirms, then saves the remaining list immediately.

Shared URL pattern rules:

- A path starting with `/`, including `/` itself as a path pattern that still has to pass the other rules
- An absolute URL, or a host that is stored with `https://` added
- A trailing `*` is a prefix wildcard. It is stripped before URL parsing and means “this path and everything under it”.

### URL whitelist

Skips automatic redirect and hides the confirmation popup on matching pages. It does not affect the floating switcher or the blocker.

Matching:

- Compare host without `www`
- Ignore default ports 80 and 443
- A path-only pattern matches that path. A pattern ending in `/` also matches children.
- A host-only pattern (no slash) matches every path on that host
- `*` after a path is a prefix match
- If both URLs have query strings, every pattern query param must equal the current one. Extra current params are allowed.
- A pattern of only `*` matches every URL
- For absolute URLs, the hostname must match. A pattern for this store does not match the same path on another host.

### IP whitelist

One field, edited from Settings and from the Blocker page, with one validation function. Last save no longer means two different rules.

IPv4, each octet 0–255. The visitor IP detected on this page can be added even when it is IPv6, so the merchant can whitelist the address they actually have.

The page calls the geo lookup, shows IP and country, and offers copy and “add this IP”. If copy is unavailable, the address is placed in the text field.

Storefront behavior of a whitelisted IP (this is the product rule; the UI copy must say the same thing):

- Automatic redirect does not run
- The confirmation popup stays hidden
- The blocker allows the visitor and stops

### Inverted URL list

When the list is empty, automatic redirect is allowed everywhere, still subject to the normal URL whitelist and the other stop rules.

When the list has any entry, automatic redirect runs only on matching URLs. The popup is not gated by this list. The floating switcher is not gated by it.

### Preserve-relative base paths

A store whose public URL root is a folder (`https://shop.example/eu/...`) lists `/eu`. When preserve-relative-path is on, that folder is removed before the rest of the path is appended to the destination.

Normalization on save:

- Strip query and hash
- If the value looks like a URL, keep only the pathname
- Ensure a leading `/`, strip trailing slashes
- Reject empty, whitespace, and `/` itself

Multiple paths are allowed. The longest matching prefix wins. Locale root and base paths are stripped in a loop, so both `/eu/en-fr/products/x` and `/en-fr/eu/products/x` collapse. Matching is case-insensitive. The remainder keeps its original case.

Example: base `/eu`, visit `https://shop.example/eu/products/red-tshirt`, destination host `https://other.example` becomes `https://other.example/products/red-tshirt`.

---

## 9. Blocker admin

Four lists. Each has its own save. Unsaved rows exist only in the page until that save.

| List | Validation |
| --- | --- |
| Countries | Same continent picker as rules. Select-all and search. |
| IPs | Same IPv4 rules as Settings. Octets must be 0–255. |
| IP ranges | `a.b.c.d-a.b.c.d` or CIDR `a.b.c.d/nn` |
| Whitelist IPs | Same field as Settings. Removing one saves immediately. |

Countries come from our catalog. A saved code that is missing from the catalog stays in the snapshot but is absent from the picker until the catalog contains it. The next country save writes only the countries currently selected, so a hidden unknown code is dropped on that save.

Duplicate IPs and duplicate ranges are rejected.

Blocker appearance is configured in the theme editor, not in the app:

- Three visual styles
- Heading, message, background, overlay, text, accent
- Heading size 16–48 px
- Max width 300–800 px

VPN or proxy blocking is not part of this product.

---

## 10. Storefront

### 10.1 Country detection

Primary geo lookup returns at least a country code and, when it can, an IP. A second lookup is the fallback.

Automatic redirect uses primary, then fallback. If IP whitelist rules exist and the first response had no IP, it calls the fallback again for the IP only.

Confirm templates use the fallback lookup in their visibility check. The top bar template uses a small shared lookup helper. Selector templates use the country already on the page for the first paint. Rule URLs still apply when the visitor picks a country.

If detection fails and “hide when there is nowhere to send them” is on, confirm popups stay hidden. Otherwise they can still show, using the storefront country as the label fallback, unless a close or confirm cookie already exists.

A failed lookup never blocks the visitor (section 10.4).

### 10.2 Automatic redirect

Stop immediately when any of these is true:

1. The skip-redirect query flag is present
2. The theme editor is open
3. The current URL matches the URL whitelist
4. The inverted list is non-empty and the current URL is not on it
5. The “redirect only once” cooldown is active
6. An in-flight guard is set (prevents a double submit)

Then:

7. If the user agent matches the crawler list, and the agent is not a phone or a game-console browser that would be a false positive, compute the plan and do not navigate. Show a modal: continue to the local store, or stay. The visitor must confirm.
8. Otherwise compute the plan and navigate.

Plan, in order:

1. If the visitor IP is on the IP whitelist, do not redirect.
2. If there is no country, do not redirect.
3. If the destination map has a URL for that country:
   - If the visitor is not already on that destination, go there.
   - If they are already on it, stop. Do not fall through to Shopify Markets.
4. If the markets switch is off, stop.
5. If the detected country is in the current market’s country list, stop.
6. If the localization form’s current country equals the detected country, stop.
7. If the detected country exists in the available countries and differs from the current form country, submit the localization form with that country code.
8. Otherwise stop.

“Already on the rule destination” means the same host (`www` ignored) and either the target path is `/` or the current path equals or starts with the target path. A rule that points at another domain is never “already there”.

Custom-rule navigation:

- If preserve-relative-path is on, append the current path after stripping the locale root and the configured base paths.
- Copy every `utm_*` query param.
- Do not add the arrival marker on this hop. The popup adds it.

Market navigation submits Shopify’s localization form. The return path is forced to the current pathname plus search, so the path is kept even when preserve-relative-path is off. UTM params are added as hidden inputs.

The form is not visible. Its custom element name must not collide with the theme’s own localization form.

“Redirect only once”:

- Theme setting, default off. Cooldown default 60 minutes, minimum 1.
- A cookie and a local-storage key, both scoped by shop, store the timestamp.
- A non-numeric stored value counts as active, so an older boolean cookie still suppresses.
- A debug helper clears the guard and the cooldown.

Crawlers stay on the default market unless they confirm. The crawler check is broad (common bot, spider, and script clients). A browser whose agent string contains a bot token gets the modal too.

Custom HTML from the automatic-redirect embed is rendered, and its inline scripts run.

### 10.3 Confirmation popup

IP and URL checks run first:

- Theme editor: do not force-hide.
- URL whitelist: force the popup hidden, and keep it hidden if a later script tries to show it.
- If any IP is whitelisted, hide first, look up the visitor IP, and keep it hidden on match. If the lookup fails, release the hide and let the normal popup rules run.
- The inverted URL list does not hide the popup.

Then hide when any of these is true:

- The arrival-marker query is present. Selector templates also set the confirm cookie (30 minutes) and, on the first selector template, strip that query after 5 minutes.
- Confirm cookie is set
- Close cookie is set
- Selector-locale cookie is set (selector templates only)

Otherwise apply visibility:

- If “hide when there is nowhere to send them” is on:
  - No custom rule, and the visitor’s country is not in another market of this shop: hide.
  - A custom rule exists and the visitor is already on that URL: hide.
  - Otherwise show.
- If the country is in both a custom rule and a market, and the rule destination is not the current URL: show, even when “hide when already in this market” would have hidden it. The rule wins.
- If “hide when already in this market” is on and the visitor’s country is in the current market: hide.
- Otherwise show.

Confirm:

1. If the destination map has a URL for the chosen country, set the hide cookies and navigate to the built URL (preserve path when that preference is on, copy UTM, add the arrival marker).
2. Otherwise submit the localization form with the selected country and language. The return path is the arrival marker alone when preserve is off, and the current path plus search plus the arrival marker when preserve is on.

Close sets the close cookie for the configured minutes.

Selector templates insert rule countries into the dropdown from the destination map and hide the duplicate market row for that code, so a country appears once. If the markets switch is off, market rows that are not in the destination map are hidden.

The top-bar template pins itself to the viewport. In the theme editor it stays visible. On the live store it uses the same hide rules as the other confirm templates.

In the theme editor, the popup embed can be set to render nothing.

Flag images use Shopify’s country flag files. Two territories whose flags are missing there use a bundled image.

Custom HTML is injected into a host node. Inline scripts are re-run inside a fresh function so block-scoped declarations can run again. External script tags are not recreated.

### 10.4 Blocker

On load, read the four published lists and call the geo lookup.

Order:

1. IP in the whitelist: allow, and stop. This includes visitors who would have been country-blocked.
2. Country code in the blocked list (case-insensitive), or IP in the blocked IP list, or IP inside a blocked range: show the overlay.
3. Otherwise allow.

Range check:

- Dash range: inclusive integer comparison of IPv4
- CIDR: bitwise mask. Validate the mask on save (0–32) so a bad mask cannot be stored.

The overlay is forced visible, and a mutation observer restores it if something else hides it. In the theme editor the observer is less aggressive. Body scroll is locked while the overlay is up.

A failed geo lookup does not block. Fail open.

### 10.5 Floating switcher

This is a switcher. It does not redirect on load.

- Position: bottom left, bottom right, top left, top right
- Optional: country selector, search, language selector, language name versus code, country code, country name, currency symbol, currency code
- Colors for the pill, dropdown, font, and hover. White, transparent, and 8-digit hex white or black are forced to transparent.
- Market country links are Shopify localization links that include the arrival marker
- Language choice sets the language and submits the localization form
- Countries that exist only in the destination map are inserted into the dropdown and sorted with a locale collator. Choosing one goes to the rule URL, with the arrival marker, and does not preserve the relative path.
- If a market country is also a rule country, the link is rewritten to the rule URL
- When markets routing is off, links whose country is not in the destination map are hidden
- Close hides the widget for the session
- A click outside closes the menus

### 10.6 Cookies and query flags

| Signal | Meaning |
| --- | --- |
| Close cookie | Hide the popup for the configured minutes |
| Confirm cookie | Hide the popup after the visitor accepted a redirect, or arrived with the marker |
| Selector confirm cookie | Hide selector popups for 30 minutes after confirm |
| Once-cookie and matching local storage | Automatic-redirect cooldown, scoped by shop |
| Skip-redirect query | Skip automatic redirect on this request only |
| Arrival-marker query | The visitor was just sent here. Hide the popup. It is not a secret. |

Cookies use `path=/`. The once-cookie sets `SameSite=Lax` and `Secure` on HTTPS. Popup cookies are host-only. Cross-subdomain markets do not share them.

---

## 11. FAQ, contact, analytics

### FAQ

Static content, client-side search, accordion. Categories follow the product: getting started, Markets and rules, popup / automatic redirect / floating switcher, design editor, testing, blocker, settings, support. The contact link goes to the contact page. IP-whitelist answers must match section 8.

### Contact

Prefill from the shop email when Shopify provides one. The merchant can still type an email. Name, email, message, and shop domain are required. Email must contain a local part, an `@`, and a dot in the domain.

Two messages:

- To the support inbox, reply-to the merchant
- Confirmation to the merchant

HTML in the message is escaped. On failure, keep the field values and show the error. Clear the form only after a successful send.

### Analytics

Optional and unlinked until Shopify approves abandoned-checkout access. If access is denied, show a clear unavailable state. Do not substitute demo numbers.

When access exists, the page may show:

- A count of abandoned checkouts, labeled approximate when Shopify says the count is not exact
- From a sample of 50: sum of totals for rows that are not completed, recovery rate as completed divided by sample size, top 5 product titles by line-item occurrence, country breakdown from the shipping address with missing country as “Other”

The headline count and the sample are different numbers. The page must say so. This is checkout analytics, not geo-routing analytics.

Visitor action logging is out of scope until a routing-analytics design exists.

---

## 12. Edge cases

These are acceptance tests.

### Rules and Markets

- No rules, markets on, visitor country is in another market: automatic redirect submits the localization form. The popup shows unless “hide when nowhere to send” is on and that country is in no market.
- No rules, markets off: no automatic redirect. The floating switcher hides non-rule countries and can render empty.
- Rule exists, visitor is not on that URL: the rule wins over Markets, even if the country is also in the current market.
- Rule exists, visitor is already on that host and path: do not redirect, and do not fall through to a market redirect.
- Rule URL is another domain: “already there” is false, so every page load can redirect again unless the once-cooldown or a popup cookie stops it.
- Rule URL path is `/`: any page on that same host counts as already there.
- The same country on two rules: the picker hides it, and the API rejects it. The published map has one URL per country code. If a bad payload ever contains a duplicate key, the later value wins and should be treated as a bug, not as a feature.
- Create always returns an id. Edit and delete use that id.
- Edit with zero countries: allowed. Those countries disappear from the map.
- URL without `http://` or `https://`: rejected. `http://` is allowed. Whitespace-only fails. A value that is only `https://` passes the client check; the API may still store it. Treat a URL with no host as invalid on the server.
- Markets admin query is capped at 50. The storefront uses the theme’s full country list.

### Whitelists

- URL whitelist skips automatic redirect and force-hides the popup. It does not stop the floating switcher. It does not stop the blocker.
- IP whitelist skips automatic redirect, force-hides the popup, and skips the blocker.
- Settings copy says that same IP behavior.
- Popup IP lookup failure: the forced hide is released and the popup can show.
- Automatic-redirect IP lookup failure: no IP means the IP whitelist does not match, so a redirect can still run.
- Blocker lookup failure: fail open. The visitor is not blocked.
- Inverted URL list empty: automatic redirect is allowed, still subject to the normal whitelist.
- Inverted URL list non-empty: automatic redirect only on matches. Popup unchanged.
- `*` alone matches every URL.
- A host-only pattern matches every path on that host.
- A pattern with a query string requires those params. The path `*` does not apply to the query.
- `www` is ignored. Default ports are ignored.
- Settings and Blocker edit one IP whitelist with one validator.
- IPv6 is not an IPv4 range. Range math is IPv4 only. An IPv6 does not match a range and must not throw.
- A detected IPv6 can be stored from the Settings “add this IP” action.

### Paths

- Preserve relative path off (automatic redirect default): the external rule URL is used as-is, plus UTM. The market form still sends the current path as the return path.
- Preserve relative path on (popup default): strip the locale root, then the longest configured base path, repeat, then join onto the target path.
- Base path `/` is rejected and never stored.
- Base-path matching is case-insensitive. The stripped remainder keeps its original case.
- Query and hash on a base-path entry are discarded.
- UTM params are copied onto custom-rule URLs. Other params are not, except the market return path keeps the full current search string.
- Popup and floating-switcher rule hops add the arrival marker. That query hides the popup on the destination. Selector template A removes the param after 5 minutes.
- The skip-redirect query skips automatic redirect only.

### Cookies and repeat visits

- Close and confirm suppress the popup for the configured minutes. Default 30. A test needs a private window or cleared cookies.
- “Redirect only once” uses both cookie and local storage. Either one is enough to suppress.
- Cookies are not shared across domains. A redirect to another store can show the popup again there.
- The arrival marker means “we already sent them”. It is not a secret.

### Bots, editor, preview

- Crawlers do not silent-redirect. They get a yes/no modal. If they never confirm, they stay.
- The bot check is wide. An in-app browser with a bot token in the agent string gets the modal.
- Theme editor: automatic redirect does not run. The popup can be hidden with the embed setting. The top-bar template stays visible in the editor.
- Design mode does not stop the blocker from displaying when the visitor matches. The observer is less aggressive there.

### Auth, billing, support shop

- No active payment: every app page leaves the iframe for pricing plans.
- The Admin API token stays on the app server. It is not sent to the browser, not sent to our API in v1, and not written to logs.
- A failed sync to our API is visible. The rules table does not pretend the shop has zero rules.
- The support shop can edit another store’s rules and designs in our database. Snapshot publish for that other store does not write the support shop’s fields.
- Uninstall deletes sessions only.

### Markets and localization

- A primary market with a single country hides the Markets card.
- A market is shown as active only when its status is active.
- A country that exists in both the market list and the destination map appears once in the popup list, as the rule destination.
- The floating switcher overwrites the market link with the rule URL when both exist.

### Design editor

- Width stored above 100 is legacy pixels and is divided by 10.
- Glass effect, custom CSS, and custom HTML run on the storefront.
- A failed database save does not publish. A failed snapshot write is an error and leaves the shop dirty for retry.
- An empty published design falls back to Selector D.
- A flag token in a button is removed.
- Header-image polling surfaces a timeout or file error.

### Blocker

- Fail open on lookup error.
- Whitelist beats block.
- The overlay is restored if later style changes hide it.
- Visual design and copy are theme-editor settings.

### Contact and analytics

- Contact keeps field values when send fails.
- Analytics stays hidden until checkout access is approved.
- Analytics sample size is 50. A separate count can be larger and must be labeled as a different number.

---

## 13. Build order

1. App shell: embedded app, session storage, billing gate, uninstall webhook.
2. Declare every shop snapshot field with storefront read.
3. Our API and database: shop sync, country catalog, rules, compiled destination map.
4. App server publishes that map after each rule change.
5. Theme extension: four body embeds, plus shared modules for country lookup, whitelist matching, preserve-relative URL building, and the rule-versus-market decision.
6. Home: markets switch, rules table, country exclusivity, embed status, onboarding.
7. Design editor: nine templates, preview, save to the database and the snapshot together.
8. Settings and blocker, sharing one IP whitelist and one storefront behavior.
9. FAQ, contact, then analytics if checkout access exists.

---

## 14. Out of scope

These belonged to the original product’s marketing or to dead code. They are not features of this app:

- Third-party chat widgets and cross-sell of other apps
- A debug panel that prints the session
- Console branding on the storefront
- Visitor-action logging
- A currency converter with no embed
- VPN or proxy blocking
- Checkout analytics presented as if it measured redirects
