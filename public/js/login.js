document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async function (e) {
            e.preventDefault(); // STOP THE PAGE REFRESH FIRST
            console.log('Form submission intercepted!'); // For debugging

            // Get values
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;

            const btn = loginForm.querySelector('.btn');
            const originalText = btn.innerText;
            btn.innerText = "Verifying...";
            btn.disabled = true;

            try {
                const response = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password }),
                    credentials: 'include' // CRITICAL for HTTP-Only Cookies
                });

                const data = await response.json();
                if (response.ok && data.success) {
                    console.log('Login successful, redirecting...');
                    window.location.href = '/index.html'; // Redirect to home on success
                } else {
                    alert(data.message || 'Login failed');
                    btn.innerText = originalText;
                    btn.disabled = false;
                }
            } catch (error) {
                console.error('Error during login:', error);
                alert("Login Error");
                btn.innerText = originalText;
                btn.disabled = false;
            }
        });
    }
});
