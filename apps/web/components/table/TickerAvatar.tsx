import { cn } from '@/lib/cn';

const TONES = [
  'bg-[#f7e3e6] text-[#a6465a] dark:bg-[#3a262a] dark:text-[#e4909c]',
  'bg-[#e7eee7] text-[#41573f] dark:bg-[#26302a] dark:text-[#a2ae9d]',
  'bg-[#f5e9dd] text-[#8a6a3a] dark:bg-[#362a1d] dark:text-[#d9a85e]',
  'bg-[#efe7e1] text-[#54463a] dark:bg-[#332a23] dark:text-[#d8c3ae]',
  'bg-[#fbe9ea] text-[#b04e60] dark:bg-[#3b2529] dark:text-[#efa2ac]',
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
