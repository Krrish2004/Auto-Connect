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

        // Wait a moment then tell background.js we're done
        setTimeout(() => {
          chrome.runtime.sendMessage({ type: "loginComplete" }).catch(() => {});
        }, 3000);
      } else {
        setTimeout(tryFill, 500);
      }
    };

    tryFill();
  }

  function handleLoginFlow() {
    // Check if this is a 403 error page (Check Point "Access denied")
    const errorText = document.body?.textContent || "";
    if (errorText.includes("Access denied") && errorText.includes("403")) {
      console.log("AutoConnect: Hit 403 error page, redirecting to portal...");
      window.location.href = "https://172.22.2.6/connect/PortalMain";
      return;
    }

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

        const observerTimeout = setTimeout(() => {
          observer.disconnect();
          console.log("AutoConnect: Observer timed out waiting for login form.");
        }, OBSERVER_TIMEOUT);
      } else {
        // No regain button — redirect to portal with redirect guard
        const redirectCount = parseInt(sessionStorage.getItem("__autoConnectRedirects") || "0");
        if (redirectCount < MAX_REDIRECTS) {
          sessionStorage.setItem("__autoConnectRedirects", String(redirectCount + 1));
          console.log("AutoConnect: Logout screen without regain button, redirecting to portal...");
          window.location.href = "https://172.22.2.6/connect/PortalMain";
        } else {
          console.log("AutoConnect: Max redirects reached, stopping to prevent loop.");
          sessionStorage.removeItem("__autoConnectRedirects");
        }
      }
      return;
    }

    // Clear redirect counter on any non-logout page
    sessionStorage.removeItem("__autoConnectRedirects");

    // Check the _reconnectCycle flag — if set, logout first then re-login
    chrome.storage.local.get(["_reconnectCycle", "username", "password"], ({ _reconnectCycle, username, password }) => {
      if (!username || !password) return;

      if (_reconnectCycle) {
        // Clear the flag so it doesn't trigger again on subsequent page loads
        chrome.storage.local.remove("_reconnectCycle");

        // Look for logout/disconnect button on the success screen
        const logoutBtn = document.getElementById("UserCheck_Logoff_Button_span")
          || document.querySelector("[onclick*='logoff'], [onclick*='Logoff'], [onclick*='SignOut']");

        if (logoutBtn) {
          console.log("AutoConnect: 2hr cycle — logging out to refresh session...");
          logoutBtn.click();
          // Page will redirect to logout screen → content.js re-injects → handles re-login
        } else {
          // No logout button — might already be on login screen, just login
          console.log("AutoConnect: 2hr cycle — no logout button found, logging in...");
          autoLogin(username, password);
        }
      } else {
        // Normal flow — just login
        autoLogin(username, password);
      }
    });
  }

  // Run the flow — handle both fresh page load and dynamic injection
  if (document.readyState === "complete") {
    setTimeout(handleLoginFlow, 1000);
  } else {
    window.addEventListener("load", () => {
      setTimeout(handleLoginFlow, 1000);
    });
  }
}
