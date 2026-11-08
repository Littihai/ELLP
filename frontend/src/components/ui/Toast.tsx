import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { Icon } from "./kit";
import type { StatusTone } from "@/types";

interface Toast { id: number; tone: StatusTone; text: string }
interface Ctx { toast: (text: string, tone?: StatusTone) => void }
const ToastContext = createContext<Ctx | null>(null);
let seq = 0;

/** Bottom-right notices, at most three, gone after four seconds. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);
  const toast = useCallback((text: string, tone: StatusTone = "ok") => {
    const id = ++seq;
    setItems((xs) => [...xs.slice(-2), { id, tone, text }]);
    window.setTimeout(() => setItems((xs) => xs.filter((x) => x.id !== id)), 4000);
  }, []);
  const value = useMemo(() => ({ toast }), [toast]);
  const icon = (tone: StatusTone) => (tone === "ok" ? "checkCircle" : tone === "stop" ? "alert" : tone === "warn" ? "alert" : "info");
  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-stack" aria-live="polite">
        {items.map((x) => (
          <div key={x.id} className="toast" data-tone={x.tone}>
            <Icon name={icon(x.tone)} size={16} color={x.tone === "ok" ? "var(--tone-ok-solid)" : x.tone === "stop" ? "var(--tone-stop-solid)" : x.tone === "warn" ? "var(--tone-warn-solid)" : "var(--color-accent)"} />
            <span>{x.text}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): Ctx {
  const c = useContext(ToastContext);
  if (!c) throw new Error("useToast outside ToastProvider");
  return c;
}
