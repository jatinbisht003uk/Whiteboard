import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";

import BoardIcon from "../components/BoardIcon";
import CanvasBoard from "../components/CanvasBoard";
import { useWhiteboard } from "../context/WhiteboardContext";
import { useSocket } from "../hooks/useSocket";
import {
  DEFAULT_VIEWPORT,
  clampZoom,
  formatLastSaved,
  zoomViewportAtPoint,
} from "../lib/boardUtils";
import { SOCKET_URL } from "../lib/api";

const primaryTools = [
  { id: "select", label: "Select" },
  { id: "draw", label: "Draw" },
  { id: "sticky", label: "Sticky" },
  { id: "text", label: "Text" },
  { id: "hand", label: "Hand" },
];

const drawTools = [
  { id: "pen", label: "Pen" },
  { id: "highlighter", label: "Highlight" },
  { id: "eraser", label: "Eraser" },
  { id: "rectangle", label: "Rectangle" },
  { id: "ellipse", label: "Ellipse" },
  { id: "arrow", label: "Arrow" },
];

const swatches = ["#202431", "#4B67FF", "#FF6B57", "#2BBE60", "#F4B942", "#CB69FF"];

function getFallbackUser() {
  return {
    id: window.localStorage.getItem("pulseboard-user-id") || crypto.randomUUID(),
    name: window.localStorage.getItem("pulseboard-name") || "Guest",
  };
}

function initials(name) {
  return String(name || "Guest")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export default function RoomPage() {
  const { roomId } = useParams();
  const location = useLocation();
  const { state, dispatch } = useWhiteboard();
  const { socket, isConnected } = useSocket(SOCKET_URL);
  const boardApiRef = useRef(null);
  const [statusMessage, setStatusMessage] = useState("Connecting to room...");
  const [shareMessage, setShareMessage] = useState("");
  const [showHelp, setShowHelp] = useState(false);

  const user = useMemo(() => {
    const nextUser = location.state?.user || getFallbackUser();

    window.localStorage.setItem("pulseboard-user-id", nextUser.id);
    window.localStorage.setItem("pulseboard-name", nextUser.name);

    return nextUser;
  }, [location.state]);

  useEffect(() => {
    dispatch({ type: "SET_USER", payload: user });
  }, [dispatch, user]);

  useEffect(() => {
    if (!socket || !roomId || !isConnected) {
      return;
    }

    setStatusMessage("Joining shared board...");

    socket.emit("join-room", { roomId, user }, (response) => {
      if (!response?.ok) {
        setStatusMessage(response?.message || "Unable to join room.");
        return;
      }

      setStatusMessage("Live collaboration active");
    });
  }, [isConnected, roomId, socket, user]);

  useEffect(() => {
    if (!socket) {
      return undefined;
    }

    function handleRoomState(payload) {
      dispatch({
        type: "HYDRATE_ROOM",
        payload: {
          roomId: payload.roomId,
          items: payload.items || [],
          historyCount: payload.historyCount || 0,
          redoCount: payload.redoCount || 0,
          participants: payload.participants || [],
          cursors: payload.cursors || [],
          savedAt: payload.savedAt || null,
        },
      });
    }

    function handleRoomUsers(payload) {
      dispatch({
        type: "SET_PARTICIPANTS",
        payload: payload.participants || [],
      });
    }

    function handleBoardAction(payload) {
      dispatch({
        type: "APPLY_BOARD_ACTION",
        payload,
      });
    }

    function handleUndo(payload) {
      dispatch({
        type: "APPLY_UNDO",
        payload,
      });
    }

    function handleRedo(payload) {
      dispatch({
        type: "APPLY_REDO",
        payload,
      });
    }

    function handleCursorMove(payload) {
      dispatch({
        type: "UPSERT_CURSOR",
        payload,
      });
    }

    function handleCursorLeft(payload) {
      dispatch({
        type: "REMOVE_CURSOR",
        payload: payload.userId,
      });
    }

    socket.on("room-state", handleRoomState);
    socket.on("room-users", handleRoomUsers);
    socket.on("board-action", handleBoardAction);
    socket.on("undo", handleUndo);
    socket.on("redo", handleRedo);
    socket.on("cursor-move", handleCursorMove);
    socket.on("cursor-left", handleCursorLeft);

    return () => {
      socket.off("room-state", handleRoomState);
      socket.off("room-users", handleRoomUsers);
      socket.off("board-action", handleBoardAction);
      socket.off("undo", handleUndo);
      socket.off("redo", handleRedo);
      socket.off("cursor-move", handleCursorMove);
      socket.off("cursor-left", handleCursorLeft);
    };
  }, [dispatch, socket]);

  function setTool(nextTool) {
    dispatch({
      type: "SET_TOOL",
      payload: nextTool,
    });
  }

  const isDrawToolActive = drawTools.some((entry) => entry.id === state.tool);

  function handlePrimaryToolSelect(nextTool) {
    if (nextTool === "draw") {
      setTool(state.lastDrawTool || "pen");
      return;
    }

    setTool(nextTool);
  }

  function setViewport(nextViewport) {
    dispatch({
      type: "SET_VIEWPORT",
      payload: nextViewport,
    });
  }

  function zoom(multiplier) {
    const nextScale = clampZoom(state.viewport.scale * multiplier);
    const anchorPoint = {
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
    };

    setViewport(zoomViewportAtPoint(state.viewport, nextScale, anchorPoint));
  }

  function resetView() {
    setViewport(DEFAULT_VIEWPORT);
  }

  function handleShare() {
    const link = state.roomId || roomId;

    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(link).then(() => {
        setShareMessage("Room ID copied");
      });
    } else {
      window.prompt("Copy this Room ID:", link);
      setShareMessage("Room ID ready");
    }

    window.setTimeout(() => setShareMessage(""), 1800);
  }

  function handleUndo() {
    socket?.emit("undo");
  }

  function handleRedo() {
    socket?.emit("redo");
  }

  function handleClear() {
    socket?.emit("clear-canvas");
  }

  function handleExport() {
    boardApiRef.current?.exportAsImage();
  }

  return (
    <main className="room-page">
      <CanvasBoard
        items={state.items}
        cursors={state.cursors}
        socket={socket}
        roomId={state.roomId || roomId}
        user={state.user}
        tool={state.tool}
        color={state.color}
        brushSize={state.brushSize}
        viewport={state.viewport}
        selectedItemId={state.selectedItemId}
        dispatch={dispatch}
        apiRef={boardApiRef}
      />

      <header className="floating-topbar floating-topbar--left">
        <div>
          <h1>Web whiteboard</h1>
          <p>Powered by React, Socket.IO, and MongoDB</p>
        </div>
        <button type="button" className="icon-action" onClick={handleExport} aria-label="Export board">
          <BoardIcon name="share" />
        </button>
      </header>

      <section className="floating-topbar floating-topbar--center">
        <span className="floating-badge floating-badge--save">
          <BoardIcon name="target" />
          {formatLastSaved(state.savedAt)}
        </span>
        <button type="button" className="cta-button" onClick={handleShare}>
          Share Room ID
        </button>
      </section>

      <section className="floating-topbar floating-topbar--right">
        <div className="presence-stack">
          {state.participants.slice(0, 3).map((participant) => (
            <span key={participant.userId} className="avatar-chip" title={participant.name}>
              {initials(participant.name)}
            </span>
          ))}
          <span className="presence-meta">{state.participants.length || 1} online</span>
        </div>
        <button type="button" className="cta-button" onClick={handleShare}>
          {shareMessage || "Share Room ID"}
        </button>
      </section>

      <aside className="floating-rail floating-rail--primary">
        {primaryTools.map((entry) => (
          <button
            key={entry.id}
            type="button"
            className={
              (entry.id === "draw" ? isDrawToolActive : state.tool === entry.id)
                ? "rail-button rail-button--compact is-active"
                : "rail-button rail-button--compact"
            }
            onClick={() => handlePrimaryToolSelect(entry.id)}
            aria-label={entry.label}
            title={entry.label}
          >
            <BoardIcon name={entry.id} />
          </button>
        ))}
      </aside>

      {isDrawToolActive ? (
        <aside className="floating-rail floating-rail--secondary">
          <span className="rail-title">Draw</span>

          <div className="draw-tool-grid">
            {drawTools.map((entry) => (
            <button
              key={entry.id}
              type="button"
              className={
                state.tool === entry.id ? "rail-button rail-button--card is-active" : "rail-button rail-button--card"
              }
              onClick={() => setTool(entry.id)}
              aria-label={entry.label}
              title={entry.label}
            >
              <span className="rail-button__icon">
                <BoardIcon name={entry.id} />
              </span>
              <span className="rail-button__label">{entry.label}</span>
            </button>
          ))}
        </div>

          <div className="rail-divider" />

          <label className="brush-control" htmlFor="brush-range">
            <span className="brush-control__value">{state.brushSize}px</span>
            <input
              id="brush-range"
              type="range"
              min="2"
              max="18"
              step="1"
              value={state.brushSize}
              onChange={(event) =>
                dispatch({
                  type: "SET_BRUSH_SIZE",
                  payload: Number(event.target.value),
                })
              }
            />
          </label>

          <div className="palette-group">
            <span className="palette-title">Colors</span>
            <div className="swatch-column">
              {swatches.map((swatch) => (
                <button
                  key={swatch}
                  type="button"
                  className={state.color === swatch ? "color-dot is-selected" : "color-dot"}
                  style={{ backgroundColor: swatch }}
                  aria-label={`Select ${swatch}`}
                  onClick={() =>
                    dispatch({
                      type: "SET_COLOR",
                      payload: swatch,
                    })
                  }
                />
              ))}
            </div>
          </div>

          <button
            type="button"
            className="rail-button rail-button--wide"
            onClick={handleClear}
            aria-label="Clear board"
          >
            <BoardIcon name="spark" />
          </button>
        </aside>
      ) : null}

      <section className="floating-dock floating-dock--left">
        <button type="button" className="dock-button" onClick={handleUndo} disabled={!state.historyCount}>
          <BoardIcon name="undo" />
        </button>
        <button type="button" className="dock-button" onClick={handleRedo} disabled={!state.redoCount}>
          <BoardIcon name="redo" />
        </button>
      </section>

      <section className="floating-dock floating-dock--right">
        <button type="button" className="dock-button" onClick={() => zoom(0.92)} aria-label="Zoom out">
          <BoardIcon name="minus" />
        </button>
        <button type="button" className="zoom-readout" onClick={resetView}>
          {Math.round(state.viewport.scale * 100)}%
        </button>
        <button type="button" className="dock-button" onClick={() => zoom(1.1)} aria-label="Zoom in">
          <BoardIcon name="plus" />
        </button>
        <button type="button" className="dock-button" onClick={() => setShowHelp(true)} aria-label="Help">
          <BoardIcon name="help" />
        </button>
      </section>

      <section className="board-status">
        <span className={isConnected ? "status-pill is-live" : "status-pill"}>{statusMessage}</span>
        <Link className="leave-link" to="/">
          Leave room
        </Link>
      </section>

      {showHelp ? (
        <div className="help-modal" role="dialog" aria-modal="true">
          <div className="help-card">
            <div className="help-card__header">
              <div>
                <p className="eyebrow">Board Guide</p>
                <h2>Tools now available</h2>
              </div>
              <button type="button" className="icon-action" onClick={() => setShowHelp(false)}>
                <BoardIcon name="minus" />
              </button>
            </div>

            <ul className="help-list">
              <li>`Select` lets you pick and drag existing notes, text, shapes, and strokes.</li>
              <li>`Pen` and `Highlight` stream live freehand strokes to everyone in the room.</li>
              <li>`Rectangle`, `Ellipse`, and `Arrow` create shapes by click-dragging on the board.</li>
              <li>`Sticky` and `Text` place editable content blocks using quick prompts.</li>
              <li>`Eraser` removes the item under the cursor and syncs that delete instantly.</li>
              <li>`Hand` pans the board, while mouse wheel zooms around the pointer.</li>
              <li>`Share board` copies the room URL, and `Export` downloads the visible canvas as PNG.</li>
            </ul>
          </div>
        </div>
      ) : null}
    </main>
  );
}
