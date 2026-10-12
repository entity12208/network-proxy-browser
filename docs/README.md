# Frontend - GitHub Pages

This folder contains the static browser frontend.

## Files
- `index.html`
- `css/style.css`
- `js/config.js`
- `js/auth.js`
- `js/tabs.js`
- `js/browser.js`
- `js/app.js`

## Configuration
Edit `docs/js/config.js` and set your Cloudflare Worker URL:

```javascript
const CONFIG = {
  API_BASE_URL: "https://your-worker-name.your-account.workers.dev",
  // ...
};
