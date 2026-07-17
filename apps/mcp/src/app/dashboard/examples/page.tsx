import Link from "next/link";

import { CopyButton } from "@/components/copy-button";
import {
  MotionItem,
  MotionPage,
  MotionSection,
} from "@/components/motion-primitives";
import { pageHead } from "@/lib/ui";

export const dynamic = "force-dynamic";

export default function ExamplesPage() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const endpoint = `${appUrl.replace(/\/$/, "")}/api/mcp`;

  const examples = [
    {
      number: "01",
      title: "Claude Code",
      description:
        "Run this once in your terminal, then use /mcp in Claude Code to check the connection.",
      code: `claude mcp add --transport http mmcp ${endpoint} \\
  --header "Authorization: Bearer YOUR_MMCP_API_KEY"`,
    },
    {
      number: "02",
      title: "Cursor",
      description:
        "Add this server to .cursor/mcp.json in a project, or ~/.cursor/mcp.json for global access.",
      code: JSON.stringify(
        {
          mcpServers: {
            mmcp: {
              url: endpoint,
              headers: {
                Authorization: "Bearer YOUR_MMCP_API_KEY",
              },
            },
          },
        },
        null,
        2,
      ),
    },
    {
      number: "03",
      title: "VS Code",
      description:
        "Save this as .vscode/mcp.json. VS Code will ask for the key without storing it in the file.",
      code: JSON.stringify(
        {
          inputs: [
            {
              type: "promptString",
              id: "mmcp-key",
              description: "MMCP API key",
              password: true,
            },
          ],
          servers: {
            mmcp: {
              type: "http",
              url: endpoint,
              headers: {
                Authorization: "Bearer ${input:mmcp-key}",
              },
            },
          },
        },
        null,
        2,
      ),
    },
  ];

  return (
    <MotionPage>
      <header className={pageHead}>
        <div>
          <h1>
            Connect it
            <br />
            <span className="text-[#848a80]">your way.</span>
          </h1>
        </div>
      </header>

      <MotionSection className="border-t border-white/15">
        {examples.map((example) => (
          <MotionItem key={example.title}>
            <section className="grid gap-7 border-b border-white/15 py-10 lg:grid-cols-12 lg:gap-10 lg:py-14">
              <span className="font-mono text-[10px] text-[#6f756b] lg:col-span-1">
                {example.number}
              </span>
              <div className="lg:col-span-4">
                <h2 className="m-0 text-[clamp(2rem,3.6vw,3.6rem)] leading-none font-medium tracking-[-0.05em]">
                  {example.title}
                </h2>
                <p className="mt-5 mb-0 max-w-[430px] text-[14px] leading-[1.7] text-[#92998e]">
                  {example.description}
                </p>
              </div>
              <div className="min-w-0 lg:col-span-7">
                <div className="flex justify-end border-x border-t border-white/10 bg-white/[0.025] p-3">
                  <CopyButton label="Copy config" value={example.code} />
                </div>
                <pre className="m-0 overflow-x-auto border border-white/10 bg-white/[0.025] p-5 font-mono text-[12px] leading-[1.75] text-[#dfe3d9]">
                  <code>{example.code}</code>
                </pre>
              </div>
            </section>
          </MotionItem>
        ))}
      </MotionSection>

      <MotionSection className="flex flex-col items-start gap-5 py-12 sm:flex-row sm:items-center sm:justify-between">
        <MotionItem>
          <p className="m-0 text-[14px] text-[#92998e]">
            Replace the placeholder with the key from your API key page.
          </p>
        </MotionItem>
        <MotionItem>
          <Link
            className="text-[13px] font-semibold text-[#c8ff4a] no-underline"
            href="/dashboard/api-key"
          >
            Manage API key
          </Link>
        </MotionItem>
      </MotionSection>
    </MotionPage>
  );
}
