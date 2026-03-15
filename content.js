// Guard against double injection (manifest content_scripts + tabs.onUpdated both inject)
if (window.__autoConnectInjected) {
  // Already running, skip
} else {
  window.__autoConnectInjected = true;

  const MAX_RETRIES = 20; // 20 * 500ms = 10 seconds max wait
  const OBSERVER_TIMEOUT = 15000; // 15 seconds max for MutationObserver
  const MAX_REDIRECTS = 3; // Prevent infinite redirect loops

  function autoLogin(username, password) {
    let retries = 0;

    const tryFill = () => {
      if (retries >= MAX_RETRIES) {
        console.log("AutoConnect: Login form not found after " + MAX_RETRIES + " retries, giving up.");
        return;
      }
      retries++;

      const usernameInput = document.getElementById("LoginUserPassword_auth_username");
      const passwordInput = document.getElementById("LoginUserPassword_auth_password");
      const loginButton = document.getElementById("UserCheck_Login_Button");

      if (usernameInput && passwordInput && loginButton) {
        usernameInput.focus();
        usernameInput.value = username;
        usernameInput.dispatchEvent(new Event("input", { bubbles: true }));

        passwordInput.focus();
        passwordInput.value = password;
        passwordInput.dispatchEvent(new Event("input", { bubbles: true }));

        loginButton.click();
      } else {
        setTimeout(tryFill, 500);
      }
    };

    tryFill();
  }

  function handleLoginFlow() {
    // Check if on logout screen
    const logoutMsg = Array.from(document.querySelectorAll("p")).find(p =>
      p.textContent.includes("You have logged out from the network")
    );

    if (logoutMsg) {
      const regainBtn = document.querySelector("span.portal_link[onclick*='Reset']");
      if (regainBtn) {
        console.log("AutoConnect: Detected logout screen. Clicking 'Regain access'...");
        regainBtn.click();

        // Observe DOM for login form after redirection (with timeout)
        const observer = new MutationObserver(() => {
          const usernameInput = document.getElementById("LoginUserPassword_auth_username");
          if (usernameInput) {
            observer.disconnect();
            clearTimeout(observerTimeout);
            chrome.storage.local.get(["username", "password"], ({ username, password }) => {
              if (!username || !password) return;
              autoLogin(username, password);
            });
          }
        });

        observer.observe(document.body, { childList: true, subtree: true });

        // Disconnect observer after timeout to prevent memory leak
        const observerTimeout = setTimeout(() => {
          observer.disconnect();
          console.log("AutoConnect: Observer timed out waiting for login form.");
        }, OBSERVER_TIMEOUT);
      } else {
        // No regain button — redirect to portal root with redirect guard
        const redirectCount = parseInt(sessionStorage.getItem("__autoConnectRedirects") || "0");
        if (redirectCount < MAX_REDIRECTS) {
          sessionStorage.setItem("__autoConnectRedirects", String(redirectCount + 1));
          console.log("AutoConnect: Logout screen without regain button, redirecting to portal...");
          window.location.href = "https://172.22.2.6";
        } else {
          console.log("AutoConnect: Max redirects reached, stopping to prevent loop.");
          sessionStorage.removeItem("__autoConnectRedirects");
        }
      }
      return;
    }

    // Clear redirect counter on any non-logout page
    sessionStorage.removeItem("__autoConnectRedirects");

    // Check if on a "Logged In" / success screen — need to logout first for 2hr refresh
    const loggedInMsg = document.querySelector("#LoggedOutAlertBox, #SuccessMessageBox");
    if (loggedInMsg) {
      const logoutBtn = document.querySelector("[onclick*='logoff'], [onclick*='Logoff'], #UserCheck_498_498_CancelButton");
      if (logoutBtn) {
        console.log("AutoConnect: 2hr cycle — logging out to refresh session...");
        logoutBtn.click();
        return;
      }
    }

    // Normal login if on login screen
    chrome.storage.local.get(["username", "password"], ({ username, password }) => {
      if (!username || !password) return;
      autoLogin(username, password);
    });
  }

  // Run the flow — handle both fresh page load and dynamic injection (after load already fired)
  if (document.readyState === "complete") {
    setTimeout(handleLoginFlow, 1000);
  } else {
    window.addEventListener("load", () => {
      setTimeout(handleLoginFlow, 1000);
    });
  }
}
