import type { CSSProperties, ReactNode } from "react";
import type { MoveOffset } from "@/engine/types";

/** Normalize a stored offset — plain numbers are legacy vertical-only nudges. */
export function normalizeOffset(o: MoveOffset | undefined | null): { x: number; y: number } {
  if (typeof o === "number") return { x: 0, y: o };
  if (o && typeof o === "object") return { x: o.x || 0, y: o.y || 0 };
  return { x: 0, y: 0 };
}

/**
 * Wraps a block that can be dragged anywhere within its section. The saved
 * offset (px) is applied as a translate so it renders the same on the published
 * page. In the editor (embed edit mode) these `[data-move]` blocks become
 * drag-to-reposition; `data-offset-x/y` seed the drag with the current value.
 */
export function Movable({
  moveKey,
  offset,
  className,
  style,
  children,
}: {
  moveKey: string;
  offset?: MoveOffset;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  const { x, y } = normalizeOffset(offset);
  return (
    <div
      data-move={moveKey}
      data-offset-x={x}
      data-offset-y={y}
      className={className}
      style={{ transform: x || y ? `translate(${x}px, ${y}px)` : undefined, ...style }}
    >
      {children}
    </div>
  );
}
