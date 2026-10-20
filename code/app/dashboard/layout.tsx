import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth/session";

export default async function DashboardLayout({ children }: { children: ReactNode }): Promise<ReactNode> {
  // Authenticate before the page loading boundary can flush a streamed response.
  if (!await getCurrentUser()) redirect("/login");
  return children;
}
