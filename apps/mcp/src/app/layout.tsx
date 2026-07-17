import type { Metadata } from "next";
import type { ReactNode } from "react";

import { MotionProvider } from "@/components/motion-primitives";

import "./globals.css";

export const metadata: Metadata = {
  title: "MMCP",
  description: "Connect your Magister data to MCP-compatible assistants.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html className="bg-[#080a09] [color-scheme:dark]" lang="en">
      <body className="m-0 bg-[#080a09] font-sans text-[#f2f4ed]">
        <MotionProvider>{children}</MotionProvider>
      </body>
    </html>
  );
}
