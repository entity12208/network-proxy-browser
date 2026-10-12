const Tabs = (() => {
  let tabs = [];
  let activeTabId = null;

  function init() {
    loadTabs();
    renderTabs();

    const newTabBtn = document.getElementById("new-tab-btn");
    if (newTabBtn) {
      newTabBtn.addEventListener("click", addTab);
    }
  }

  function addTab() {
    if (tabs.length >= CONFIG.TAB_DEFAULTS.MAX_TABS) {
      alert(`Maximum ${CONFIG.TAB_DEFAULTS.MAX_TABS} tabs allowed`);
      return;
    }

    const tab = {
      id: Date.now().toString(),
      title: CONFIG.TAB_DEFAULTS.TITLE,
      url: CONFIG.TAB_DEFAULTS.URL,
      history: [],
      historyIndex: -1
    };

    tabs.push(tab);
    setActiveTab(tab.id);
    saveTabs();
    renderTabs();
  }

  function closeTab(tabId) {
    const index = tabs.findIndex((tab) => tab.id === tabId);
    if (index === -1) return;

    tabs.splice(index, 1);

    if (activeTabId === tabId) {
      if (tabs.length > 0) {
        setActiveTab(tabs[Math.max(0, index - 1)].id);
      } else {
        addTab();
      }
    }

    saveTabs();
    renderTabs();
  }

  function setActiveTab(tabId) {
    const exists = tabs.some((tab) => tab.id === tabId);
    if (!exists) return;

    activeTabId = tabId;
    renderTabs();
    document.dispatchEvent(new CustomEvent("tab-changed"));
  }

  function getActiveTab() {
    return tabs.find((tab) => tab.id === activeTabId);
  }

  function updateTabTitle(tabId, title) {
    const tab = tabs.find((item) => item.id === tabId);
    if (tab) {
      tab.title = title || CONFIG.TAB_DEFAULTS.TITLE;
      saveTabs();
      renderTabs();
    }
  }

  function updateTabUrl(tabId, url) {
    const tab = tabs.find((item) => item.id === tabId);
    if (tab) {
      tab.url = url;
      saveTabs();
    }
  }

  function addToHistory(tabId, url) {
    const tab = tabs.find((item) => item.id === tabId);
    if (!tab) return;

    if (tab.historyIndex < tab.history.length - 1) {
      tab.history = tab.history.slice(0, tab.historyIndex + 1);
    }

    tab.history.push(url);
    tab.historyIndex = tab.history.length - 1;
    saveTabs();
  }

  function canGoBack(tabId) {
    const tab = tabs.find((item) => item.id === tabId);
    return !!(tab && tab.historyIndex > 0);
  }

  function canGoForward(tabId) {
    const tab = tabs.find((item) => item.id === tabId);
    return !!(tab && tab.historyIndex < tab.history.length - 1);
  }

  function goBack(tabId) {
    const tab = tabs.find((item) => item.id === tabId);
    if (!tab || !canGoBack(tabId)) return null;

    tab.historyIndex -= 1;
    return tab.history[tab.historyIndex];
  }

  function goForward(tabId) {
    const tab = tabs.find((item) => item.id === tabId);
    if (!tab || !canGoForward(tabId)) return null;

    tab.historyIndex += 1;
    return tab.history[tab.historyIndex];
  }

  function saveTabs() {
    localStorage.setItem(CONFIG.STORAGE_KEYS.TABS, JSON.stringify(tabs));
  }

  function loadTabs() {
    const saved = localStorage.getItem(CONFIG.STORAGE_KEYS.TABS);
    tabs = saved ? JSON.parse(saved) : [];

    if (tabs.length === 0) {
      addTab();
    } else {
      activeTabId = tabs[0].id;
    }
  }

  function renderTabs() {
    const container = document.getElementById("tabs-container");
    if (!container) return;

    container.innerHTML = "";

    tabs.forEach((tab) => {
      const tabElement = document.createElement("div");
      tabElement.className = `tab ${tab.id === activeTabId ? "active" : ""}`;

      const title = document.createElement("span");
      title.className = "tab-title";
      title.textContent = tab.title || "New Tab";

      const close = document.createElement("button");
      close.className = "tab-close";
      close.type = "button";
      close.textContent = "×";

      tabElement.appendChild(title);
      tabElement.appendChild(close);

      tabElement.addEventListener("click", () => setActiveTab(tab.id));
      close.addEventListener("click", (event) => {
        event.stopPropagation();
        closeTab(tab.id);
      });

      container.appendChild(tabElement);
    });
  }

  return {
    init,
    addTab,
    closeTab,
    setActiveTab,
    getActiveTab,
    updateTabTitle,
    updateTabUrl,
    addToHistory,
    canGoBack,
    canGoForward,
    goBack,
    goForward,
    getTabs: () => tabs
  };
})();
