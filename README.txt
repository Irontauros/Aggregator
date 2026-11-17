@'
# Aggregator

A self-hosted video aggregator web app built with Node.js, Express and SQLite. Paste a link and it reads the page's title and thumbnail, stores the image locally, and files the video by category, actor, network, studio or series. It runs on your own PC and can be opened from a phone through a Cloudflare tunnel.

## Features

**Browsing and search**
- Card grid with an A to Z letter filter and a random-pick button
- Search by title, with prefixes: `#` for a category, `@` for an actor, `&` for a network, studio or series
- Six sort orders (Recent, Oldest, A to Z, Z to A, Top Rated, Lowest Rated); the choice is remembered per page
- Browse by category, actor, network, studio or series, each with a details page
- Separate sections for features (full-length films), shorts, celebrities and websites
- Incomplete page that collects items still missing data, kept out of the main view
- Theme filter and a site-wide accent colour that follows the chosen theme

**Adding and organising**
- Add one video or many at once (bulk mode), plus a feature mode on the same page
- Bulk add for networks, studios and series
- Live status while a pasted link is being read (loading, found, failed)
- Actor autocomplete that creates missing actors automatically
- Half-star ratings from 0 to 5
- Drafts autosave in the browser, so a half-filled form survives a reload
- Duplicate titles and links are refused with a clear message

**Images**
- Thumbnails are downloaded and stored locally, so links never break when the source changes
- Files are accepted only if both the content type and the file signature say it is an image
- If a download fails, the video is still saved without a thumbnail and shows up on the Incomplete page
- Deleting or replacing an item removes the old image only when nothing else uses it

## Tech stack

| Area | What is used |
| --- | --- |
| Backend | Node.js, Express, one router per content type |
| Data | SQLite through better-sqlite3 (transactions, automatic backups) |
| Frontend | Plain HTML, CSS and JavaScript, with shared components that communicate through browser events |
| Scraping | Open Graph, Twitter card and JSON-LD metadata, HTML parsing |
| Remote access | Cloudflare quick tunnel (cloudflared) with a QR code |

## How it works

- **Routes** (`Routes/`) handle list, add, edit and delete for each content type, with validation and duplicate checks. Shared logic (ids, name formatting, sorting, image cleanup) lives in `Extras/helpers.js`.
- **Storage layer** (`Extras/db.js`) wraps SQLite. Each save is one transaction, and sorting runs inside the same request. A backup is made on the first start of each day, and a safety backup is taken before any list shrinks by more than half.
- **Scraper** (`Extras/scrapeMetadata.js`) tries image candidates in a fixed order and applies timeouts, so one slow site cannot hang the app. `Extras/downloadImages.js` validates and saves the image.
- **Frontend components** (`Components/`) do not call each other. They announce changes with browser events (letter, sort, search, theme), and each page listens for the ones it needs.
- **Private paths** (data, code and backups) are blocked by middleware before the static file server.

## Getting started

Requirements: [Node.js](https://nodejs.org/) and [cloudflared](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/) (only needed for phone access).

```
git clone https://github.com/Irontauros/Aggregator.git
cd Aggregator
npm install
npm start
```

`npm start` runs the server and the tunnel together. The console prints the local address, the public tunnel address and a QR code, so a phone can open the site by scanning it. The public address changes every time the tunnel restarts.

The repository does not include the `data/` folder (database and backups) or the downloaded images.

## Maintenance scripts

Run on demand from `Extras/`:

- `checkImages.js` checks every image path in the data against the files on disk
- `sortAll.js` sorts lists and repairs ids
- `exportJson.js` writes the whole database out as JSON
- `migrateToSqlite.js` moves data from the older JSON files into SQLite

## Project structure

```
server.js        Express server, router mounting, tunnel start-up
Routes/          One router per content type
Extras/          Database layer, helpers, scraper, image download, maintenance scripts
Components/      Shared header, search bar, add and edit modals
css/             Shared stylesheets
Main/, Actors/, Categories/, Features/, Shorts/, Celebrities/, Websites/,
Incomplete/, Details/, Entity/, addVideo/    One folder per page
```

## Limitations

- Built for a single trusted user: no accounts, no automated tests, no permanent hosting.
- Only one copy of the project should be used at a time, since there is no merge between two databases.

## Notes

Built and tested by me, with Claude used as a coding assistant.

## License

See [LICENSE.txt](LICENSE.txt).
'@
