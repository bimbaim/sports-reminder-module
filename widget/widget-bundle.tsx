import React from "react";
import ReactDOM from "react-dom/client";
import { StandaloneForm } from "./standalone-form";
import "./style-shim"; // We'll create this to handle Shadow DOM styles

export function render(container: HTMLElement, props: any) {
  const root = ReactDOM.createRoot(container);
  root.render(
    <React.StrictMode>
      <StandaloneForm 
        config={props.config} 
        layout={props.layout} 
        baseUrl={props.baseUrl} 
      />
    </React.StrictMode>
  );
}

// Export for UMD usage
if (typeof window !== "undefined") {
  (window as any).SportsReminderWidgetBundle = { render };
}
