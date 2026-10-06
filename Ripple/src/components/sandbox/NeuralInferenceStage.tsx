import { modelSourceLabel } from "@/engine/neuralInference"
import type { CampusState, NeuralInference } from "@/types"

const stages = [
  "Encoding campus state",
  "Running neural network inference",
  "Projecting operational conditions",
  "Propagating ripple effects",
  "Evaluating future",
  "Generating decision intelligence",
]

function networkDots() {
  return [0, 1, 2, 3, 4].map((column) => [0, 1, 2].map((row) => ({ column, row, key: `${column}-${row}` })))
}

export function NeuralInferenceStage({ state, inference }: { state: CampusState; inference: NeuralInference }) {
  const activeNode = state.snapshots[state.activeSnapshotIndex]?.activeNodeIndex ?? -1
  const activeStage = Math.min(stages.length - 1, Math.max(0, activeNode + 1))

  return <section className="neural-inference-stage" data-testid="neural-inference-stage" aria-labelledby="neural-inference-title">
    <div className="neural-stage-heading"><div><span className="focus-eyebrow">PREDICTIVE LAYER / INFERENCE</span><h2 id="neural-inference-title">{modelSourceLabel(inference.source)}</h2><p>Turning this campus condition into measurable operational signals.</p></div><span className="neural-stage-status" role="status">{inference.source === "local-neural-network" ? "LOCAL / READY" : "FALLBACK / ACTIVE"}</span></div>
    <div className="neural-stage-layout">
      <div className="neural-network-visual" aria-hidden="true"><svg viewBox="0 0 320 116" role="presentation"><g className="neural-links">{networkDots().flatMap((column) => column.map((dot) => <line key={`link-${dot.key}`} x1={24 + dot.column * 68} y1={30 + dot.row * 28} x2={92 + dot.column * 68} y2={30 + ((dot.row + 1) % 3) * 28} />))}</g>{networkDots().flatMap((column) => column.map((dot) => <circle className={dot.column <= Math.min(4, activeStage) ? "active" : ""} cx={24 + dot.column * 68} cy={30 + dot.row * 28} r="4" key={dot.key} />))}</svg><span>STATE → SIGNALS → RIPPLE</span></div>
      <ol className="neural-stage-list">{stages.map((stage, index) => <li className={index < activeStage ? "complete" : index === activeStage ? "active" : "pending"} data-testid={`neural-stage-${index + 1}`} key={stage}><span>{index < activeStage ? "✓" : `0${index + 1}`}</span><strong>{stage}</strong></li>)}</ol>
    </div>
    <div className="neural-stage-footer"><span>{activeStage < stages.length - 1 ? "Inference pipeline active" : "Predictive layer complete"}</span><span>Local forward pass · no training during simulation</span></div>
  </section>
}
