import { Badge } from "@/components/ui/badge";

const TAG_COLORS = [
  "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  "bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300",
  "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300",
  "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300",
  "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
];

function getTagColor(name: string, color?: string | null) {
  if (color) return color;
  const hash = name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return TAG_COLORS[hash % TAG_COLORS.length];
}

export function TagBadge({ name, color }: { name: string; color?: string | null }) {
  const colorClass = getTagColor(name, color);

  return (
    <Badge variant="outline" className={`text-[10px] px-1.5 py-0 font-normal border-0 ${colorClass}`}>
      {name}
    </Badge>
  );
}
