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
    <html className="bg-[#17211d]" lang="en">
      <body className="m-0 bg-white font-sans text-[#17211d]">
        <MotionProvider>{children}</MotionProvider>
      </body>
    </html>
  );
}
