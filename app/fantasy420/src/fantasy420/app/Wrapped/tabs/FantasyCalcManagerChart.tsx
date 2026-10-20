import { useEffect, useId, useRef, useState } from "react";
import { NIGHT_CHART_COLORS } from "../../theme";
import "./FantasyCalcManagerChart.css";

type Player = { id: string; name: string; value: number; draftPick?: number };
type Manager = { id: string; name: string; value: number; ps: Player[] };
type Selection = { teamId: string; playerIndex: number; pinned: boolean };

export default function FantasyCalcManagerChart({
  teams,
  available,
}: {
  teams: Manager[];
  available: boolean;
}) {
  const [selection, setSelection] = useState<Selection | null>(null);
  const chartRef = useRef<HTMLElement>(null);
  const detailId = useId();
  const maximum = Math.max(1, ...teams.map((team) => team.value));
  const team = teams.find((item) => item.id === selection?.teamId);
  const player = selection && team?.ps[selection.playerIndex];

  useEffect(() => {
    const dismissOutside = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Element) ||
          !chartRef.current?.contains(target) ||
          !target.closest(".fc-manager-segment, .fc-manager-details, .fc-manager-inspect")) {
        setSelection(null);
      }
    };
    const dismissEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelection(null);
    };
    document.addEventListener("pointerdown", dismissOutside);
    document.addEventListener("keydown", dismissEscape);
    return () => {
      document.removeEventListener("pointerdown", dismissOutside);
      document.removeEventListener("keydown", dismissEscape);
    };
  }, []);

  const reveal = (teamId: string, playerIndex: number, pinned = false) => {
    setSelection((current) =>
      !pinned && current?.pinned ? current : { teamId, playerIndex, pinned }
    );
  };

  return (
    <section
      ref={chartRef}
      className="fc-manager-chart"
      aria-label="Current FantasyCalc scores by manager"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setSelection(null);
        }
      }}
    >
      <h2>Current score by manager</h2>
      <p className="fc-manager-hint">
        FantasyCalc roster value · Hover, focus, or tap a segment for player details.
      </p>
      {!available ? <p>FantasyCalc values are unavailable for this season.</p> :
        teams.length === 0 ? <p>No managers available.</p> :
        <div className="fc-manager-rows">
          {teams.map((manager) => (
            <div
              key={manager.id}
              className="fc-manager-row"
              onPointerLeave={(event) => {
                if (event.pointerType === "mouse") {
                  setSelection((current) => current?.pinned ? current : null);
                }
              }}
            >
              <div className="fc-manager-label">
                <strong>{manager.name}</strong>
                <span>{manager.value.toFixed(2)}</span>
              </div>
              <div className="fc-manager-track">
                <div
                  className="fc-manager-bar"
                  style={{ width: `${100 * manager.value / maximum}%` }}
                  role="group"
                  aria-label={`${manager.name}: ${manager.value.toFixed(2)}`}
                >
                  {manager.ps.map((item, index) => item.value > 0 && (
                    <button
                      type="button"
                      key={item.id}
                      className="fc-manager-segment"
                      aria-label={`${manager.name}, ${item.name}`}
                      aria-describedby={selection?.teamId === manager.id &&
                        selection.playerIndex === index ? detailId : undefined}
                      style={{
                        width: `${100 * item.value / manager.value}%`,
                        backgroundColor: NIGHT_CHART_COLORS[index % NIGHT_CHART_COLORS.length],
                      }}
                      onPointerEnter={(event) => {
                        if (event.pointerType === "mouse") reveal(manager.id, index);
                      }}
                      onFocus={() => setSelection({ teamId: manager.id, playerIndex: index, pinned: false })}
                      onClick={() => reveal(manager.id, index, true)}
                    >
                      <span className="fc-manager-player-name" aria-hidden="true">
                        <span>{item.name.trim().split(/\s+/)[0]}</span>
                        <span>{item.name.trim().split(/\s+/).slice(1).join(" ")}</span>
                      </span>
                    </button>
                  ))}
                </div>
                {manager.value === 0 && (
                  manager.ps.length ? (
                    <button
                      type="button"
                      className="fc-manager-inspect"
                      onClick={() => reveal(manager.id, 0, true)}
                    >
                      Inspect roster · no current value
                    </button>
                  ) : <span className="fc-manager-empty">No rostered players</span>
                )}
              </div>
            </div>
          ))}
        </div>
      }
      {available && selection && team && player && (
        <div className="fc-manager-details" id={detailId} role="region" aria-label="Player details">
          <div className="fc-manager-detail-heading">
            <span>{team.name}</span>
            <button type="button" aria-label="Close player details" onClick={() => setSelection(null)}>×</button>
          </div>
          <strong>{player.name}</strong>
          <div>{player.value.toFixed(2)} · {player.draftPick === undefined
            ? "Undrafted" : `Draft pick #${player.draftPick + 1}`}</div>
          <div className="fc-manager-detail-nav">
            <button
              type="button"
              aria-label="Previous player"
              disabled={selection.playerIndex === 0}
              onClick={() => reveal(team.id, selection.playerIndex - 1, true)}
            >←</button>
            <span>{selection.playerIndex + 1} / {team.ps.length}</span>
            <button
              type="button"
              aria-label="Next player"
              disabled={selection.playerIndex === team.ps.length - 1}
              onClick={() => reveal(team.id, selection.playerIndex + 1, true)}
            >→</button>
          </div>
        </div>
      )}
    </section>
  );
}
