import { FlowMark } from "@/components/flow-art";

// Small attribution on every public event page, Figma-designed or default.
export function MadeWithPassFlow() {
  return <a className="made-with-passflow" href="https://passflow.my.id/?ref=event" target="_blank" rel="noopener">
    <FlowMark/><span>Made with <b>PassFlow</b></span>
  </a>;
}
