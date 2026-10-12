const Auth = (() => {
  let token = null;
  let username = null;

  function init() {
    token = localStorage.getItem(CONFIG.STORAGE_KEYS.AUTH_TOKEN);
    username = localStorage.getItem(CONFIG.STORAGE_KEYS.USERNAME);
    renderAuthState();
  }

  async function login(user, pass) {
    debug("Attempting login", { user });

    try {
      const response = await fetch(`${CONFIG.API_BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          username: user,
          password: pass
        })
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || "Login failed");
      }

      const data = await response.json();
      token = data.token;
      username = user;

      localStorage.setItem(CONFIG.STORAGE_KEYS.AUTH_TOKEN, token);
      localStorage.setItem(CONFIG.STORAGE_KEYS.USERNAME, username);

      renderAuthState();
      return true;
    } catch (error) {
      console.error("Login error:", error);
      return false;
    }
  }

  function logout() {
    token = null;
    username = null;
    localStorage.removeItem(CONFIG.STORAGE_KEYS.AUTH_TOKEN);
    localStorage.removeItem(CONFIG.STORAGE_KEYS.USERNAME);
    renderAuthState();
  }

  function isAuthenticated() {
    return !!token;
  }

  function getToken() {
    return token;
  }

  function getUsername() {
    return username;
  }

  function renderAuthState() {
    const authScreen = document.getElementById("auth-screen");
    const browserScreen = document.getElementById("browser-screen");

    if (isAuthenticated()) {
      authScreen.classList.add("hidden");
      browserScreen.classList.remove("hidden");
      document.getElementById("user-display").textContent = `Logged in as: ${username}`;

      if (typeof Browser !== "undefined") {
        Browser.init();
      }

      if (typeof Tabs !== "undefined") {
        Tabs.init();
      }
    } else {
      authScreen.classList.remove("hidden");
      browserScreen.classList.add("hidden");
    }
  }

  return {
    init,
    login,
    logout,
    isAuthenticated,
    getToken,
    getUsername,
    renderAuthState
  };
})();

document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("login-form");
  const authError = document.getElementById("auth-error");

  if (loginForm) {
    loginForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      authError.textContent = "";

      const username = document.getElementById("username").value.trim();
      const password = document.getElementById("password").value;

      const success = await Auth.login(username, password);
      if (!success) {
        authError.textContent = "Invalid username or password";
      }
    });
  }

  const logoutBtn = document.getElementById("logout-btn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => Auth.logout());
  }

  Auth.init();
});
