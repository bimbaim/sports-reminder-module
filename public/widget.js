(function () {
  "use strict";

  // 1. Find the script tag with data-token or data-tenant.
  var script = document.currentScript;
  if (!script) {
    var scripts = document.getElementsByTagName("script");
    for (var i = 0; i < scripts.length; i++) {
      if (scripts[i].getAttribute("data-token") || scripts[i].getAttribute("data-tenant")) {
        script = scripts[i];
        break;
      }
    }
  }

  if (!script) return;

  var token = script.getAttribute("data-token");
  var tenant = script.getAttribute("data-tenant");
  var sports = script.getAttribute("data-sports") || "";

  console.log("SCRIPT", script);
  console.log("TOKEN", token);
  console.log("SPORTS", sports);

  if (!token && !tenant) {
    console.warn("[SportsReminder] Missing data-token or data-tenant attribute.");
    return;
  }

  // Avoid inserting duplicate iframe
  var identifier = token || tenant;
  var iframeId = "sports-reminder-iframe-" + identifier;
  if (document.getElementById(iframeId)) {
    return;
  }

  // 2. Determine base domain
  var base = "https://sports-reminder-module.vercel.app";
  if (script.src && (script.src.indexOf("sports-reminder-module") !== -1 || script.src.indexOf("localhost") !== -1)) {
    try {
      var urlObject = new URL(script.src);
      base = urlObject.origin;
    } catch (e) { }
  }

  // 3. Build iframe source
  var src = "";
  if (token) {
    src = base + "/embed/verify?token=" + encodeURIComponent(token);
    if (sports) {
      src += "&sports=" + encodeURIComponent(sports);
    }
  } else {
    // Backward compatibility for slug
    src = base + "/embed/" + encodeURIComponent(tenant);
    if (sports) {
      src += "?sports=" + encodeURIComponent(sports);
    }
  }

  // 4. Create and inject iframe
  var iframe = document.createElement("iframe");
  iframe.id = iframeId;
  iframe.src = src;
  iframe.width = "100%";
  iframe.height = "650";
  iframe.setAttribute("style", "border:none;width:100%;max-width:100%;display:block;min-height:650px;");
  iframe.setAttribute("allow", "clipboard-write");
  iframe.setAttribute("loading", "lazy");
  iframe.setAttribute("title", "Sports Reminder Widget");

  if (script.parentNode) {
    script.parentNode.insertBefore(iframe, script.nextSibling);
  } else {
    document.body.appendChild(iframe);
  }
})();