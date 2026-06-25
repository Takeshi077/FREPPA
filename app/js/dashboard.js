const API_BASE = window.location.origin;

function getToken() {
    return localStorage.getItem('token');
}

function getUser() {
    try {
        return JSON.parse(localStorage.getItem('user'));
    } catch {
        return null;
    }
}

function isAuthenticated() {
    return !!getToken();
}

function requireAuth() {
    if (!isAuthenticated()) {
        window.location.href = 'login.html';
        return false;
    }
    return true;
}

function requireRole(...roles) {
    if (!requireAuth()) return false;
    const user = getUser();
    if (!roles.includes(user.role)) {
        window.location.href = 'index.html';
        return false;
    }
    return true;
}

async function apiFetch(path, options = {}) {
    const token = getToken();
    const headers = {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        ...options.headers
    };

    const res = await fetch(`${API_BASE}${path}`, {
        ...options,
        headers
    });

    if (res.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = 'login.html';
        return null;
    }

    let text;
    try {
        text = await res.text();
        const data = JSON.parse(text);
        if (!res.ok) {
            throw new Error(data.error || `Request failed with status ${res.status}`);
        }
        return data;
    } catch (e) {
        if (e instanceof SyntaxError) {
            throw new Error(
                `Invalid JSON response (${res.status}). ` +
                (text || '').substring(0, 200)
            );
        }
        throw e;
    }
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = 'login.html';
}

function updateNavForAuth() {
    const user = getUser();
    const loginLinks = document.querySelectorAll('.nav-login-link');
    const dashboardLinks = document.querySelectorAll('.nav-dashboard-link');
    const logoutLinks = document.querySelectorAll('.nav-logout-link');
    const usernameDisplays = document.querySelectorAll('.nav-username');

    if (user) {
        loginLinks.forEach(el => el.classList.add('hidden'));
        dashboardLinks.forEach(el => el.classList.remove('hidden'));
        logoutLinks.forEach(el => el.classList.remove('hidden'));
        usernameDisplays.forEach(el => {
            el.textContent = user.full_name;
            el.classList.remove('hidden');
        });
    } else {
        loginLinks.forEach(el => el.classList.remove('hidden'));
        dashboardLinks.forEach(el => el.classList.add('hidden'));
        logoutLinks.forEach(el => el.classList.add('hidden'));
        usernameDisplays.forEach(el => el.classList.add('hidden'));
    }
}

function showError(msg, el) {
    if (!el) return;
    el.textContent = msg;
    el.classList.remove('hidden');
}
function showSuccess(msg, el) {
    if (!el) return;
    el.textContent = msg;
    el.classList.remove('hidden');
}
function hideElement(el) {
    if (el) el.classList.add('hidden');
}
function showElement(el) {
    if (el) el.classList.remove('hidden');
}

async function loadSidebarData() {
    try {
        const data = await apiFetch('/api/auth/verify');
        if (data && data.user) {
            localStorage.setItem('user', JSON.stringify(data.user));
        }
    } catch (e) {
        console.error('Failed to verify session:', e);
    }
}

function getGradeClass(grade) {
    if (!grade) return 'bg-slate-100 text-slate-600';
    const g = grade.toUpperCase();
    if (g === 'A') return 'bg-green-100 text-green-800 font-bold';
    if (g === 'B') return 'bg-blue-100 text-blue-800 font-bold';
    if (g === 'C') return 'bg-amber-100 text-amber-800 font-bold';
    if (g === 'D') return 'bg-orange-100 text-orange-800 font-bold';
    if (g === 'E') return 'bg-red-100 text-red-700 font-bold';
    if (g === 'F') return 'bg-red-200 text-red-900 font-bold';
    return 'bg-slate-100 text-slate-600';
}
