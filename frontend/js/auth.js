// frontend/js/auth.js
// Requires config.js (global API_URL, token)
//C:\Users\samir\Desktop\coding\python\SplitEasy\.venv\Scripts\activate.bat
//C:\Users\samir\Desktop\coding\python\SplitEasy\.venv\Scripts\savegit.bat
async function loginUser() {
  const username = document.getElementById("loginUsername").value.trim();
  const password = document.getElementById("loginPassword").value;

  try {
    const res = await fetch(`${API_URL}/auth/login`, { 
      method: "POST", 
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: username, // Backend expects email, but we'll send username as email for now
        password: password
      })
    });
    
    if (!res.ok) {
      const err = await res.json().catch(()=>null);
      alert(err?.message || err?.detail || "Login failed");
      return;
    }
    
    const json = await res.json();
    token = json.data.token; // Backend returns { data: { token, user } }
    localStorage.setItem("token", token);
    
    // Save user info
    if (json.data.user) {
      localStorage.setItem("user", JSON.stringify(json.data.user));
    }
    
    window.location.href = "home.html";
  } catch (e) {
    console.error(e);
    alert("Network error: " + e.message);
  }
}

async function registerUser() {
  try {
    const body = {
      username: document.getElementById("username")?.value.trim(),
      email: document.getElementById("email")?.value.trim(),
      password: document.getElementById("password")?.value
    };
    const res = await fetch(`${API_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    if (!res.ok) {
      const err = await res.json().catch(()=>null);
      alert(err?.detail || "Register failed");
      return;
    }
    alert("Registered — please log in");
    window.location.href = "login.html";
  } catch (e) {
    console.error(e);
    alert("Network error");
  }
}

