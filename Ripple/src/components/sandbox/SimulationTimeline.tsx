import type { SimulationEvent } from "@/types"

type SimulationTimelineProps = { events: SimulationEvent[]; activeNodeIndex: number }

export function SimulationTimeline({ events, activeNodeIndex }: SimulationTimelineProps) {
  if (events.length === 0) return null
  return <div className="simulation-timeline" aria-label="Simulation timeline">
    <div className="timeline-header"><div><h3>Simulation timeline</h3><p>Events are emitted by the deterministic scenario sequence.</p></div><span className="status-label">{activeNodeIndex < 0 ? "READY" : `${Math.min(activeNodeIndex + 1, events.length)} / ${events.length} EVENTS`}</span></div>
    <div className="timeline-track">{events.map((event, index) => <article className={`timeline-event ${index <= activeNodeIndex ? "active" : ""}`} key={event.id}><div className="timeline-marker" /><div className="timeline-time">{event.timeLabel}</div><h4>{event.title}</h4><p>{event.description}</p></article>)}</div>
  </div>
}
