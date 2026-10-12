export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return handleCORS(request, env);
    }

    const url = new URL(request.url);

    if (url.pathname === "/api/auth/login") {
      return handleLogin(request, env);
    }

    if (url.pathname === "/api/auth/logout") {
      return handleLogout(request, env);
    }

    if (url.pathname === "/api/proxy") {
      return handleProxy(request, env);
    }

    if (url.pathname === "/api/health") {
      return new Response(JSON.stringify({ status: "ok" }), {
        status: 200,
        headers: {
          ...getCORSHeaders(env),
          "Content-Type": "application/json"
        }
      });
    }

    return new Response("Not Found", { status: 404, headers: getCORSHeaders(env) });
  }
};

function getCORSHeaders(env) {
  const origin = env.CORS_ORIGIN || "http://localhost:8000";

  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization"
  };
}

function handleCORS() {
  return new Response(null, {
    status: 204,
    headers: getCORSHeaders({})
  });
}

async function handleLogin(request, env) {
  if (request.method !== "POST") {
    return new Response("Method not allowed", {
      status: 405,
      headers: getCORSHeaders(env)
    });
  }

  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return new Response(
        JSON.stringify({ message: "Username and password are required" }),
        {
          status: 400,
          headers: {
            ...getCORSHeaders(env),
            "Content-Type": "application/json"
          }
        }
      );
    }

    const token = generateToken();

    await env.SESSIONS.put(
      token,
      JSON.stringify({
        username,
        createdAt: Date.now(),
        expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000
      }),
      { expirationTtl: 7 * 24 * 60 * 60 }
    );

    return new Response(
      JSON.stringify({
        token,
        username
      }),
      {
        status: 200,
        headers: {
          ...getCORSHeaders(env),
          "Content-Type": "application/json"
        }
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ message: "Login failed" }),
      {
        status: 500,
        headers: {
          ...getCORSHeaders(env),
          "Content-Type": "application/json"
        }
      }
    );
  }
}

async function handleLogout(request, env) {
  if (request.method !== "POST") {
    return new Response("Method not allowed", {
      status: 405,
      headers: getCORSHeaders(env)
    });
  }

  try {
    const token = extractToken(request);
    if (token) {
      await env.SESSIONS.delete(token);
    }

    return new Response(
      JSON.stringify({ message: "Logged out" }),
      {
        status: 200,
        headers: {
          ...getCORSHeaders(env),
          "Content-Type": "application/json"
        }
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ message: "Logout failed" }),
      {
        status: 500,
        headers: {
          ...getCORSHeaders(env),
          "Content-Type": "application/json"
        }
      }
    );
  }
}

async function handleProxy(request, env) {
  if (request.method !== "POST") {
    return new Response("Method not allowed", {
      status: 405,
      headers: getCORSHeaders(env)
    });
  }

  try {
    const token = extractToken(request);
    if (!token) {
      return new Response(
        JSON.stringify({ message: "Unauthorized" }),
        {
          status: 401,
          headers: {
            ...getCORSHeaders(env),
            "Content-Type": "application/json"
          }
        }
      );
    }

    const sessionValue = await env.SESSIONS.get(token);
    if (!sessionValue) {
      return new Response(
        JSON.stringify({ message: "Invalid or expired token" }),
        {
          status: 401,
          headers: {
            ...getCORSHeaders(env),
            "Content-Type": "application/json"
          }
        }
      );
    }

    const { url } = await request.json();
    if (!url) {
      return new Response(
        JSON.stringify({ message: "URL is required" }),
        {
          status: 400,
          headers: {
            ...getCORSHeaders(env),
            "Content-Type": "application/json"
          }
        }
      );
    }

    let target;
    try {
      target = new URL(url);
    } catch {
      return new Response(
        JSON.stringify({ message: "Invalid URL" }),
        {
          status: 400,
          headers: {
            ...getCORSHeaders(env),
            "Content-Type": "application/json"
          }
        }
      );
    }

    const response = await fetch(target, {
      method: "GET",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
      }
    });

    if (!response.ok) {
      return new Response(
        JSON.stringify({
          message: `Request failed with status ${response.status}`
        }),
        {
          status: response.status,
          headers: {
            ...getCORSHeaders(env),
            "Content-Type": "application/json"
          }
        }
      );
    }

    const contentType = response.headers.get("content-type") || "";
    const html = await response.text();

    let title = "Untitled";
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (titleMatch) {
      title = titleMatch[1].trim();
    }

    return new Response(
      JSON.stringify({
        title,
        url: target.href,
        contentType,
        content: sanitizeHtml(html)
      }),
      {
        status: 200,
        headers: {
          ...getCORSHeaders(env),
          "Content-Type": "application/json"
        }
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        message: "Proxy request failed"
      }),
      {
        status: 500,
        headers: {
          ...getCORSHeaders(env),
          "Content-Type": "application/json"
        }
      }
    );
  }
}

function extractToken(request) {
  const authHeader = request.headers.get("Authorization") || "";
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  return match ? match[1] : null;
}

function generateToken() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

function sanitizeHtml(html) {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/\s+on\w+\s*=\s*(["']).*?\1/gi, "")
    .replace(/\s+on\w+\s*=\s*[^\s>]+/gi, "")
    .replace(/<iframe\b[^>]*>[\s\S]*?<\/iframe>/gi, "");
}
