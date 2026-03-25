import { worldToScreen } from "../lib/boardUtils";

export default function CursorOverlay({ cursors, viewport, boardSize, currentUserId }) {
  return (
    <div className="cursor-layer" aria-hidden="true">
      {cursors
        .filter((cursor) => cursor.userId !== currentUserId)
        .map((cursor) => {
          const screen = worldToScreen(cursor, viewport);
          const isVisible =
            screen.x >= -40 &&
            screen.y >= -40 &&
            screen.x <= boardSize.width + 40 &&
            screen.y <= boardSize.height + 40;

          if (!isVisible) {
            return null;
          }

          return (
            <div
              key={cursor.userId}
              className="cursor-badge"
              style={{
                left: `${screen.x}px`,
                top: `${screen.y}px`,
              }}
            >
              <span className="cursor-pointer" />
              <span className="cursor-name">{cursor.name}</span>
            </div>
          );
        })}
    </div>
  );
}
