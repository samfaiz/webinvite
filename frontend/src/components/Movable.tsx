import type { CSSProperties, ReactNode } from "react";

/**
 * Wraps a block that can be nudged vertically within its section. The saved
 * offset (px) is applied as a translateY so it renders the same on the published
 * page. In the editor (embed edit mode) these `[data-move]` blocks become
 * drag-to-reposition; `data-offset` seeds the drag with the current value.
 */
export function Movable({
  moveKey,
  offsetY = 0,
  className,
  style,
  children,
}: {
  moveKey: string;
  offsetY?: number;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  return (
    <div
      data-move={moveKey}
      data-offset={offsetY}
      className={className}
      style={{ transform: offsetY ? `translateY(${offsetY}px)` : undefined, ...style }}
    >
      {children}
    </div>
  );
}
