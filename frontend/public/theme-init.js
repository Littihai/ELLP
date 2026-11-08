// Applies the saved theme and language before the first paint (no white flash for dark-mode users).
// The React side (ThemeProvider / I18nProvider) owns the preferences after this.
(function () {
  try {
    var pref = localStorage.getItem("ellp.theme");
    var dark = pref === "dark" || (pref === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    if (dark) document.documentElement.setAttribute("data-theme", "dark");
  } catch (e) { /* storage blocked: light default */ }
  try {
    var lang = localStorage.getItem("ellp.lang");
    document.documentElement.setAttribute("lang", lang === "en" ? "en" : "th");
  } catch (e) {
    document.documentElement.setAttribute("lang", "th");
  }
})();
