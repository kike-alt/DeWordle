"use client";

type Props = {
  label: string;
  onClick: () => void;
  tone?: "default" | "danger";
};

export function ActionButton({ label, onClick, tone = "default" }: Props) {
  const base =
    "px-3 py-2 rounded-md text-sm font-medium border transition-colors select-none";
  const style =
    tone === "danger"
      ? "bg-red-950/40 border-red-900/60 hover:bg-red-950/60 text-red-100"
      : "bg-primary-900/30 border-primary-700/50 hover:bg-primary-900/50 text-primary-50";

  return (
    <button type="button" className={`${base} ${style}`} onClick={onClick}>
      {label}
    </button>
  );
}

