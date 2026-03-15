const formDiv = document.getElementById("form");
const optionsDiv = document.getElementById("options");
const usernameInput = document.getElementById("username");
const passwordInput = document.getElementById("password");

const themeToggle = document.getElementById("themeSwitcher");
const themeLabel = document.getElementById("themeLabel");

// Check if credentials are saved
chrome.storage.local.get(["username", "password"], ({ username, password }) => {
  if (username && password) {
    formDiv.style.display = "none";
    optionsDiv.style.display = "block";
  }
});

// Save button handler
document.getElementById("save").addEventListener("click", function () {
  const username = usernameInput.value;
  const password = passwordInput.value;

  if (!username || !password) return;

  chrome.storage.local.set({ username, password }, function () {
    const toast = document.getElementById("toast");
    toast.classList.remove("hidden");
    toast.classList.add("show");

    setTimeout(() => {
      toast.classList.remove("show");
      toast.classList.add("hidden");

      // Switch view back to main
      formDiv.style.display = "none";
      optionsDiv.style.display = "block";
    }, 2000);
  });
});

// Open login page (content.js is injected automatically by background.js on page load)
document.getElementById("connect").addEventListener("click", () => {
  chrome.tabs.create({ url: "https://172.22.2.6/connect/PortalMain" });
});

// Switch to form view
document.getElementById("change").addEventListener("click", () => {
  formDiv.style.display = "block";
  optionsDiv.style.display = "none";
});

// Load saved theme
chrome.storage.local.get(["theme"], ({ theme }) => {
  if (theme === "light") {
    document.body.classList.add("light");
    themeToggle.checked = true;
    themeLabel.textContent = "☀️ Light";
  }
});

// Handle theme switch
themeToggle.addEventListener("change", () => {
  const isLight = themeToggle.checked;
  document.body.classList.toggle("light", isLight);
  chrome.storage.local.set({ theme: isLight ? "light" : "dark" });
  themeLabel.textContent = isLight ? "☀️ Light" : "🌙 Dark";
});
