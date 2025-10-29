function autoLogin(username, password) {
  const tryFill = () => {
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
      setTimeout(tryFill, 500); // Retry until inputs appear
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
      console.log("Detected logout screen. Clicking 'Regain access to the network'...");
      regainBtn.click();

      // Observe DOM for login form after redirection
      const observer = new MutationObserver(() => {
        const usernameInput = document.getElementById("LoginUserPassword_auth_username");
        if (usernameInput) {
          observer.disconnect();
          chrome.storage.local.get(["username", "password"], ({ username, password }) => {
            if (!username || !password) return;
            autoLogin(username, password);
          });
        }
      });

      observer.observe(document.body, { childList: true, subtree: true });
    }
    return;
  }

  // Normal login if not on logout screen
  chrome.storage.local.get(["username", "password"], ({ username, password }) => {
    if (!username || !password) return;
    autoLogin(username, password);
  });
}

// Run after full page load
window.addEventListener("load", () => {
  setTimeout(handleLoginFlow, 1000);
});