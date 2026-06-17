(function () {
  "use strict";

  function initWidgets() {
    // Cari semua script tag yang memiliki data-token atau data-tenant
    var scripts = document.querySelectorAll('script[data-token], script[data-tenant]');
    
    if (scripts.length === 0) {
      console.warn("[SportsReminder] No script tags with data-token or data-tenant found.");
      return;
    }

    scripts.forEach(function (script) {
      // Hindari memproses ulang script yang sama
      if (script.getAttribute("data-sports-reminder-processed") === "true") {
        return;
      }
      script.setAttribute("data-sports-reminder-processed", "true");

      var token = script.getAttribute("data-token");
      var tenant = script.getAttribute("data-tenant");
      var sports = script.getAttribute("data-sports") || "";
      var layout = script.getAttribute("data-layout") || "inline";

      if (!token && !tenant) {
        console.warn("[SportsReminder] Missing both data-token and data-tenant on script element.", script);
        return;
      }

      // Tentukan domain asal secara aman dan akurat
      var base = "https://sports-reminder-module.vercel.app";
      if (script.src) {
        try {
          var urlObject = new URL(script.src);
          // Pastikan hanya mengambil origin jika script berasal dari domain resmi atau localhost
          if (urlObject.hostname.includes("sports-reminder") || urlObject.hostname.includes("localhost")) {
            base = urlObject.origin;
          }
        } catch (e) {
          console.error("[SportsReminder] Error parsing script src URL:", e);
        }
      }

      // Bangun URL sumber iframe
      var src = "";
      if (token) {
        src = base + "/embed/verify?token=" + encodeURIComponent(token);
        if (sports) {
          src += "&sports=" + encodeURIComponent(sports);
        }
      } else {
        src = base + "/embed/" + encodeURIComponent(tenant);
        if (sports) {
          src += "?sports=" + encodeURIComponent(sports);
        }
      }

      // Bangun elemen iframe
      var iframe = document.createElement("iframe");
      var identifier = token || tenant;
      // Gunakan ID unik agar tidak bertabrakan jika ada multiple widget di satu halaman
      var uniqueSuffix = Math.random().toString(36).substring(2, 9);
      iframe.id = "sports-reminder-iframe-" + identifier + "-" + uniqueSuffix;
      iframe.src = src;
      iframe.setAttribute("allow", "clipboard-write");
      iframe.setAttribute("loading", "lazy");
      iframe.setAttribute("title", "Sports Reminder Widget");
      iframe.setAttribute("allowtransparency", "true");

      var style = "border:none;display:block;";
      if (layout === "sticky") {
        style += "position:fixed;bottom:0;right:0;z-index:999999;width:450px;height:800px;background:transparent;";
      } else {
        style += "width:100%;max-width:100%;min-height:650px;height:650px;";
      }
      iframe.setAttribute("style", style);

      // Injeksi iframe ke DOM dengan aman
      var parent = script.parentNode;
      
      // Jika sticky, selalu append ke body untuk menghindari overflow:hidden dari parent (misal footer WP)
      if (layout === "sticky") {
        if (document.body) {
          document.body.appendChild(iframe);
        } else {
          window.addEventListener("load", function () {
            document.body.appendChild(iframe);
          });
        }
      } else {
        // Logika inline: diletakkan di posisi script atau body fallback
        if (parent && parent.tagName !== "HEAD" && parent.tagName !== "HTML") {
          parent.insertBefore(iframe, script.nextSibling);
        } else {
          console.warn("[SportsReminder] Script tag is in <head> or has no valid body parent. Appending to body instead.");
          if (document.body) {
            document.body.appendChild(iframe);
          } else {
            window.addEventListener("load", function () {
              document.body.appendChild(iframe);
            });
          }
        }
      }
    });
  }

  // Inisialisasi secara aman berdasarkan kesiapan DOM
  if (document.readyState === "complete" || document.readyState === "interactive") {
    initWidgets();
  } else {
    document.addEventListener("DOMContentLoaded", initWidgets);
    window.addEventListener("load", initWidgets);
  }
})();