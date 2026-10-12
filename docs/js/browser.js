const Browser = (() => {
  const frame = document.getElementById("content-frame");
  const urlInput = document.getElementById("url-input");
  const goBtn = document.getElementById("go-btn");
  const backBtn = document.getElementById("back-btn");
  const forwardBtn = document.getElementById("forward-btn");
  const reloadBtn = document.getElementById("reload-btn");
  const statusText = document.getElementById("status-text");

  function init() {
    if (!frame || !urlInput || !goBtn) return;

    goBtn.addEventListener("click", navigate);
    urlInput.addEventListener("keypress", (event) => {
      if (event.key === "Enter") navigate();
    });

    backBtn.addEventListener("click", goBack);
    forwardBtn.addEventListener("click", goForward);
    reloadBtn.addEventListener("click", reload);

    document.addEventListener("tab-changed", loadActiveTab);
    loadActiveTab();
  }

  function normalizeUrl(input) {
    if (!input) return "";
    let value = input.trim();

    if (!/^https?:\/\//i.test(value)) {
      value = "https://" + value;
    }

    return value;
  }

  function navigate() {
    let url = normalizeUrl(urlInput.value);
    if (!url) return;

    const tab = Tabs.getActiveTab();
    if (!tab) return;

    urlInput.value = url;
    Tabs.updateTabUrl(tab.id, url);
    Tabs.addToHistory(tab.id, url);
    loadContent(url);
    updateNavButtons();
  }

  function goBack() {
    const tab = Tabs.getActiveTab();
    if (!tab) return;

    const url = Tabs.goBack(tab.id);
    if (url) {
      urlInput.value = url;
      loadContent(url);
      updateNavButtons();
    }
  }

  function goForward() {
    const tab = Tabs.getActiveTab();
    if (!tab) return;

    const url = Tabs.goForward(tab.id);
    if (url) {
      urlInput.value = url;
      loadContent(url);
      updateNavButtons();
    }
  }

  function reload() {
    const tab = Tabs.getActiveTab();
    if (tab && tab.url) {
      loadContent(tab.url);
    }
  }

  function loadActiveTab() {
    const tab = Tabs.getActiveTab();
    if (!tab) return;

    urlInput.value = tab.url || "";
    updateNavButtons();

    if (tab.url) {
      loadContent(tab.url);
    } else {
      frame.src = "about:blank";
    }
  }

  async function loadContent(url) {
    debug("Loading content", { url });

    setStatus("Loading...");
    frame.classList.add("loading");

    try {
      const response = await fetch(`${CONFIG.API_BASE_URL}/api/proxy`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${Auth.getToken()}`
        },
        body: JSON.stringify({ url })
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        throw new Error(errorBody.message || `HTTP ${response.status}`);
      }

      const data = await response.json();

      if (!data.content) {
        throw new Error("No content returned by proxy");
      }

      frame.srcdoc = wrapProxiedContent(data.content, url);

      const tab = Tabs.getActiveTab();
      if (tab) {
        Tabs.updateTabTitle(tab.id, data.title || "Untitled");
      }

      setStatus("Loaded");
    } catch (error) {
      console.error("Proxy load failed:", error);
      setStatus("Error");
      showError(error.message || "Unable to load the page.");
    } finally {
      frame.classList.remove("loading");
    }
  }

  function wrapProxiedContent(html, baseUrl) {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <base href="${escapeHtml(baseUrl)}">
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <style>
            body {
              font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
              line-height: 1.5;
              margin: 0;
              padding: 12px;
            }
          </style>
        </head>
        <body>
          ${html}
        </body>
      </html>
    `;
  }

  function showError(message) {
    frame.srcdoc = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8" />
          <style>
            body {
              margin: 0;
              min-height: 100vh;
              display: flex;
              align-items: center;
              justify-content: center;
              background: #f3f4f6;
              font-family: system-ui, -apple-system, sans-serif;
            }
            .panel {
              background: white;
              border-radius: 12px;
              box-shadow: 0 10px 30px rgba(0,0,0,0.08);
              padding: 32px 40px;
              text-align: center;
              max-width: 700px;
            }
            h1 {
              color: #b91c1c;
              margin-bottom: 10px;
            }
            p {
              color: #4b5563;
            }
          </style>
        </head>
        <body>
          <div class="panel">
            <h1>Page Load Failed</h1>
            <p>${escapeHtml(message)}</p>
          </div>
        </body>
      </html>
    `;
  }

  function setStatus(message) {
    if (statusText) {
      statusText.textContent = message;
    }
  }

  function updateNavButtons() {
    const tab = Tabs.getActiveTab();
    if (!tab) return;

    backBtn.disabled = !Tabs.canGoBack(tab.id);
    forwardBtn.disabled = !Tabs.canGoForward(tab.id);
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  return {
    init,
    loadActiveTab,
    navigate
  };
})();
