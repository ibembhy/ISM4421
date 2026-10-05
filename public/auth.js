// Email + password login with Supabase Auth. The weather only shows when signed in.

if (typeof supabase === "undefined") {
  setStatus("Couldn't load the login service. Refresh the page to try again.", true);
  throw new Error("supabase-js failed to load");
}
const db = supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

let mode = "signin"; // or "signup"
let signedIn = false;

function setMode(next) {
  mode = next;
  const signup = mode === "signup";
  $("auth-title").textContent = signup ? "Create account" : "Sign in";
  $("auth-submit").textContent = signup ? "Create account" : "Sign in";
  $("auth-password").autocomplete = signup ? "new-password" : "current-password";
  $("auth-switch-text").textContent = signup ? "Already have an account?" : "No account?";
  $("auth-switch").textContent = signup ? "Sign in" : "Create one";
  authMessage("");
}

function authMessage(text, isError = false) {
  const el = $("auth-message");
  el.textContent = text;
  el.classList.toggle("error", isError);
}

function applySession(session) {
  const user = session?.user;
  if (user && !signedIn) {
    signedIn = true;
    $("auth").hidden = true;
    $("user-email").textContent = user.email;
    $("user-bar").hidden = false;
    showWeather();
  } else if (!user && (signedIn || $("auth").hidden)) {
    signedIn = false;
    hideWeather();
    $("user-bar").hidden = true;
    $("auth").hidden = false;
    setMode("signin");
  }
}

$("auth-switch").addEventListener("click", () => setMode(mode === "signin" ? "signup" : "signin"));

$("auth-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = $("auth-email").value.trim();
  const password = $("auth-password").value;
  const button = $("auth-submit");
  button.disabled = true;
  authMessage(mode === "signup" ? "Creating account…" : "Signing in…");

  try {
    if (mode === "signup") {
      const { data, error } = await db.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: window.location.origin },
      });
      if (error) throw error;
      // No session means the project requires email confirmation first.
      if (!data.session) authMessage("Check your email for a confirmation link, then sign in.");
    } else {
      const { error } = await db.auth.signInWithPassword({ email, password });
      if (error) throw error;
    }
    $("auth-password").value = "";
  } catch (err) {
    authMessage(err.message || "Something went wrong. Try again.", true);
  } finally {
    button.disabled = false;
  }
});

$("sign-out").addEventListener("click", () => db.auth.signOut());

// Fires on page load (INITIAL_SESSION) and on every sign-in/sign-out.
db.auth.onAuthStateChange((_event, session) => applySession(session));
