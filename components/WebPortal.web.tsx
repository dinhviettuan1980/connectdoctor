import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";

// Renders children directly into document.body, escaping all React Native
// transform/overflow ancestors that would confine position:fixed elements.
export function WebPortal({ children }: { children: React.ReactNode }) {
  const [container] = useState(() => document.createElement("div"));

  useEffect(() => {
    document.body.appendChild(container);
    return () => { document.body.removeChild(container); };
  }, [container]);

  return createPortal(children, container);
}
