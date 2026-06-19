const SUPABASE_URL = 'https://ssyaklpnjhoxukfanyxb.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNzeWFrbHBuamhveHVrZmFueXhiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODExNjA2NzUsImV4cCI6MjA5NjczNjY3NX0.H95B092ZXEAQz3l6-QefzWt44RZLpp5PdiEbLktstGE';

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const loginForm = document.getElementById('loginForm');
const signupForm = document.getElementById('signupForm');
const tabs = document.querySelectorAll('.tab');
const tabIndicator = document.querySelector('.tab-indicator');
const switchBtns = document.querySelectorAll('[data-switch]');
const passwordToggles = document.querySelectorAll('.password-toggle');
const toastContainer = document.getElementById('toastContainer');


const forgotPasswordBtn = document.getElementById('forgotPasswordBtn');
const forgotModal = document.getElementById('forgotModal');
const closeForgotModal = document.getElementById('closeForgotModal');
const sendResetLink = document.getElementById('sendResetLink');
const resetEmail = document.getElementById('resetEmail');

forgotPasswordBtn.addEventListener('click', (e) => {
  e.preventDefault();
  
  resetEmail.value = document.getElementById('loginEmail').value.trim();
  forgotModal.classList.add('is-active');
});

closeForgotModal.addEventListener('click', () => {
  forgotModal.classList.remove('is-active');
});

forgotModal.addEventListener('click', (e) => {
  if (e.target === forgotModal) {
    forgotModal.classList.remove('is-active');
  }
});

sendResetLink.addEventListener('click', async () => {
  const email = resetEmail.value.trim();
  
  if (!email) {
    showToast('Please enter your email address.', 'error');
    return;
  }
  
  try {
    setLoading(sendResetLink, true);
    
    const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password.html`
    });
    
    if (error) throw error;
    
    showToast('Password reset link sent. Please check your email.', 'success');
    forgotModal.classList.remove('is-active');
  } catch (error) {
    showToast(error.message || 'Unable to send reset link.', 'error');
  } finally {
    setLoading(sendResetLink, false);
  }
});


function showTab(tabName) {
  tabs.forEach(tab => tab.classList.remove('is-active'));
  document.querySelector(`[data-tab="${tabName}"]`)?.classList.add('is-active');

  loginForm.classList.toggle('is-active', tabName === 'login');
  signupForm.classList.toggle('is-active', tabName === 'signup');
  tabIndicator.classList.toggle('is-signup', tabName === 'signup');
}

tabs.forEach(tab => {
  tab.addEventListener('click', () => showTab(tab.dataset.tab));
});

switchBtns.forEach(btn => {
  btn.addEventListener('click', () => showTab(btn.dataset.switch));
});

passwordToggles.forEach(btn => {
  btn.addEventListener('click', () => {
    const input = btn.parentElement.querySelector('input');
    input.type = input.type === 'password' ? 'text' : 'password';
    btn.classList.toggle('is-visible');
  });
});

function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;

  toast.innerHTML = `
    <div class="toast__msg">${message}</div>
    <button class="toast__close" type="button">×</button>
  `;

  toastContainer.appendChild(toast);

  toast.querySelector('.toast__close').addEventListener('click', () => {
    toast.remove();
  });

  setTimeout(() => {
    toast.classList.add('is-leaving');
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

function setLoading(button, isLoading) {
  button.classList.toggle('is-loading', isLoading);
  button.disabled = isLoading;
}

async function createUserProfile(user, fullName, goal) {
  const detectedTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const { error } = await supabaseClient
    .from('cycle_profile')
    .insert([
      {
        id: user.id,
        full_name: fullName,
        email: user.email,
        goal: goal,
        role: 'user',
        timezone: detectedTimezone
      }
    ]);

  if (error) throw error;
}


async function getUserRole(userId) {
  const { data, error } = await supabaseClient
    .from('cycle_profile')
    .select('role')
    .eq('id', userId)
    .single();

  if (error) return 'user';

  return data?.role || 'user';
}

async function redirectUser(userId) {
  const role = await getUserRole(userId);

  if (role === 'admin') {
    window.location.href = 'admin.html';
  } else {
    window.location.href = 'dashboard.html';
  }
}

signupForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const button = signupForm.querySelector('.btn-primary');

  const fullName = document.getElementById('signupName').value.trim();
  const email = document.getElementById('signupEmail').value.trim();
  const password = document.getElementById('signupPassword').value.trim();
  const confirmPassword = document.getElementById('confirmPassword').value.trim();
  const goal = document.getElementById('goal').value;

  if (!fullName || !email || !password || !confirmPassword || !goal) {
    showToast('Please fill all fields.', 'error');
    return;
  }

  if (password.length < 6) {
    showToast('Password must be at least 6 characters.', 'error');
    return;
  }

  if (password !== confirmPassword) {
    showToast('Passwords do not match.', 'error');
    return;
  }

  try {
    setLoading(button, true);

    const { data, error } = await supabaseClient.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          goal: goal
        }
      }
    });

    if (error) throw error;

    if (data.user) {
      await createUserProfile(data.user, fullName, goal);

    }

    showToast('Account created successfully. Redirecting...', 'success');

    setTimeout(() => {
      redirectUser(data.user.id);
    }, 1000);

  } catch (error) {
    showToast(error.message || 'Signup failed. Try again.', 'error');
  } finally {
    setLoading(button, false);
  }
});



loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const button = loginForm.querySelector('.btn-primary');

  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value.trim();

  if (!email || !password) {
    showToast('Please enter your email and password.', 'error');
    return;
  }

  try {
    setLoading(button, true);

    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email,
      password
    });

    if (error) throw error;

    showToast('Login successful.', 'success');

    setTimeout(() => {
      redirectUser(data.user.id);
    }, 700);



  } catch (error) {
    showToast(error.message || 'Invalid login details.', 'error');
  } finally {
    setLoading(button, false);
  }
});


async function checkAuthState() {
  const { data } = await supabaseClient.auth.getSession();

  if (data.session?.user) {
    redirectUser(data.session.user.id);
  }
}

checkAuthState();