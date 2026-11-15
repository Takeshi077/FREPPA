// Routes the landing page "Quiz" links through login when needed.
(function () {
    const LOGIN_URL = 'login.html?redirect=quiz.html';

    function getUser() {
        try { return JSON.parse(localStorage.getItem('user')); } catch (e) { return null; }
    }

    function showToast(message) {
        const toast = document.getElementById('quiz-toast');
        if (!toast) return;
        toast.textContent = message;
        toast.classList.remove('hidden');
        clearTimeout(showToast.timer);
        showToast.timer = setTimeout(() => toast.classList.add('hidden'), 5000);
    }

    const token = localStorage.getItem('token');
    const user = getUser();
    const isStudent = !!(token && user && user.role === 'student');

    document.querySelectorAll('.quiz-entry-link').forEach((el) => {
        if (!token || !user) {
            el.setAttribute('href', LOGIN_URL);
        } else if (isStudent) {
            el.setAttribute('href', 'quiz.html');
        } else {
            el.setAttribute('href', '#');
            el.addEventListener('click', (e) => {
                e.preventDefault();
                showToast('Quizzes are for students only. Please log out and sign in with your student account.');
            });
        }
    });
})();
