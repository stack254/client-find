# Client Find

RetailHub PRO's local prospect workspace for businesses in Kenya, Botswana and Zambia needing websites, online stores and digital marketing. Search Google Places by business type and location, review evidence-based service suggestions, add businesses, track conversations, and prepare editable outreach drafts. No messages are sent automatically. No sample leads are represented as real prospects.

## Run

Requires Node.js 22 or newer. No third-party dependencies.

```sh
git clone https://github.com/stack254/client-find.git
cd client-find
npm start
```

The app listens on `127.0.0.1:3000`. Set `PORT` to change the port. Prospects persist in ignored `data/prospects.json`; back up this file or use Export JSON. This first version is for a single local user and process. Authentication, multi-user access, spreadsheet import, and numeric opportunity scoring are not implemented. Do not expose this server publicly without adding authentication and appropriate deployment protections.

## Zorin OS: laptop and phone

Install Git and Node.js 22.9 or newer (Node.js 24 LTS recommended), then run the commands above in Terminal. Check `node --version` before starting. No `npm install` is necessary.

Open `http://localhost:3000` on the laptop. To enable phone access, stop the app with Ctrl+C, then run:

```sh
HOST=0.0.0.0 npm start
```

Keep both devices on the same trusted Wi-Fi. Run `hostname -I` on the laptop and find its Wi-Fi IPv4 address (for example `192.168.1.20`). Open `http://192.168.1.20:3000` on the phone, substituting the actual address. Keep the terminal open and laptop awake. If it cannot connect, check Zorin's firewall and Wi-Fi client isolation. Allow port 3000 only from your trusted local network; do not forward it on your router. Anyone able to reach this app can read and edit prospects because it has no login yet. Clipboard copy may require manual selection on a phone over HTTP.

Create a local `.env` file for `GOOGLE_MAPS_API_KEY=your-key` if needed; `npm start` loads it automatically. `.env` is ignored by Git. You can also put `HOST=0.0.0.0` there to retain Wi-Fi access. Never share or commit the real key.

For future updates, stop the server, run `git pull --ff-only`, then `npm start` (or the Wi-Fi command). Your ignored `data/` folder stays local. Google discovery needs internet; manual prospect tracking does not.

## Discovery configuration

Set `GOOGLE_MAPS_API_KEY` securely in the server environment, enable Google Places API (New), enable billing, and permit HTTPS to `places.googleapis.com`. The key remains on the server and is sent in the `X-Goog-Api-Key` header. Never put it in frontend code or commit it. Restart after configuration changes. Each search makes one Text Search request, with up to 20 results; requested website/phone fields can affect pricing. Set provider budgets and quotas. Searches use the selected country as a regional bias, but results must be reviewed for the correct location.

Search results are transient until explicitly reviewed and saved. Missing website data is not proof of an absent website; retail category is not proof that an online store is needed. Google Maps Platform terms govern use and retention of returned data; review applicable terms before retaining provider content or operating a lead-generation workflow. This app does not verify emails, crawl websites, send messages, or guarantee sales.

Run `npm test` for provider-contract and opportunity-classification tests. Live discovery needs a configured key and has not yet been validated.

## Automatic opportunity runs

Choose a country and town, then click Find opportunities. The browser runs up to six sequential searches across accommodation, education, healthcare, tourism, beauty and restaurants. It deduplicates results by Google place ID and lists missing-website candidates first. Sector-specific booking/admissions/appointment suggestions require verification; websites are not crawled and demand is not inferred as fact. Stop ends the run after the current request; provider failures halt remaining requests and preserve partial results. Keep the page open. Results must be reviewed before saving. No scheduled searches or outreach sending occur.
