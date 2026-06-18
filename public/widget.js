/**
 * Sports Reminder Widget - Standalone Loader
 * This script defines the <sports-reminder-widget> custom element.
 */
(function () {
  "use strict";

  class SportsReminderWidget extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: "open" });
      this._config = null;
    }

    static get observedAttributes() {
      return ["token", "tenant", "sports", "layout"];
    }

    async connectedCallback() {
      this.renderLoading();
      await this.loadDependencies();
      await this.fetchConfig();
      this.render();
    }

    attributeChangedCallback() {
      if (this.isConnected) {
        this.fetchConfig().then(() => this.render());
      }
    }

    async loadDependencies() {
      if (window.React && window.ReactDOM) return;

      const reactScript = document.createElement("script");
      reactScript.src = "https://unpkg.com/react@18/umd/react.production.min.js";
      
      const reactDomScript = document.createElement("script");
      reactDomScript.src = "https://unpkg.com/react-dom@18/umd/react-dom.production.min.js";

      document.head.appendChild(reactScript);
      await new Promise(resolve => reactScript.onload = resolve);
      
      document.head.appendChild(reactDomScript);
      await new Promise(resolve => reactDomScript.onload = resolve);
    }

    async fetchConfig() {
      const token = this.getAttribute("token");
      const tenant = this.getAttribute("tenant");
      const sports = this.getAttribute("sports") || "";
      
      const scriptTag = document.currentScript || document.querySelector('script[src*="widget.js"]');
      const baseUrl = scriptTag ? new URL(scriptTag.src).origin : "https://sports-reminder-module.vercel.app";
      this._baseUrl = baseUrl;

      const url = new URL(`${baseUrl}/api/widget/config`);
      if (token) url.searchParams.set("token", token);
      if (tenant) url.searchParams.set("tenant", tenant);
      if (sports) url.searchParams.set("sports", sports);

      try {
        const res = await fetch(url);
        this._config = await res.json();
      } catch (err) {
        console.error("[SportsReminder] Failed to fetch config:", err);
      }
    }

    renderLoading() {
      this.shadowRoot.innerHTML = `
        <style>
          .loading { font-family: sans-serif; color: #64748b; padding: 20px; text-align: center; }
          .spinner { border: 2px solid #e2e8f0; border-top: 2px solid #6366f1; border-radius: 50%; width: 20px; height: 20px; animation: spin 1s linear infinite; display: inline-block; margin-bottom: 8px; }
          @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        </style>
        <div class="loading">
          <div class="spinner"></div>
          <div>Loading Widget...</div>
        </div>
      `;
    }

    async render() {
      if (!this._config) return;

      const baseUrl = this._baseUrl;
      
      // Inject Styles
      const styleId = "sports-reminder-styles";
      if (!this.shadowRoot.getElementById(styleId)) {
        const link = document.createElement("link");
        link.id = styleId;
        link.rel = "stylesheet";
        link.href = `${baseUrl}/widget.css`; // We will create this
        this.shadowRoot.appendChild(link);
      }

      // Prepare Mount Point
      let container = this.shadowRoot.getElementById("root");
      if (!container) {
        container = document.createElement("div");
        container.id = "root";
        this.shadowRoot.appendChild(container);
      }

      // Load Widget Bundle and Render
      // In a real production setup, this would be a UMD bundle.
      // For this refactor, we provide the loader logic.
      if (!window.SportsReminderWidgetBundle) {
        const bundleScript = document.createElement("script");
        bundleScript.src = `${baseUrl}/widget-bundle.js`;
        document.head.appendChild(bundleScript);
        await new Promise(resolve => bundleScript.onload = resolve);
      }

      if (window.SportsReminderWidgetBundle) {
        window.SportsReminderWidgetBundle.render(container, {
          config: this._config,
          layout: this.getAttribute("layout") || "inline",
          baseUrl: baseUrl
        });
      }
    }
  }

  if (!customElements.get("sports-reminder-widget")) {
    customElements.define("sports-reminder-widget", SportsReminderWidget);
  }

  // --- Auto-initialization for backward compatibility ---
  function initLegacyScripts() {
    const scripts = document.querySelectorAll('script[data-token], script[data-tenant]');
    scripts.forEach(script => {
      if (script.getAttribute("data-sports-reminder-init") === "true") return;
      script.setAttribute("data-sports-reminder-init", "true");

      const widget = document.createElement("sports-reminder-widget");
      
      // Map data-attributes to widget attributes
      const token = script.getAttribute("data-token");
      const tenant = script.getAttribute("data-tenant");
      const layout = script.getAttribute("data-layout");
      const sports = script.getAttribute("data-sports");

      if (token) widget.setAttribute("token", token);
      if (tenant) widget.setAttribute("tenant", tenant);
      if (layout) widget.setAttribute("layout", layout);
      if (sports) widget.setAttribute("sports", sports);

      // Insert widget after the script tag
      script.parentNode.insertBefore(widget, script.nextSibling);
    });
  }

  if (document.readyState === "complete" || document.readyState === "interactive") {
    initLegacyScripts();
  } else {
    document.addEventListener("DOMContentLoaded", initLegacyScripts);
  }
})();
