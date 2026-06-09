(function () {
  "use strict";

  // 1. Cari tag script ini berdasarkan atribut data-tenant agar aman dari optimasi WordPress
  var script = document.currentScript || document.querySelector('script[data-tenant]');
  if (!script) return;

  var tenant = script.getAttribute("data-tenant");
  var sports = script.getAttribute("data-sports") || "";

  if (!tenant) {
    console.warn("[SportsReminder] Missing data-tenant attribute.");
    return;
  }

  // 2. AMBIL DOMAIN ASAL (VERCEL) SECARA AKURAT
  // Objek URL akan otomatis mengambil protokol dan domain dari mana script ini dipanggil
  var urlObject = new URL(script.src);
  var base = urlObject.origin; // Menghasilkan: "https://sports-reminder-module.vercel.app"

  var src = base + "/embed/" + encodeURIComponent(tenant);
  if (sports) {
    src += "?sports=" + encodeURIComponent(sports);
  }

  // 3. BUAT DAN SUNTIKKAN IFRAME
  var iframe = document.createElement("iframe");
  iframe.src = src;
  iframe.width = "100%";
  iframe.height = "650";
  iframe.setAttribute("style", "border:none;width:100%;max-width:100%;display:block;min-height:650px;");
  iframe.setAttribute("allow", "clipboard-write");
  iframe.setAttribute("loading", "lazy");
  iframe.setAttribute("title", "Sports Reminder Widget");

  script.parentNode.insertBefore(iframe, script.nextSibling);
})();