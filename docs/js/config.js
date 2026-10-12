const CONFIG = {
  API_BASE_URL: "https://your-worker-name.your-account.workers.dev",
  STORAGE_KEYS: {
    AUTH_TOKEN: "proxy_browser_auth_token",
    USERNAME: "proxy_browser_username",
    TABS: "proxy_browser_tabs"
  },
  TAB_DEFAULTS: {
    MAX_TABS: 20,
    TITLE: "New Tab",
    URL: ""
  },
  REQUEST_TIMEOUT: 30000,
  DEBUG: false
};

function debug(message, data) {
  if (CONFIG.DEBUG) {
    console.log(`[DEBUG] ${message}`, data || "");
  }
}
