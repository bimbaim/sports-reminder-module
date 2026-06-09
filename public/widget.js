(function () {
  "use strict";

  var script = document.currentScript;
  if (!script) return;

  var tenant = script.getAttribute("data-tenant");
  var sports  = script.getAttribute("data-sports") || "";

  if (!tenant) {
    console.warn("[SportsReminder] Missing data-tenant attribute.");
    return;
  }

  var base = script.src.replace(/\/widget\.js.*$/, "");

  var src = base + "/embed/" + encodeURIComponent(tenant);
  if (sports) {
    src += "?sports=" + encodeURIComponent(sports);
  }

  var iframe = document.createElement("iframe");
  iframe.src    = src;
  iframe.width  = "100%";
  iframe.height = "650";
  iframe.setAttribute("style", "border:none;width:100%;max-width:100%;display:block;");
  iframe.setAttribute("allow", "clipboard-write");
  iframe.setAttribute("loading", "lazy");
  iframe.setAttribute("title", "Sports Reminder Widget");

  script.parentNode.insertBefore(iframe, script.nextSibling);
})();
