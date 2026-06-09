(function () {
  "use strict";

  // 1. Cari script tag secara agresif menggunakan query selector target atribut
  var script = document.querySelector('script[data-token="pub_live_19d8988dfcf946c4ca71813249200ab8"]') ||
    document.querySelector('script[data-token]') ||
    document.currentScript;

  console.log("CURRENT SCRIPT", document.currentScript);

  // Jika masih belum ketemu, cari di seluruh elemen script yang memiliki data-token atau data-tenant
  if (!script) {
    var allScripts = document.getElementsByTagName("script");
    for (var i = 0; i < allScripts.length; i++) {
      if (allScripts[i].getAttribute("data-token") || allScripts[i].getAttribute("data-tenant")) {
        script = allScripts[i];
        break;
      }
    }
  }

  if (!script) {
    console.warn("[SportsReminder] Script tag target element could not be identified in DOM.");
    return;
  }

  var token = script.getAttribute("data-token");
  var tenant = script.getAttribute("data-tenant");
  var sports = script.getAttribute("data-sports") || "";

  if (!token && !tenant) {
    console.warn("[SportsReminder] Missing data-token or data-tenant attribute.");
    return;
  }

  // Hindari duplikasi pembuatan iframe di halaman yang sama
  var identifier = token || tenant;
  var iframeId = "sports-reminder-iframe-" + identifier;
  if (document.getElementById(iframeId)) {
    return;
  }

  // 2. Tentukan domain asal Vercel secara aman dan akurat
  var base = "https://sports-reminder-module.vercel.app";
  if (script.src) {
    try {
      var urlObject = new URL(script.src);
      // Pastikan hanya mengambil origin jika script benar dari vercel atau localhost
      if (urlObject.hostname.includes("sports-reminder") || urlObject.hostname.includes("localhost")) {
        base = urlObject.origin;
      }
    } catch (e) { }
  }

  // 3. Bangun URL sumber iframe
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

  // 4. Bangun elemen iframe dan injeksikan ke dalam DOM halaman web
  var iframe = document.createElement("iframe");
  iframe.id = iframeId;
  iframe.src = src;
  iframe.width = "100%";
  iframe.height = "650";
  iframe.setAttribute("style", "border:none;width:100%;max-width:100%;display:block;min-height:650px;");
  iframe.setAttribute("allow", "clipboard-write");
  iframe.setAttribute("loading", "lazy");
  iframe.setAttribute("title", "Sports Reminder Widget");

  // Eksekusi penyuntikan iframe di bawah tag script diletakkan
  if (script.parentNode) {
    script.parentNode.insertBefore(iframe, script.nextSibling);
  } else {
    document.body.appendChild(iframe);
  }
})();