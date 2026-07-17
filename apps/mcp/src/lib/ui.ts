const buttonBase =
  "inline-flex min-h-12 cursor-pointer items-center justify-center gap-2.5 rounded-full border px-5 py-3.5 text-[13px] leading-none font-semibold no-underline transition-[transform,background,color,border-color,box-shadow] duration-300 ease-out hover:-translate-y-0.5 disabled:cursor-wait disabled:opacity-50 disabled:hover:translate-y-0 [&>svg]:size-4 [&>svg]:shrink-0 [&>svg]:stroke-[1.6]";

export const button = `${buttonBase} border-[#c8ff4a] bg-[#c8ff4a] text-[#080a09] hover:shadow-[0_10px_30px_rgba(200,255,74,0.12)]`;

export const secondaryButton = `${buttonBase} border-white/20 bg-transparent text-[#e7eae2] hover:border-white/50 hover:bg-white/[0.04]`;

export const dangerButton = `${buttonBase} border-[#743e39] bg-transparent text-[#f0968c] hover:border-[#c45f54]`;

export const card =
  "h-full border-t border-white/15 py-[clamp(28px,4vw,42px)] [&>h2]:mt-5 [&>h2]:mb-4 [&>h2]:[overflow-wrap:anywhere] [&>h2]:text-[clamp(26px,3vw,36px)] [&>h2]:leading-[1.05] [&>h2]:font-medium [&>h2]:tracking-[-0.045em] [&>p]:my-0 [&>p]:max-w-[620px] [&>p]:leading-[1.7] [&>p]:text-[#92998e] [&>form]:mt-8 [&>form+form]:mt-4";

export const status =
  "inline-flex items-center gap-2.5 font-mono text-[10px] leading-none tracking-[0.12em] text-[#858b81] uppercase before:size-1.5 before:rounded-full before:bg-[#73786f]";

export const statusOk = `${status} text-[#b7c1ad] before:bg-[#c8ff4a] before:shadow-[0_0_12px_rgba(200,255,74,0.55)]`;

export const meta =
  "font-mono text-[10px] leading-[1.9] tracking-[0.08em] text-[#737a70]";

export const codeBlock =
  "overflow-x-auto border-y border-white/15 bg-white/[0.025] p-5 font-mono text-xs leading-[1.7] whitespace-pre text-[#dfe3d9]";

export const pageHead =
  "mb-[clamp(64px,9vw,112px)] flex items-end justify-between gap-10 max-[760px]:flex-col max-[760px]:items-start [&_h1]:m-0 [&_h1]:max-w-[900px] [&_h1]:text-[clamp(52px,7.5vw,104px)] [&_h1]:leading-[0.88] [&_h1]:font-semibold [&_h1]:tracking-[-0.065em] [&>p]:m-0 [&>p]:max-w-[440px] [&>p]:text-[15px] [&>p]:leading-[1.7] [&>p]:text-[#92998e]";

export const cardGrid =
  "grid grid-cols-2 gap-x-12 gap-y-8 max-[760px]:grid-cols-1 lg:[&>*:nth-child(even)]:border-l lg:[&>*:nth-child(even)]:border-white/10 lg:[&>*:nth-child(even)]:pl-12";
