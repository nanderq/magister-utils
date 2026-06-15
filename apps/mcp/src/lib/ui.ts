const buttonBase =
  "inline-flex min-h-12 cursor-pointer items-center justify-center gap-2.5 rounded-full border px-5 py-3.5 text-[13px] leading-none font-bold no-underline transition-[transform,background,color,border-color,box-shadow] duration-300 ease-out hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] disabled:cursor-wait disabled:opacity-55 disabled:hover:translate-y-0 [&>svg]:size-4 [&>svg]:shrink-0 [&>svg]:stroke-[1.8]";

export const button = `${buttonBase} border-[#050505] bg-[#050505] text-white`;

export const secondaryButton = `${buttonBase} border-[#cfcfcb] bg-transparent text-[#050505] hover:border-[#050505]`;

export const dangerButton = `${buttonBase} border-[#d4a09a] bg-transparent text-[#8d2d23]`;

export const card =
  "h-full rounded-[24px] border border-[#d8d8d3] bg-white p-[clamp(28px,4vw,42px)] shadow-[0_1px_0_rgba(0,0,0,0.02)] [&>h2]:mt-5 [&>h2]:mb-4 [&>h2]:[overflow-wrap:anywhere] [&>h2]:text-[clamp(25px,3vw,31px)] [&>h2]:leading-[1.08] [&>h2]:font-semibold [&>h2]:tracking-[-0.04em] [&>p]:my-0 [&>p]:leading-[1.7] [&>p]:text-[#666] [&>form]:mt-7 [&>form+form]:mt-4";

export const status =
  "inline-flex items-center gap-2 text-xs leading-none font-bold tracking-[0.04em] uppercase before:size-2 before:rounded-full before:bg-[#aaa]";

export const statusOk = `${status} before:bg-[#050505] before:shadow-[0_0_0_3px_rgba(0,0,0,0.08)]`;

export const meta =
  "font-mono text-[11px] leading-[1.7] tracking-[0.04em] text-[#777]";

export const codeBlock =
  "overflow-x-auto rounded-[15px] bg-[#0b0b0b] p-[18px] font-mono text-xs leading-[1.65] whitespace-pre text-[#f3f3f0]";

export const pageHead =
  "mb-[clamp(48px,6vw,72px)] flex items-end justify-between gap-10 max-[760px]:flex-col max-[760px]:items-start [&_h1]:m-0 [&_h1]:max-w-[720px] [&_h1]:text-[clamp(48px,6vw,82px)] [&_h1]:leading-[0.92] [&_h1]:font-semibold [&_h1]:tracking-[-0.055em] [&>p]:m-0 [&>p]:max-w-[440px] [&>p]:text-[15px] [&>p]:leading-[1.7] [&>p]:text-[#666]";

export const cardGrid = "grid grid-cols-2 gap-5 max-[760px]:grid-cols-1";
