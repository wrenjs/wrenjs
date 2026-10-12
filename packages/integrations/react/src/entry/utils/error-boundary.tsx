"use client";

import React from "react";

// https://github.com/vercel/next.js/blob/33f8428f7066bf8b2ec61f025427ceb2a54c4bdf/packages/next/src/client/components/error-boundary.tsx
// https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary
class ErrorBoundary extends React.Component<{
  children?: React.ReactNode;
  errorComponent: React.FC<{
    error: Error;
    reset: () => void;
  }>;
}> {
  state: { error?: Error } = {};

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    const error = this.state.error;
    if (error) {
      return <this.props.errorComponent error={error} reset={this.reset} />;
    }
    return this.props.children;
  }

  reset = () => {
    this.setState({ error: null });
  };
}

// Minimal ErrorBoundary example to handle errors globally on browser
export function GlobalErrorBoundary(props: { children?: React.ReactNode }) {
  return <ErrorBoundary errorComponent={DefaultGlobalErrorPage}>{props.children}</ErrorBoundary>;
}

// https://github.com/vercel/next.js/blob/677c9b372faef680d17e9ba224743f44e1107661/packages/next/src/build/webpack/loaders/next-app-loader.ts#L73
// https://github.com/vercel/next.js/blob/677c9b372faef680d17e9ba224743f44e1107661/packages/next/src/client/components/error-boundary.tsx#L145
function DefaultGlobalErrorPage(props: { error: Error; reset: () => void }) {
  return (
    <html>
      <head>
        <title>Unexpected Error</title>
      </head>
      <body
        style={{
          display: "flex",
          flexDirection: "column",
          fontSize: "16px",
          fontWeight: 400,
          height: "100vh",
          lineHeight: "24px",
          placeContent: "center",
          placeItems: "center",
        }}
      >
        <p>Caught an unexpected error</p>
        <pre>
          Error:{" "}
          {import.meta.env.DEV && "message" in props.error ? props.error.message : "(Unknown)"}
        </pre>
        <button
          onClick={() => {
            React.startTransition(() => {
              props.reset();
            });
          }}
        >
          Reset
        </button>
      </body>
    </html>
  );
}
