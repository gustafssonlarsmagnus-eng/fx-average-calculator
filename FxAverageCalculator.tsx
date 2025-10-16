import React, { useMemo, useState, useRef, useEffect } from "react";
import { Plus, Trash2, RefreshCcw, Calculator, Copy, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface FillRow { id: string; amount: string; rate: string; }
function uid() { return Math.random().toString(36).slice(2, 9); }

const nf2 = new Intl.NumberFormat("sv-SE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function parseNumber(s: string): number {
  if (!s && s !== "0") return NaN;
  const n = Number(String(s).replace(/\s/g, '').replace(/,/g, '.').trim());
  return Number.isFinite(n) ? n : NaN;
}

function computeStats(rows: FillRow[], targetTotal: string) {
  const amt = rows.reduce((sum, r) => {
    const a = parseNumber(r.amount);
    return sum + (Number.isFinite(a) ? a : 0);
  }, 0);
  const notional = rows.reduce((sum, r) => {
    const a = parseNumber(r.amount);
    const p = parseNumber(r.rate);
    return sum + (Number.isFinite(a) && Number.isFinite(p) ? a * p : 0);
  }, 0);
  const avg = amt > 0 ? notional / amt : 0;
  const tgt = parseNumber(targetTotal);
  const rem = Number.isFinite(tgt) ? Math.max(0, tgt - amt) : 0;
  return { totalAmount: amt, weightedAvg: avg, remaining: rem };
}

export default function FxAverageCalculator() {
  const [pair, setPair] = useState("USD/SEK");
  const [decimals, setDecimals] = useState(4);
  const [targetTotal, setTargetTotal] = useState<string>("100");
  const [rows, setRows] = useState<FillRow[]>([
    { id: uid(), amount: "18", rate: "9.4850" },
    { id: uid(), amount: "12", rate: "9.4860" },
    { id: uid(), amount: "43", rate: "9.4825" },
  ]);
  const [dark, setDark] = useState(false);

  const amountRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const rateRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const [focusId, setFocusId] = useState<string | null>(null);

  useEffect(() => {
    if (focusId && amountRefs.current[focusId]) {
      const el = amountRefs.current[focusId]!;
      el.focus();
      const len = el.value.length;
      if ((el as any).setSelectionRange) (el as any).setSelectionRange(len, len);
      setFocusId(null);
    }
  }, [focusId, rows]);

  const numberFmt = useMemo(
    () => new Intl.NumberFormat("sv-SE", { minimumFractionDigits: decimals, maximumFractionDigits: decimals }),
    [decimals]
  );

  const { totalAmount, weightedAvg, remaining } = useMemo(() => computeStats(rows, targetTotal), [rows, targetTotal]);

  function addRow() { const id = uid(); setRows((r) => [...r, { id, amount: "", rate: "" }]); setFocusId(id); }
  function deleteRow(id: string) { setRows((r) => r.filter((x) => x.id !== id)); }
  function resetAll() { setPair("USD/SEK"); setDecimals(4); setTargetTotal("100"); setRows([{ id: uid(), amount: "", rate: "" }]); }

  async function copySummary() {
    const done = `${nf2.format(totalAmount)} mio`;
    const avg = numberFmt.format(weightedAvg || 0);
    const rem = `${nf2.format(remaining)} mio`;
    const text = `Pair: ${pair}\nDone: ${done}\nAverage: ${avg}\nRemaining vs target: ${rem}`;
    try { await navigator.clipboard.writeText(text); toast.success("Summary copied"); } catch { toast.error("Could not copy summary"); }
  }

  return (
    <div className={dark ? "dark" : ""}>
      <div className="min-h-screen w-full bg-slate-50 dark:bg-slate-900 p-3">
        <div className="mx-auto max-w-xl">
          <div className="flex items-center justify-between gap-1 pb-2 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-1">
              <Calculator className="h-3 w-3 text-slate-700 dark:text-slate-200" />
              <div className="text-base font-semibold text-slate-800 dark:text-slate-100">FX Average</div>
            </div>
            <div className="flex items-center gap-1 text-[11px] text-slate-600 dark:text-slate-300">
              <span>Dark</span><Switch className="scale-50" checked={dark} onCheckedChange={setDark} />{dark ? <Moon className="h-3 w-3"/> : <Sun className="h-3 w-3"/>}
            </div>
          </div>

          <div className="grid grid-cols-12 gap-1 py-2">
            <div className="col-span-4 flex items-center gap-1">
              <Label htmlFor="pair" className="text-[11px] w-10 text-slate-500 dark:text-slate-300">Pair</Label>
              <Input id="pair" className="h-7" value={pair} onChange={(e) => setPair(e.target.value.toUpperCase())} />
            </div>
            <div className="col-span-4 flex items-center gap-1">
              <Label htmlFor="target" className="text-[11px] w-10 text-slate-500 dark:text-slate-300">Target</Label>
              <Input id="target" className="h-7" inputMode="decimal" value={targetTotal}
                onChange={(e) => setTargetTotal(e.target.value)}
                onBlur={(e) => { const n = parseNumber(e.target.value); setTargetTotal(Number.isFinite(n) ? String(n) : ""); }}
                placeholder="100"
              />
            </div>
            <div className="col-span-4 flex items-center justify-end gap-3">
              <div className="flex items-center gap-1">
                <Label htmlFor="dec" className="text-[11px] text-slate-500 dark:text-slate-300">dp</Label>
                <Input id="dec" inputMode="numeric" className="h-7 w-10 text-center" value={decimals}
                  onChange={(e) => setDecimals(Math.min(8, Math.max(0, Number(e.target.value) || 0)))} />
              </div>
              <Button size="sm" variant="secondary" onClick={addRow} className="h-7 gap-1"><Plus className="h-3 w-3"/>Row</Button>
              <Button size="sm" variant="ghost" onClick={resetAll} className="h-7 gap-1"><RefreshCcw className="h-3 w-3"/>Reset</Button>
            </div>
          </div>

          <div className="rounded-md border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="grid grid-cols-12 text-[11px] px-1 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
              <div className="col-span-5">Amount (mio)</div>
              <div className="col-span-5">Rate</div>
              <div className="col-span-2 text-right">Actions</div>
            </div>
            <div className="divide-y divide-slate-200 dark:divide-slate-800">
              {rows.map((row, idx) => (
                <div key={row.id} className="grid grid-cols-12 items-center gap-1 px-1 py-0.5">
                  <div className="col-span-5"><Input className="h-6 px-2 text-sm rounded-sm placeholder:text-[10px]" inputMode="decimal" value={row.amount}
                    ref={(el) => (amountRefs.current[row.id] = el)}
                    onChange={(e) => setRows((r) => r.map((x) => x.id === row.id ? { ...x, amount: e.target.value } : x))}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); rateRefs.current[row.id]?.focus(); } }}
                    onBlur={(e) => { const n = parseNumber(e.target.value); setRows((r) => r.map((x) => x.id === row.id ? { ...x, amount: Number.isFinite(n) ? String(n) : '' } : x)); }}
                    placeholder='18' /></div>
                  <div className="col-span-5"><Input className="h-6 px-2 text-sm rounded-sm placeholder:text-[10px]" inputMode="decimal" value={row.rate}
                    ref={(el) => (rateRefs.current[row.id] = el)}
                    onChange={(e) => setRows((r) => r.map((x) => x.id === row.id ? { ...x, rate: e.target.value } : x))}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addRow(); } }}
                    onBlur={(e) => { const n = parseNumber(e.target.value); const f = Number.isFinite(n) ? n.toFixed(decimals) : ''; setRows((r) => r.map((x) => x.id === row.id ? { ...x, rate: f } : x)); }}
                    placeholder="9.4850" /></div>
                  <div className="col-span-2 flex justify-end"><Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => deleteRow(row.id)} aria-label={`Delete row ${idx+1}`}><Trash2 className="h-3 w-3"/></Button></div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-2 grid grid-cols-12 gap-1">
            <Chip label="PAIR" value={pair} className="col-span-4" />
            <Chip label={"DONE (MIO)"} value={nf2.format(totalAmount)} className="col-span-4" />
            <Chip label="AVG" value={numberFmt.format(weightedAvg || 0)} className="col-span-4" />
            <Chip label={"REMAIN (MIO)"} value={nf2.format(remaining)} className="col-span-8" />
            <div className="col-span-4 flex items-center justify-end gap-1">
              <Button size="sm" className="h-7 gap-1" onClick={copySummary}><Copy className="h-3 w-3"/>Copy</Button>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">Σ(a × r) ÷ Σ(a)</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Chip({ label, value, className = "" }: { label: string; value: string; className?: string }) {
  return (
    <div className={`rounded-md border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-800/70 px-1 py-0.5 ${className}`}>
      <div className="text-[10px] text-slate-500 dark:text-slate-400">{label}</div>
      <div className="text-base font-semibold tabular-nums text-slate-800 dark:text-slate-100">{value}</div>
    </div>
  );
}

export function runCalculatorTests() {
  const rowsA: FillRow[] = [
    { id: '1', amount: '18', rate: '9.4850' },
    { id: '2', amount: '12', rate: '9.4860' },
    { id: '3', amount: '43', rate: '9.4825' },
  ];
  const s1 = computeStats(rowsA, '100');
  if (Math.abs(s1.totalAmount - 73) > 1e-9) throw new Error('totalAmount failed');
  const expectedAvg = (18*9.4850 + 12*9.4860 + 43*9.4825)/73;
  if (Math.abs(s1.weightedAvg - expectedAvg) > 1e-9) throw new Error('weightedAvg failed');
  if (Math.abs(s1.remaining - 27) > 1e-9) throw new Error('remaining failed');

  const rowsB: FillRow[] = [
    { id: '1', amount: '1 000', rate: '9,5' },
    { id: '2', amount: '2 000', rate: '9,6' },
  ];
  const s2 = computeStats(rowsB, '5000');
  if (Math.abs(s2.totalAmount - 3000) > 1e-9) throw new Error('totalAmount spaces/commas failed');
  const expectedAvg2 = (1000*9.5 + 2000*9.6)/3000;
  if (Math.abs(s2.weightedAvg - expectedAvg2) > 1e-9) throw new Error('weightedAvg spaces/commas failed');
  if (Math.abs(s2.remaining - 2000) > 1e-9) throw new Error('remaining spaces/commas failed');

  return 'ok';
}

export const _internal = { parseNumber, computeStats };

chore: add calculator component
