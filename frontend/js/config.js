// frontend/js/config.js
//const API_URL = "http://pcrox.ddns.net:8000";
const API_URL = "http://127.0.0.1:8000/api"; // local development
// const API_URL = "http://pcrox.ddns.net:8000"; // local option

// -------------------------
// AUTH STATE MANAGEMENT
// -------------------------
let token = null;
let currentUser = null;

// ✅ Load from localStorage safely
function loadAuth() {
  try {
    token = localStorage.getItem("token") || null;
    const u = localStorage.getItem("user");
    currentUser = u ? JSON.parse(u) : null;
  } catch (err) {
    console.warn("⚠️ Could not parse user:", err);
    currentUser = null;
  }
}

// ✅ Save functions
function setToken(t) {
  token = t;
  if (t) localStorage.setItem("token", t);
  else localStorage.removeItem("token");
}

function setUser(u) {
  currentUser = u;
  if (u) localStorage.setItem("user", JSON.stringify(u));
  else localStorage.removeItem("user");
}

// ✅ Get headers
function getHeaders(json = true) {
  const h = {};
  if (json) h["Content-Type"] = "application/json";
  if (token) h["Authorization"] = `Bearer ${token}`;
  return h;
}

// ✅ Check login (safe)
function checkLogin(redirect = true) {
  loadAuth();



  // small delay to avoid redirect loop during DOM load
  if (!token || !currentUser || !currentUser.id) {
    console.warn("🔒 Not authenticated");
    if (redirect) {
      setTimeout(() => {
        window.location.href = "login.html";
      }, 200);
    }
    return false;
  }

  // ✅ all good
  return true;
}


// small helper used elsewhere
async function fetchCurrentUser() {
  const t = localStorage.getItem("token");
  if (!t) return null;
  try {
    const res = await fetch(`${API_URL}/users/user/me`, { headers: { Authorization: `Bearer ${t}` } });
    if (!res.ok) return null;
    return await res.json();
  } catch (e) { return null; }
}


// Fetch with auth and retry logic
async function fetchWithAuth(url, retries = 3, timeoutMs = 10000) {
  for (let i = 0; i < retries; i++) {
    try {
      // Ensure auth is loaded before each request
      loadAuth();

      // Create AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const res = await fetch(url, {
          headers: getHeaders(),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (res.status === 401) {
          console.warn("Authentication failed, redirecting to login");
          window.location.href = "login.html";
          return null;
        }

        if (!res.ok) {
          const errorText = await res.text();
          let errorDetail = `Failed to fetch ${url} (${res.status})`;
          try {
            const errorJson = JSON.parse(errorText);
            if (errorJson.detail) {
              if (Array.isArray(errorJson.detail)) {
                errorDetail = errorJson.detail.map(err => `${err.loc?.join('.') || ''} - ${err.msg}`).join('; ');
              } else if (typeof errorJson.detail === 'string') {
                errorDetail = errorJson.detail;
              }
            } else if (typeof errorJson === 'string') {
              errorDetail = errorJson;
            }
          } catch (e) {
            // If not JSON, use the text as is
            if (errorText) errorDetail = errorText;
          }
          throw new Error(errorDetail);
        }

        return await res.json();
      } catch (fetchError) {
        clearTimeout(timeoutId);
        if (fetchError.name === 'AbortError') {
          throw new Error(`Request timeout after ${timeoutMs}ms`);
        }
        throw fetchError;
      }
    } catch (error) {
      console.warn(`Attempt ${i + 1} failed for ${url}:`, error.message);
      if (i === retries - 1) throw error;
      // Wait before retry (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
    }
  }
}