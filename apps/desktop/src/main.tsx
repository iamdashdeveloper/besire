import React from "react";
import ReactDOM from "react-dom/client";
import { ClerkProvider } from "@clerk/react";
import { BrowserRouter } from "react-router-dom";
import App from "./App";

const clerkPublishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <BrowserRouter>
      {clerkPublishableKey
        ? <ClerkProvider publishableKey={clerkPublishableKey}><App /></ClerkProvider>
        : <App />}
    </BrowserRouter>
  </React.StrictMode>,
);