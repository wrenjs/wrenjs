"use client";

/**
 * Counter — a Client Component that also calls a Server Action.
 *
 * The "use client" directive marks the boundary: this module and its
 * dependencies are bundled for the browser.  The RSC serializer emits
 * a client reference instead of inlining the component.
 *
 * Calling `incrementCounter()` triggers a POST to the server via the
 * callServer mechanism wired up in entry.client.tsx.
 */
import { useState, useTransition } from "react";
import { incrementCounter } from "../actions/demo.ts";

interface CounterProps {
  count?: number;
}
export function Counter(props: CounterProps) {
  const [count, setCount] = useState(0);
  const [serverCount, setServerCount] = useState(props.count);
  const [isPending, startTransition] = useTransition();

  function handleLocalClick() {
    setCount((c) => c + 1);
  }

  function handleServerClick() {
    startTransition(async () => {
      const result = await incrementCounter();
      setServerCount(result);
    });
  }

  return (
    <div>
      <p>Client count: {count}</p>
      <button onClick={handleLocalClick}>Increment (client)</button>

      <p>
        Server count: {serverCount ?? "—"} {isPending && "(loading...)"}
      </p>
      <button onClick={handleServerClick}>Increment (server action)</button>
    </div>
  );
}
