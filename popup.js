const formDiv = document.getElementById("form");
const optionsDiv = document.getElementById("options");
const usernameInput = document.getElementById("username");
const passwordInput = document.getElementById("password");
const themeToggle = document.getElementById("themeSwitcher");
const statusText = document.getElementById("statusText");
const toast = document.getElementById("toast");

// Smooth view transition
function switchView(hideEl, showEl) {
  if (!hideEl || !showEl) return;
  hideEl.style.animation = "viewExit 0.25s ease forwards";
  setTimeout(() => {
    hideEl.style.display = "none";
    hideEl.style.animation = "";
    showEl.style.display = "flex";
    showEl.style.animation = "viewEnter 0.4s cubic-bezier(0.16, 1, 0.3, 1)";
  }, 250);
}

// Check if credentials are saved
chrome.storage.local.get(["username", "password"], ({ username, password }) => {
  if (username && password) {
    if (formDiv) formDiv.style.display = "none";
    if (optionsDiv) optionsDiv.style.display = "flex";
    if (statusText) statusText.textContent = "Credentials saved";
  }
});

// Save button handler
document.getElementById("save")?.addEventListener("click", function () {
  const username = usernameInput.value;
  const password = passwordInput.value;

  if (!username || !password) {
    [usernameInput, passwordInput].forEach(el => {
      if (!el.value) {
        el.parentElement.style.animation = "shake 0.4s ease";
        setTimeout(() => (el.parentElement.style.animation = ""), 400);
      }
    });
    return;
  }

  chrome.storage.local.set({ username, password }, function () {
    if (toast) toast.classList.add("show");
    if (statusText) statusText.textContent = "Credentials saved";

    setTimeout(() => {
      if (toast) toast.classList.remove("show");
      switchView(formDiv, optionsDiv);
    }, 1500);
  });
});

// Open login page
document.getElementById("connect")?.addEventListener("click", () => {
  chrome.tabs.create({ url: "https://172.22.2.6/connect/PortalMain" });
});

// Switch to form view
document.getElementById("change")?.addEventListener("click", () => {
  switchView(optionsDiv, formDiv);
  if (statusText) statusText.textContent = "Edit credentials";
});

// Load saved theme
chrome.storage.local.get(["theme"], ({ theme }) => {
  if (theme === "light") {
    document.body.classList.add("light");
  }
});

// Handle theme switch
themeToggle?.addEventListener("click", () => {
  document.body.classList.toggle("light");
  const isLight = document.body.classList.contains("light");
  chrome.storage.local.set({ theme: isLight ? "light" : "dark" });
});
