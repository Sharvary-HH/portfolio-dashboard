import { cn } from '@/lib/cn';

const TONES = [
  'bg-[#e8ecfd] text-[#2f3bb3] dark:bg-[#232a52] dark:text-[#9aa4f5]',
  'bg-[#e3f6ee] text-[#0f7a58] dark:bg-[#123329] dark:text-[#4dd3a4]',
  'bg-[#fdeee3] text-[#b25f1c] dark:bg-[#3a2314] dark:text-[#e8a765]',
  'bg-[#f6e9f8] text-[#8c3c9b] dark:bg-[#33173a] dark:text-[#d79ae4]',
  'bg-[#e6f2fb] text-[#1f6d9e] dark:bg-[#132c3f] dark:text-[#7cc0e8]',
];

function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/);
  const first = words[0]?.[0] ?? '';
  const second = words[1]?.[0] ?? words[0]?.[1] ?? '';
  return `${first}${second}`.toUpperCase();
}

function toneOf(name: string): string {
  let hash = 0;
  for (let index = 0; index < name.length; index += 1) {
    hash = (hash + name.charCodeAt(index)) % TONES.length;
  }
  return TONES[hash] ?? TONES[0]!;
}

export function TickerAvatar({ name, className }: { name: string; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        'grid size-8 shrink-0 place-items-center rounded-xl text-[0.7rem] font-semibold',
        toneOf(name),
        className,
      )}
    >
      {initialsOf(name)}
    </span>
  );
}
