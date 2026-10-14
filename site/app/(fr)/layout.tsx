import type { ReactNode } from "react";
import type { Viewport } from "next";
import { Shell, metadataFor } from "@/components/Shell";
import "../globals.css";
import "@krizaka/ui/blocks.css";

export const metadata = metadataFor("fr");
export const viewport: Viewport = { width: "device-width", initialScale: 1, colorScheme: "dark light" };

export default function Layout({ children }: { children: ReactNode }) {
  return <Shell locale="fr">{children}</Shell>;
}
