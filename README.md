# FAU Owl Weather

A weather app styled with FAU colors. It opens on Boca Raton and uses the free [Open-Meteo](https://open-meteo.com/) APIs, which don't need an API key.

- Current conditions, the next 24 hours, and a 7-day forecast (°F, mph)
- City search through the Open-Meteo Geocoding API
- Remembers the last city you picked (localStorage)
- Plain HTML/CSS/JS: no build step and no dependencies

## Files

```
netlify.toml          Netlify config (publish dir = public, no build)
public/index.html
public/styles.css
public/app.js
public/assets/        favicon.svg, fau-logo.png
```

## Run locally

```
npx serve public
# or
python3 -m http.server -d public 8000
```

## Deploy to Netlify

**Option A: Git (auto-deploys on every push)**
1. Netlify → Add new site → Import an existing project → GitHub → pick this repo.
2. Branch: whichever branch you want live. `netlify.toml` fills in the rest (publish directory `public`, no build command).
3. Deploy.

**Option B: Drag and drop**
Go to https://app.netlify.com/drop and drop the `public` folder onto the page.

**Option C: CLI**
```
npm i -g netlify-cli
netlify deploy --prod --dir=public
```

Open-Meteo's free tier is for non-commercial use and is limited to about 10,000 calls a day.
