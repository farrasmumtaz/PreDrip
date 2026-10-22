"use client";

import { useEffect, useRef } from "react";

export default function FormMessage({ error, success }: { error?: string; success?: string }): React.ReactElement | null {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { if (error) ref.current?.focus(); }, [error]);
  if (!error && !success) return null;
  return <div ref={ref} id="form-message" tabIndex={-1} role={error ? "alert" : "status"} className={`message ${error ? "message-error" : "message-success"}`}>{error ?? success}</div>;
}
