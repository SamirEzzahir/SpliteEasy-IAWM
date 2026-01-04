// Enhanced Friends Page JavaScript
console.log("✅ Friends.js loaded successfully");

// Helper function to get avatar HTML
function getAvatarHtml(user, size = 50) {
    const name = user.username || user.user_email || user.friend_email || 'User';
    const initials = name.split(' ').map(w => w[0]).join('').toUpperCase().substring(0, 2);
    const colorIndex = (name.charCodeAt(0) % 6) + 1;

    if (user.profile_photo) {
        return `<img src="${user.profile_photo}" class="friend-avatar" alt="Avatar" style="width: ${size}px; height: ${size}px;">`;
    } else {
        return `<div class="friend-avatar-gradient" data-color="${colorIndex}" style="width: ${size}px; height: ${size}px; font-size: ${size * 0.22}px;">${initials}</div>`;
    }
}

// Enhanced Friends Page JavaScript
console.log("✅ Friends.js loaded successfully");

// Enhanced toast notification
function showToast(message, type = "primary") {
    const container = document.getElementById("toastContainer");
    const toastEl = document.createElement("div");
    toastEl.className = `toast align-items-center text-bg-${type} border-0`;
    toastEl.setAttribute("role", "alert");
    toastEl.setAttribute("aria-live", "assertive");
    toastEl.setAttribute("aria-atomic", "true");

    const icon = type === "success" ? "check-circle" :
        type === "danger" ? "exclamation-triangle" :
            type === "info" ? "info-circle" : "bell";

    toastEl.innerHTML = `
        <div class="d-flex">
            <div class="toast-body d-flex align-items-center">
                <i class="bi bi-${icon} me-2"></i>
                ${message}
            </div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
        </div>
    `;

    container.appendChild(toastEl);
    const toast = new bootstrap.Toast(toastEl, { delay: 5000 });
    toast.show();
    toastEl.addEventListener("hidden.bs.toast", () => toastEl.remove());
}

// Enhanced search functionality
async function searchFriend() {
    const query = document.getElementById("searchEmail").value.trim();
    const searchResults = document.getElementById("searchResults");

    if (!query) {
        searchResults.innerHTML = "";
        return;
    }

    if (query.length < 2) {
        searchResults.innerHTML = `
            <div class="alert alert-info">
                <i class="bi bi-info-circle me-2"></i>
                Please enter at least 2 characters to search
            </div>
        `;
        return;
    }

    console.log("🔍 Searching for:", query);

    // Show loading state
    searchResults.innerHTML = `
        <div class="text-center text-muted py-3">
            <div class="spinner-border spinner-border-sm me-2" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
            <span>Searching...</span>
        </div>
    `;

    try {
        const res = await fetch(`${API_URL}/friends/search?query=${encodeURIComponent(query)}`, {
            headers: getHeaders()
        });

        if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            throw new Error(errorData.message || `Search failed (${res.status})`);
        }

        const results = await res.json();
        console.log("📋 Search results:", results);

        if (!Array.isArray(results) || results.length === 0) {
            searchResults.innerHTML = `
                <div class="empty-state">
                    <i class="bi bi-search"></i>
                    <h6>No users found</h6>
                    <p class="mb-0">Try searching with a different username, email, or phone number</p>
                </div>
            `;
            return;
        }

        searchResults.innerHTML = results.map(user => {
            const userName = user.username || 'Unknown User';
            const userEmail = user.email || '';
            const userId = user._id; // Use _id instead of id
            const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ');
            const displayName = fullName || userName;

            return `
                <div class="search-result-card fade-in">
                    <div class="search-result-header">
                        <div class="search-result-avatar">
                            ${getFriendAvatarHtml(user, 60)}
                        </div>
                        <div class="search-result-info">
                            <div class="search-result-name">${displayName}</div>
                            <div class="search-result-email">@${userName}</div>
                            ${userEmail ? `<div class="search-result-email"><i class="bi bi-envelope me-1"></i>${userEmail}</div>` : ''}
                            ${user.phone ? `<div class="search-result-email"><i class="bi bi-telephone me-1"></i>${user.phone}</div>` : ''}
                        </div>
                    </div>
                    <div class="friend-actions">
                        <button class="btn btn-primary btn-sm w-100" onclick="sendFriendRequest('${userId}')">
                            <i class="bi bi-person-plus me-1"></i>Add Friend
                        </button>
                    </div>
                </div>
            `;
        }).join('');

    } catch (error) {
        console.error("❌ Search error:", error);
        searchResults.innerHTML = `
            <div class="alert alert-danger">
                <i class="bi bi-exclamation-triangle me-2"></i>
                ${error.message || 'Failed to search users. Please try again.'}
            </div>
        `;
    }
}

// Enhanced friend request sending
async function sendFriendRequest(friendId) {
    console.log("📤 Sending friend request to:", friendId);

    // Validate friendId format
    if (!friendId || typeof friendId !== 'string' || friendId.length !== 24) {
        showToast("Invalid user ID format", "danger");
        return;
    }

    try {
        const res = await fetch(`${API_URL}/friends/request/${friendId}`, {
            method: "POST",
            headers: getHeaders()
        });

        if (!res.ok) {
            const error = await res.json().catch(() => ({}));
            console.error("❌ Friend request failed:", error);
            
            // Handle specific error cases
            if (res.status === 400) {
                if (error.message && error.message.includes('yourself')) {
                    throw new Error("You cannot send a friend request to yourself");
                } else if (error.message && error.message.includes('already')) {
                    throw new Error("Friend request already sent or you are already friends");
                } else if (error.errors && error.errors.length > 0) {
                    throw new Error(`Validation error: ${error.errors[0].message}`);
                } else {
                    throw new Error(error.message || "Invalid request");
                }
            } else if (res.status === 404) {
                throw new Error("User not found");
            } else {
                throw new Error(error.message || `Request failed (${res.status})`);
            }
        }

        const response = await res.json();
        console.log("✅ Friend request sent:", response);

        showToast("Friend request sent successfully!", "success");
        loadFriends();

        // Clear search results
        document.getElementById("searchResults").innerHTML = "";
        document.getElementById("searchEmail").value = "";

        // Close modal
        const modal = bootstrap.Modal.getInstance(document.getElementById("addFriendModal"));
        if (modal) modal.hide();

    } catch (error) {
        console.error("❌ Send request error:", error);
        showToast(error.message, "danger");
    }
}

// View friend profile (placeholder for future feature)
function viewFriendProfile(friendId) {
    showToast("Profile view feature coming soon!", "info");
    // TODO: Implement friend profile view
}

// Cancel friend request
async function cancelRequest(requestId) {
    if (!confirm("Are you sure you want to cancel this friend request?")) {
        return;
    }

    try {
        const res = await fetch(`${API_URL}/friends/request/${requestId}/cancel`, {
            method: "POST",
            headers: getHeaders()
        });

        if (!res.ok) {
            const error = await res.json().catch(() => null);
            throw new Error(error?.detail || "Failed to cancel request");
        }

        showToast("Friend request cancelled", "info");
        loadFriends();
    } catch (error) {
        console.error("❌ Cancel request error:", error);
        showToast(error.message, "danger");
    }
}

// Filter friends by search query
function filterFriends(query) {
    const friendCards = document.querySelectorAll('#friendsList .friend-card');
    const lowerQuery = query.toLowerCase();

    friendCards.forEach(card => {
        const name = card.querySelector('.friend-name')?.textContent.toLowerCase() || '';
        const email = card.querySelector('.friend-email')?.textContent.toLowerCase() || '';
        const matches = name.includes(lowerQuery) || email.includes(lowerQuery);
        card.style.display = matches ? 'block' : 'none';
    });
}

// Enhanced friend removal
async function removeFriend(friendshipId) {
    if (!friendshipId) {
        showToast("Invalid friend ID", "danger");
        return;
    }

    if (!confirm("Are you sure you want to remove this friend? This action cannot be undone.")) {
        return;
    }

    console.log("🗑️ Removing friend:", friendshipId);

    try {
        const res = await fetch(`${API_URL}/friends/remove/${friendshipId}`, {
            method: "DELETE",
            headers: getHeaders()
        });

        if (!res.ok) {
            const error = await res.json().catch(() => null);
            throw new Error(error?.detail || "Failed to remove friend");
        }

        showToast("Friend removed successfully", "warning");
        loadFriends();

    } catch (error) {
        console.error("❌ Remove friend error:", error);
        showToast(error.message, "danger");
    }
}

// Enhanced friends loading
async function loadFriends() {
    console.log("🔄 Loading friends data...");

    try {
        // Load my friends
        const friendsRes = await fetch(`${API_URL}/friends/my`, {
            headers: getHeaders()
        });
        const myFriends = friendsRes.ok ? await friendsRes.json() : [];

        // Load requests received
        const receivedRes = await fetch(`${API_URL}/friends/requests/received`, {
            headers: getHeaders()
        });
        const received = receivedRes.ok ? await receivedRes.json() : [];

        // Load requests sent
        const sentRes = await fetch(`${API_URL}/friends/requests/sent`, {
            headers: getHeaders()
        });
        const sent = sentRes.ok ? await sentRes.json() : [];

        console.log("📊 Friends data loaded:", { myFriends, received, sent });

        // Update counts
        const friendsCountEl = document.getElementById("friendsCount");
        const receivedCountEl = document.getElementById("receivedCount");
        const sentCountEl = document.getElementById("sentCount");

        if (friendsCountEl) friendsCountEl.textContent = myFriends.length || 0;
        if (receivedCountEl) receivedCountEl.textContent = received.length || 0;
        if (sentCountEl) sentCountEl.textContent = sent.length || 0;

        // Update badge counts
        const friendsCountBadge = document.getElementById("friendsCountBadge");
        const receivedCountBadge = document.getElementById("receivedCountBadge");
        const sentCountBadge = document.getElementById("sentCountBadge");

        if (friendsCountBadge) friendsCountBadge.textContent = myFriends.length || 0;
        if (receivedCountBadge) receivedCountBadge.textContent = received.length || 0;
        if (sentCountBadge) sentCountBadge.textContent = sent.length || 0;

        // Render my friends
        renderMyFriends(myFriends);

        // Render requests
        renderRequests(received, sent);

    } catch (error) {
        console.error("❌ Load friends error:", error);
        showToast("Failed to load friends data", "danger");
        
        // Show empty states on error
        renderMyFriends([]);
        renderRequests([], []);
    }
}

// Helper function to get avatar HTML with gradient
function getFriendAvatarHtml(user, size = 100) {
    const name = user.username || user.friend_email || user.user_email || 'User';
    const initials = name.split(' ').map(w => w[0]).join('').toUpperCase().substring(0, 2);
    const colorIndex = (name.charCodeAt(0) % 6) + 1;

    if (user.profile_photo) {
        return `<img src="${user.profile_photo}" class="friend-avatar" alt="${name}" style="width: ${size}px; height: ${size}px;">`;
    } else {
        return `<div class="friend-avatar friend-avatar-gradient" data-color="${colorIndex}" style="width: ${size}px; height: ${size}px; font-size: ${size * 0.4}px;">${initials}</div>`;
    }
}

// Render my friends in Facebook-like grid
function renderMyFriends(friends) {
    const container = document.getElementById("friendsList");

    if (friends.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="bi bi-people"></i>
                <h5>No Friends Yet</h5>
                <p>Start by searching for friends to connect with!</p>
            </div>
        `;
        return;
    }

    container.innerHTML = friends.map(friend => {
        const friendName = friend.username || friend.friend_email || 'Unknown User';
        const friendId = friend.friendship_id || friend.id;

        // Format date: "Friends since May 2023"
        let subText = friend.friend_email || friend.email || '';
        if (friend.created_at) {
            const date = new Date(friend.created_at);
            const month = date.toLocaleString('default', { month: 'long' });
            const year = date.getFullYear();
            subText = `Friends since ${month} ${year}`;
        }

        return `
            <div class="friend-card fade-in">
                <div class="friend-avatar-container">
                    ${getFriendAvatarHtml(friend, 100)}
                </div>
                <div class="friend-name">${friendName}</div>
                <div class="friend-email">${subText}</div>
                <div class="friend-actions">
                    <button class="btn btn-primary btn-sm" onclick="viewFriendProfile(${friendId})" title="View Profile">
                        <i class="bi bi-person me-1"></i>View
                    </button>
                    <button class="btn btn-danger btn-sm" onclick="removeFriend(${friendId})" title="Remove Friend">
                        <i class="bi bi-person-dash me-1"></i>Remove Friend
                    </button>
                </div>
            </div>
        `;
    }).join('');

    // Update badge count
    const badge = document.getElementById('friendsCountBadge');
    if (badge) badge.textContent = friends.length;
}

// Render friend requests in Facebook-like grid
function renderRequests(received, sent) {
    const receivedContainer = document.getElementById("receivedRequests");
    const sentContainer = document.getElementById("sentRequests");

    // Render received requests
    if (received.length === 0) {
        receivedContainer.innerHTML = `
            <div class="empty-state">
                <i class="bi bi-inbox"></i>
                <h5>No Pending Requests</h5>
                <p>You have no friend requests waiting for your response</p>
            </div>
        `;
    } else {
        receivedContainer.innerHTML = received.map(request => {
            const userName = request.username || request.user_email || 'Unknown User';
            const userEmail = request.user_email || '';
            const requestId = request.id || request.friendship_id;

            return `
                <div class="friend-card fade-in">
                    <div class="friend-avatar-container">
                        ${getFriendAvatarHtml(request, 100)}
                    </div>
                    <div class="friend-name">${userName}</div>
                    <div class="friend-email">${userEmail}</div>
                    <div class="friend-actions">
                        <button class="btn btn-success btn-sm" onclick="respondRequest(${requestId}, true)">
                            <i class="bi bi-check me-1"></i>Accept
                        </button>
                        <button class="btn btn-danger btn-sm" onclick="respondRequest(${requestId}, false)">
                            <i class="bi bi-x me-1"></i>Reject
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

    // Update badge count
    const receivedBadge = document.getElementById('receivedCountBadge');
    if (receivedBadge) receivedBadge.textContent = received.length;

    // Render sent requests
    if (sent.length === 0) {
        sentContainer.innerHTML = `
            <div class="empty-state">
                <i class="bi bi-send"></i>
                <h5>No Sent Requests</h5>
                <p>You haven't sent any friend requests yet</p>
            </div>
        `;
    } else {
        sentContainer.innerHTML = sent.map(request => {
            const friendName = request.username || request.friend_email || 'Unknown User';
            const friendEmail = request.friend_email || '';
            const requestId = request.id || request.friendship_id;

            return `
                <div class="friend-card fade-in">
                    <div class="friend-avatar-container">
                        ${getFriendAvatarHtml(request, 100)}
                    </div>
                    <div class="friend-name">${friendName}</div>
                    <div class="friend-email">${friendEmail}</div>
                    <div class="friend-actions">
                        <span class="badge bg-info">
                            <i class="bi bi-clock me-1"></i>Pending
                        </span>
                        <button class="btn btn-outline-secondary btn-sm" onclick="cancelRequest(${requestId})" title="Cancel Request">
                            <i class="bi bi-x-circle me-1"></i>Cancel
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

    // Update badge count
    const sentBadge = document.getElementById('sentCountBadge');
    if (sentBadge) sentBadge.textContent = sent.length;
}

// Enhanced request response
async function respondRequest(requestId, accept) {
    console.log(`${accept ? '✅ Accepting' : '❌ Rejecting'} request:`, requestId);

    try {
        const url = `${API_URL}/friends/request/${requestId}/${accept ? "accept" : "reject"}`;
        const res = await fetch(url, {
            method: "POST",
            headers: getHeaders()
        });

        if (!res.ok) {
            const error = await res.json().catch(() => null);
            throw new Error(error?.detail || "Failed to respond to request");
        }

        const message = accept ? "Friend request accepted!" : "Friend request rejected";
        const type = accept ? "success" : "warning";
        showToast(message, type);
        loadFriends();

    } catch (error) {
        console.error("❌ Respond request error:", error);
        showToast(error.message, "danger");
    }
}

// Initialize the page
document.addEventListener("DOMContentLoaded", async () => {
    console.log("🚀 Friends page initialized");

    // Check authentication first
    loadAuth();
    if (!localStorage.getItem("token")) {
        console.log("❌ User not authenticated, redirecting to login");
        window.location.href = "login.html";
        return;
    }

    // Clear notifications when user visits friends page
    if (window.globalNotifications && typeof window.globalNotifications.clearNotifications === 'function') {
        window.globalNotifications.clearNotifications();
    }

    // Get current user to ensure we have the latest data
    try {
        const user = await fetchCurrentUser();
        if (user && user.id) {
            console.log("✅ User authenticated:", user.username);
        } else {
            console.warn("⚠️ Failed to get current user");
        }
    } catch (error) {
        console.error("❌ Error getting current user:", error);
        showToast("Failed to load user data", "danger");
    }

    // Load initial data
    loadFriends();

    // Add event listeners
    const searchBtn = document.querySelector('button[onclick="searchFriend()"]');
    const searchInput = document.getElementById("searchEmail");

    if (searchBtn) {
        searchBtn.addEventListener("click", searchFriend);
    }

    if (searchInput) {
        searchInput.addEventListener("keypress", (e) => {
            if (e.key === "Enter") {
                searchFriend();
            }
        });
    }

    console.log("✅ Friends page setup complete");
});