import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ClerkProvider, useAuth } from "@clerk/clerk-react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ConvexReactClient } from "convex/react";
import "@/styles/globals.css";
import App from "./App.tsx";

const convexUrl = import.meta.env.VITE_CONVEX_URL;
const clerkPublishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

const missingEnvVars = [
  !convexUrl ? "VITE_CONVEX_URL" : null,
  !clerkPublishableKey ? "VITE_CLERK_PUBLISHABLE_KEY" : null,
].filter((v): v is string => Boolean(v));

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {missingEnvVars.length > 0 ? (
      <main className="min-h-screen flex items-center justify-center p-6">
        <section className="w-full max-w-xl rounded-xl border border-destructive/30 bg-destructive/5 p-6">
          <h1 className="text-lg font-semibold">Missing required environment variables</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Add the variables below to <code>.env.local</code>, then restart <code>npm run dev</code>.
          </p>
          <pre className="mt-4 rounded bg-background p-3 text-sm">
            {missingEnvVars.map((name) => `${name}=...`).join("\n")}
          </pre>
        </section>
      </main>
    ) : (
      <ClerkProvider publishableKey={clerkPublishableKey} afterSignOutUrl="/">
        <ConvexProviderWithClerk client={new ConvexReactClient(convexUrl as string)} useAuth={useAuth}>
          <App />
        </ConvexProviderWithClerk>
      </ClerkProvider>
    )}
  </StrictMode>
);
