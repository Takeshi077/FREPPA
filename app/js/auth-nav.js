// Auth-aware navigation for existing static pages
(function() {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    let user = null;
    try { user = JSON.parse(userStr); } catch(e) {}

    const dashboardMap = {
        admin: 'admin-dashboard.html',
        teacher: 'teacher-dashboard.html',
        student: 'student-dashboard.html',
        parent: 'student-dashboard.html'
    };

    document.querySelectorAll('.nav-login-link').forEach(el => {
        if (user) {
            el.classList.add('hidden');
        } else {
            el.classList.remove('hidden');
        }
    });

    document.querySelectorAll('.nav-dashboard-link').forEach(el => {
        if (user) {
            el.classList.remove('hidden');
            const dashUrl = dashboardMap[user.role] || 'student-dashboard.html';
            if (el.tagName === 'A') el.href = dashUrl;
        } else {
            el.classList.add('hidden');
        }
    });

    document.querySelectorAll('.nav-logout-link').forEach(el => {
        if (user) {
            el.classList.remove('hidden');
        } else {
            el.classList.add('hidden');
        }
    });

    document.querySelectorAll('.nav-username').forEach(el => {
        if (user) {
            el.classList.remove('hidden');
            el.textContent = user.full_name || 'User';
        } else {
            el.classList.add('hidden');
        }
    });

    document.querySelectorAll('.nav-logout-link').forEach(el => {
        if (el.dataset.authAction === 'logout') {
            el.addEventListener('click', function(e) {
                e.preventDefault();
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                window.location.href = 'index.html';
            });
        }
    });
})();
