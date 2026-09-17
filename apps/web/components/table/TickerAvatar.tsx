import { cn } from '@/lib/cn';

const TONES = [
  'bg-[#e3f3f2] text-[#176b68] dark:bg-[#16302f] dark:text-[#5fc9c5]',
  'bg-[#f3e8ef] text-[#7a4f6b] dark:bg-[#2b1f28] dark:text-[#c79cb6]',
  'bg-[#fdf0df] text-[#8a5f2c] dark:bg-[#2b2113] dark:text-[#f4cca9]',
  'bg-[#eef1f1] text-[#41565c] dark:bg-[#1f2f35] dark:text-[#b7c6ca]',
  'bg-[#e7f1f4] text-[#2a6c7d] dark:bg-[#172c33] dark:text-[#7fc0d1]',
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
