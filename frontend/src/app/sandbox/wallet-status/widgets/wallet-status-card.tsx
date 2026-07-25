import type { ReactNode } from "react";

type Row = [label: string, value: string];

type Props = {
  title: string;
  rows: Row[];
  json?: unknown;
  footer?: ReactNode;
};

export function WalletStatusCard({ title, rows, json, footer }: Props) {
  return (
    <div className="rounded-xl border border-primary-800/60 bg-primary-950/40 p-4">
      <h2 className="text-sm font-semibold text-primary-100">{title}</h2>
      <dl className="mt-3 space-y-2">
        {rows.map(([k, v]) => (
          <div key={k} className="flex items-center justify-between gap-4">
            <dt className="text-xs text-primary-300">{k}</dt>
            <dd className="text-xs font-mono text-primary-100 truncate">{v}</dd>
          </div>
        ))}
      </dl>
      {json ? (
        <pre className="mt-4 text-xs text-primary-100/90 bg-black/20 rounded-lg p-3 overflow-auto">
          {JSON.stringify(json, null, 2)}
        </pre>
      ) : null}
      {footer ? <div className="mt-4">{footer}</div> : null}
    </div>
  );
}

