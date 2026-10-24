let currentForm = 'login';
let otpUserEmail = '';
let resendTimer = null;
let resendCountdown = 30;
let isForgotPassword = false;

// Backend simulation functions

async function sendOTP(email) {
    try {
        const res = await fetch(`${window.APP_CONFIG.API_BASE_URL}/send_otp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: email })
        });
        const data = await res.json();
        if (res.ok) {
            return { success: true, message: data.message };
        } else {
            return { success: false, message: data.detail || 'Failed to send OTP' };
        }
    } catch (error) {
        console.error('OTP send error:', error);
        return { success: false, message: 'Network error' };
    }
}

async function verifyOTP(email, otp) {
    try {
        const res = await fetch(`${window.APP_CONFIG.API_BASE_URL}/verify_otp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: email, otp: otp })
        });
        const data = await res.json();
        if (res.ok && data.access_token) {
            return { success: true, message: 'OTP verified', data: data };
        } else {
            return { success: false, message: data.detail || 'Invalid OTP' };
        }
    } catch (error) {
        console.error('OTP verify error:', error);
        return { success: false, message: 'Network error' };
    }
}

async function registerUser(name, email, password) {
    const signupBtn = document.getElementById("createAccBtn");
    const res = await fetch(`${window.APP_CONFIG.API_BASE_URL}/register`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            username: name,
            email: email,
            password: password
        })
    });

    const data = await res.json();
    if (!res.ok) {
        signupBtn.textContent = 'Create Account';
        signupBtn.disabled = false;//// res is ok when status code is 2XX
        if (data.detail.type === 'user') {
            showError('signupEmail', data.detail.content);
            throw new Error('user');
        } else if (data.detail.type === "password") {
            showError('signupPassword', data.detail.content);
            throw new Error('password');
        } else {
            showError('signupEmail', data.detail || 'Registration failed');
            throw new Error('unknown');
        }

    }

    // ---- SUCCESS ----
    if ("access_token" in data) {
        showSuccess('signupSuccessMessage', 'Account created! Redirecting...');
        await hideSignUpErrors();
        setTimeout(() => saveTokenAndRedirect(data.access_token), 2000);
        return;
    }

    showError('signupEmail', 'Unexpected response');
    if (signupBtn) {
        signupBtn.textContent = 'Create Account';
        signupBtn.disabled = false;
    }
}

async function loginUser(email, password) {
    const loginBtn = document.getElementById("loginBtn");
    const res = await fetch(`${window.APP_CONFIG.API_BASE_URL}/token`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            email: email,
            password: password
        })
    })
    const data = await res.json();

    if (!res.ok) {
        loginBtn.textContent = 'Sign In';
        loginBtn.disabled = false;
        if (data.detail.type === "user") {
            showError("email", data.detail.content || 'User not found');
            throw new Error('user');
        } else if (data.detail.type === "password") {
            showError("password", data.detail.content || 'Incorrect password');
            throw new Error('password');
        } else {
            showError('email', data.detail || 'Login failed');
            throw new Error('unknown');
        }
    }

    if (data.access_token) {
        showSuccess('successMessage', 'Login successful! Redirecting...');
        await hideLoginErrors();
        setTimeout(() => saveTokensAndRedirect(data), 2000);
    } else {
        showError('password', 'Invalid email or password');
        loginBtn.textContent = 'Sign In';
        loginBtn.disabled = false;
    }
    loginBtn.textContent = 'Sign In';
    loginBtn.disabled = false;

    return data;

}

// Form switching
function showForm(formName) {
    const forms = ['loginForm', 'signupForm', 'otpEmailForm', 'otpVerifyForm', 'resetPasswordForm'];

    forms.forEach(form => {
        const formElement = document.getElementById(form);
        if (formElement) {
            formElement.classList.add('hidden');
        }
    });

    setTimeout(() => {
        const targetForm = document.getElementById(formName);
        if (targetForm) {
            targetForm.classList.remove('hidden');
            currentForm = formName;

            if (formName === 'otpVerifyForm') {
                startResendTimer();
            }
        }
    }, 300);
}

// Slideshow functionality
const slides = document.querySelectorAll('.slide');
const indicators = document.querySelectorAll('.indicator');
// Keep the pastel visual panel consistent while rotating the feature copy.

let currentSlide = 0;
const leftPanel = document.getElementById('leftPanel');

function showSlide(index) {
    slides.forEach((slide, i) => {
        slide.classList.remove('active');
    });

    indicators.forEach((indicator, i) => {
        indicator.classList.remove('active');
    });

    setTimeout(() => {
        slides[index].classList.add('active');
        indicators[index].classList.add('active');
        // Visual styling stays fixed; only the feature text changes.
    }, 100);

    currentSlide = index;
}

function nextSlide() {
    const next = (currentSlide + 1) % slides.length;
    showSlide(next);
}

let slideInterval = setInterval(nextSlide, 5000);

leftPanel.addEventListener('mouseenter', () => {
    clearInterval(slideInterval);
});

leftPanel.addEventListener('mouseleave', () => {
    slideInterval = setInterval(nextSlide, 5000);
});

indicators.forEach((indicator, index) => {
    indicator.addEventListener('click', () => {
        clearInterval(slideInterval);
        showSlide(index);
        slideInterval = setInterval(nextSlide, 5000);
    });
});

// Password toggle functionality
document.addEventListener('click', function (e) {
    if (e.target.classList.contains('password-toggle')) {
        const targetId = e.target.getAttribute('data-target');
        const passwordInput = document.getElementById(targetId);

        if (passwordInput) {
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);
            e.target.textContent = type === 'password' ? 'Show' : 'Hide';
            e.target.setAttribute('aria-pressed', String(type === 'text'));
            e.target.setAttribute('aria-label', type === 'password' ? 'Show password' : 'Hide password');
        }
    }
});

// Validation functions
function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

function validatePassword(password) {
    return password.length >= 6;
}

function showError(inputId, message) {
    const errorElement = document.getElementById(inputId + 'Error');
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.style.display = 'block';
        const input = document.getElementById(inputId);
        if (input) {
            input.style.borderColor = '#ff6b6b';
        }
    }
}

function hideError(inputId) {
    const errorElement = document.getElementById(inputId + 'Error');
    if (errorElement) {
        errorElement.style.display = 'none';
        const input = document.getElementById(inputId);
        if (input) {
            input.style.borderColor = '';
        }
    }
}

function showSuccess(elementId, message) {
    const successElement = document.getElementById(elementId);
    if (successElement) {
        successElement.textContent = message;
        successElement.style.display = 'block';
    }
}

// Navigation
document.getElementById('showSignupBtn').addEventListener('click', (e) => {
    e.preventDefault();
    showForm('signupForm');
});

document.getElementById('backToLoginBtn').addEventListener('click', () => {
    showForm('loginForm');
});

document.getElementById('showLoginBtn').addEventListener('click', (e) => {
    e.preventDefault();
    showForm('loginForm');
});

document.getElementById('otpLoginBtn').addEventListener('click', () => {
    showForm('otpEmailForm');
});

document.getElementById('backFromOTPEmailBtn').addEventListener('click', () => {
    showForm('loginForm');
});

document.getElementById('backToLoginFromOTPBtn').addEventListener('click', (e) => {
    e.preventDefault();
    showForm('loginForm');
});

document.getElementById('backFromOTPVerifyBtn').addEventListener('click', () => {
    showForm('otpEmailForm');
    if (resendTimer) clearInterval(resendTimer);
});

document.querySelector('.forgot-password').addEventListener('click', (e) => {
    e.preventDefault();
    isForgotPassword = true;
    showForm('otpEmailForm');
});

document.getElementById('otpLoginBtn').addEventListener('click', () => {
    isForgotPassword = false;
    showForm('otpEmailForm');
});

document.getElementById('backToLoginFromResetBtn').addEventListener('click', () => {
    showForm('loginForm');
});

// Login form submission
document.getElementById('loginFormElement').addEventListener('submit', async function (e) {
    e.preventDefault();

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    let isValid = true;

    if (!email) {
        showError('email', 'Please enter a valid email address');
        isValid = false;
    } else {
        hideError('email');
    }

    if (!password || !validatePassword(password)) {
        showError('password', 'Password must be at least 6 characters long');
        isValid = false;
    } else {
        hideError('password');
    }

    if (isValid) {
        const loginBtn = this.querySelector('.login-btn');
        loginBtn.textContent = 'Signing In...';
        loginBtn.disabled = true;

        const result = await loginUser(email, password);

    }
});

// Signup form submission
document.getElementById('signupFormElement').addEventListener('submit', async function (e) {
    e.preventDefault();

    const name = document.getElementById('signupName').value;
    const email = document.getElementById('signupEmail').value;
    const password = document.getElementById('signupPassword').value;
    const confirmPassword = document.getElementById('signupConfirmPassword').value;

    let isValid = true;

    if (!name || name.trim().length < 2) {
        showError('signupName', 'Please enter your full name');
        isValid = false;
    } else {
        hideError('signupName');
    }

    if (!email || !validateEmail(email)) {
        showError('signupEmail', 'Please enter a valid email address');
        isValid = false;
    } else {
        hideError('signupEmail');
    }

    if (!password || password.length < 8) {
        showError('signupPassword', 'Password must be at least 8 characters long');
        isValid = false;
    } else {
        hideError('signupPassword');
    }

    if (password !== confirmPassword) {
        showError('signupConfirmPassword', 'Passwords do not match');
        isValid = false;
    } else {
        hideError('signupConfirmPassword');
    }

    if (isValid) {
        const signupBtn = this.querySelector('.login-btn');
        signupBtn.textContent = 'Creating Account...';
        signupBtn.disabled = true;

        const result = await registerUser(name, email, password);
    }
});

// OTP Email form submission
document.getElementById('otpEmailFormElement').addEventListener('submit', async function (e) {
    e.preventDefault();

    const email = document.getElementById('otpEmail').value;

    if (!email || !validateEmail(email)) {
        showError('otpEmail', 'Please enter a valid email address');
        return;
    }

    const submitBtn = this.querySelector('.login-btn');
    submitBtn.textContent = 'Checking...';
    submitBtn.disabled = true;

    try {
        const result = await sendOTP(email);

        if (result.success) {
            hideError('otpEmail');
            otpUserEmail = email;

            document.getElementById('otpSentMessage').textContent = `Enter the 6-digit code sent to ${email}`;
            showForm('otpVerifyForm');
        } else {
            showError('otpEmail', result.message);
        }
    } catch (error) {
        showError('otpEmail', 'An error occurred');
    } finally {
        submitBtn.textContent = 'Send OTP';
        submitBtn.disabled = false;
    }
});

// OTP input handling
const otpInputs = document.querySelectorAll('.otp-input');

otpInputs.forEach((input, index) => {
    input.addEventListener('input', function (e) {
        const value = e.target.value;

        if (value.length === 1 && index < otpInputs.length - 1) {
            otpInputs[index + 1].focus();
        }

        hideError('otpVerify');
    });

    input.addEventListener('keydown', function (e) {
        if (e.key === 'Backspace' && !e.target.value && index > 0) {
            otpInputs[index - 1].focus();
        }
    });

    input.addEventListener('paste', function (e) {
        e.preventDefault();
        const pastedData = e.clipboardData.getData('text').slice(0, 6);

        pastedData.split('').forEach((char, i) => {
            if (otpInputs[i]) {
                otpInputs[i].value = char;
            }
        });

        if (otpInputs[5]) {
            otpInputs[5].focus();
        }
    });
});

// OTP Verify form submission
document.getElementById('otpVerifyFormElement').addEventListener('submit', async function (e) {
    e.preventDefault();

    const otpValues = Array.from(otpInputs).map(input => input.value);
    const otp = otpValues.join('');

    if (otp.length !== 6) {
        showError('otpVerify', 'Please enter complete 6-digit OTP');
        return;
    }

    const submitBtn = this.querySelector('.login-btn');
    submitBtn.textContent = 'Verifying...';
    submitBtn.disabled = true;

    try {
        const result = await verifyOTP(otpUserEmail, otp);

        if (result.success) {
            hideError('otpVerify');
            submitBtn.textContent = 'Success!';

            if (isForgotPassword) {
                setTimeout(() => showForm('resetPasswordForm'), 1000);
            } else {
                setTimeout(() => saveTokensAndRedirect(result.data), 1000);
            }
        } else {
            showError('otpVerify', 'Invalid OTP. Please try again.');
            otpInputs.forEach(input => input.value = '');
            otpInputs[0].focus();
            submitBtn.textContent = 'Verify & Login';
            submitBtn.disabled = false;
        }
    } catch (error) {
        showError('otpVerify', 'An error occurred');
        submitBtn.textContent = 'Verify & Login';
        submitBtn.disabled = false;
    }
});

// Resend OTP functionality
function startResendTimer() {
    resendCountdown = 30;
    const resendBtn = document.getElementById('resendOTPBtn');
    const timerDiv = document.getElementById('resendTimer');

    if (!resendBtn || !timerDiv) return;

    resendBtn.disabled = true;

    resendTimer = setInterval(() => {
        resendCountdown--;
        timerDiv.textContent = `Resend available in ${resendCountdown}s`;

        if (resendCountdown <= 0) {
            clearInterval(resendTimer);
            resendBtn.disabled = false;
            timerDiv.textContent = '';
        }
    }, 1000);
}

document.getElementById('resendOTPBtn').addEventListener('click', async function () {
    this.disabled = true;
    this.textContent = 'Sending...';

    try {
        await sendOTP(otpUserEmail);

        this.textContent = 'Resend OTP';
        startResendTimer();

        const timer = document.getElementById('resendTimer');
        timer.textContent = 'OTP sent successfully!';
        timer.style.color = '#51cf66';

        setTimeout(() => {
            timer.style.color = '#808080';
        }, 3000);
    } catch (error) {
        this.textContent = 'Resend OTP';
        this.disabled = false;
    }
});

// Reset Password form submission
document.getElementById('resetPasswordFormElement').addEventListener('submit', async function (e) {
    e.preventDefault();

    const password = document.getElementById('resetPassword').value;
    const confirmPassword = document.getElementById('resetConfirmPassword').value;

    if (password !== confirmPassword) {
        showError('resetConfirmPassword', 'Passwords do not match');
        return;
    }

    const submitBtn = this.querySelector('.login-btn');
    submitBtn.textContent = 'Updating...';
    submitBtn.disabled = true;

    try {
        const res = await fetch(`${window.APP_CONFIG.API_BASE_URL}/reset-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: otpUserEmail,
                new_password: password
            })
        });

        if (res.ok) {
            showSuccess('resetSuccessMessage', 'Password updated! Please login with your new password.');
            setTimeout(() => showForm('loginForm'), 3000);
        } else {
            const data = await res.json();
            showError('resetPassword', data.detail || 'Failed to reset password');
            submitBtn.disabled = false;
            submitBtn.textContent = 'Update Password';
        }
    } catch (error) {
        showError('resetPassword', 'An error occurred');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Update Password';
    }
});

// Redirect to home page
function redirectToHomePage() {
    window.location.replace("./home.html")
}

// Page load animation
window.addEventListener('load', function () {
    const loginContainer = document.querySelector('.login-container');
    loginContainer.style.opacity = '0';
    loginContainer.style.transform = 'translateY(50px)';

    setTimeout(() => {
        loginContainer.style.transition = 'all 0.8s ease';
        loginContainer.style.opacity = '1';
        loginContainer.style.transform = 'translateY(0)';
    }, 100);
});















function decodeJWT(token) {
    let base64Url = token.split(".")[1];
    let base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    let jsonPayload = decodeURIComponent(
        atob(base64)
            .split("")
            .map(function (c) {
                return "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2);
            })
            .join("")
    );
    return JSON.parse(jsonPayload);
}

// Helper to store tokens and redirect
function saveTokensAndRedirect(data) {
    localStorage.setItem('access_token', data.access_token);
    localStorage.setItem('refresh_token', data.refresh_token);
    redirectToHomePage();
}

function saveTokenAndRedirect(token) {
    // This is used for compatibility if only access token is provided (like registration)
    // but ideally registration should now return refresh_token too (which it does)
    localStorage.setItem('access_token', token);
    redirectToHomePage();
}

async function handleCredentialResponse(response) {
    const responsePayload = decodeJWT(response.credential);
    // ---------------- LOGIN ----------------
    if (currentForm === 'loginForm' || currentForm === 'login') {
        const loginBtn = document.querySelector('#loginForm .login-btn');
        if (loginBtn) {
            loginBtn.textContent = 'Signing In...';
            loginBtn.disabled = true;
        }

        const res = await fetch(`${window.APP_CONFIG.API_BASE_URL}/token`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: responsePayload.email,
                sub: String(responsePayload.sub)
            })
        })
        const data = await res.json();

        if (!res.ok) {// res is ok when status code is 2XX

            loginBtn.textContent = 'Sign In';
            loginBtn.disabled = false;
            if (data.detail.type === "user") {
                showError('email', data.detail.content || 'User not found');
                throw new Error('user');
            } else if (data.detail.type === "password") {
                showError('password', data.detail.content || 'Incorrect password');
                throw new Error('password');
            } else {
                showError('email', data.detail || 'Login failed, unkown error occured');
                throw new Error('unknown');
            }
        }

        // ---- SUCCESS ----
        if ("access_token" in data) {
            showSuccess('successMessage', 'Login successful! Redirecting...');
            await hideLoginErrors();
            setTimeout(() => saveTokensAndRedirect(data), 2000);
            return;
        }

        showError('email', 'Unexpected response');
        if (loginBtn) {
            loginBtn.textContent = 'Sign In';
            loginBtn.disabled = false;
        }
    }

    // ---------------- SIGNUP ----------------
    else if (currentForm === 'signupForm') {
        const signupBtn = document.querySelector('#signupForm .login-btn');
        if (signupBtn) {
            signupBtn.textContent = 'Creating Account...';
            signupBtn.disabled = true;
        }

        const res = await fetch(`${window.APP_CONFIG.API_BASE_URL}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: responsePayload.name,
                email: responsePayload.email,
                sub: String(responsePayload.sub),
            })
        });

        const data = await res.json();

        // ---- ERROR ----
        if (!res.ok) {
            signupBtn.textContent = 'Create Account';
            signupBtn.disabled = false;//// res is ok when status code is 2XX
            if (data.detail.type === 'user') {
                showError('signupEmail', data.detail.content);
                throw new Error('user');
            } else if (data.detail.type === "password") {
                showError('signupPassword', data.detail.content);
                throw new Error('password');
            } else {
                showError('signupEmail', data.detail || 'Registration failed');
                throw new Error('unknown');
            }

        }

        // ---- SUCCESS ----
        if ("access_token" in data) {
            showSuccess('signupSuccessMessage', 'Account created! Redirecting...');
            await hideSignUpErrors();
            setTimeout(() => saveTokensAndRedirect(data), 2000);
            return;
        }

        showError('signupEmail', 'Unexpected response');
        if (signupBtn) {
            signupBtn.textContent = 'Create Account';
            signupBtn.disabled = false;
        }
    }
}


async function hideSignUpErrors() {
    hideError('signupName');
    hideError('signupEmail');
    hideError('signupPassword');
    hideError('signupConfirmPassword');
}

async function hideLoginErrors() {
    hideError('email');
    hideError('password');
}