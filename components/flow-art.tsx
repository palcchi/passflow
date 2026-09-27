import type { CSSProperties } from "react";
import { ArrowUpRight, QrCode } from "lucide-react";

export function FlowMark({ className = "" }: { className?: string }) {
  return <svg className={`flow-mark ${className}`} viewBox="0 0 32 32" fill="none" aria-hidden="true"><path d="M8 5h10a7 7 0 0 1 0 14h-6" stroke="currentColor" strokeWidth="6" strokeLinecap="round"/><circle cx="8" cy="26" r="3.3" fill="currentColor"/></svg>;
}

export function FlowShapes({ className = "", color }: { className?: string; color?: string }) {
  return <div className={`flow-shapes ${className}`} style={color ? { "--shape-color": color } as CSSProperties : undefined} aria-hidden="true">{Array.from({ length: 8 }, (_, i) => <i key={i}/> )}</div>;
}

/** Decorative sample only. Never represents an attendee credential. */
export function FlowPass({ compact = false }: { compact?: boolean }) {
  return <div className={`flow-pass-scene ${compact ? "is-compact" : ""}`} aria-hidden="true">
    <div className="flow-art-grid"/><FlowShapes/>
    <div className="flow-pass-hanger"><div className="flow-lanyard"/><div className="flow-metal-loop"/>
      <div className="flow-pass-card"><div className="flow-pass-clip"/><div className="flow-pass-inner">
        <div className="flow-pass-brand"><span><FlowMark/>PassFlow</span><small>2026</small></div>
        <div className="flow-pass-colors"><i/><i/><i/></div>
        <div className="flow-pass-title">Make<br/>events<br/><span>flow.</span></div>
        <span className="flow-pass-category">One pass. Every moment.</span>
        <QrCode className="flow-pass-qr" strokeWidth={1.5}/>
        <div className="flow-pass-footer"><span>YOUR NEXT MOMENT</span><ArrowUpRight size={18}/></div>
      </div></div>
    </div>
    <span className="flow-art-plus">+</span><span className="flow-art-note">Same pass.<br/>More moments.</span>
  </div>;
}
