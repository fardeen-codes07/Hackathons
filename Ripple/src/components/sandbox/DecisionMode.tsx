"use client"

import Link from "next/link"
import { useMemo } from "react"
import { calculateDecisionScore } from "@/engine/decisionScore"
import { decisionCandidatesForScenario } from "@/engine/interventionRules"
import { predictScenario } from "@/engine/predictiveModel"
import { syntheticDataDisclosure } from "@/data/mockData"
import { decisionOptionCandidates } from "@/lib/decisionSession"
import { formatCurrency, formatNumber } from "@/lib/format"
import { focusScenarioConfiguration } from "@/lib/scenarioConfiguration"
import type { CampusState, DecisionBranch, DecisionCandidate, DecisionSession } from "@/types"
import { ViewSwitcher } from "@/components/sandbox/ViewSwitcher"

type DecisionModeProps = {
  state: CampusState
  session: DecisionSession
  onSelectBranch: (candidateId: DecisionCandidate["id"]) => void
  onSimulate: () => void
  onBacktrack: () => void
  onToggleCompare: (branchId: string) => void
  onReset: () => void
  onOpenOperations: () => void
}

function candidateForBranch(branch: DecisionBranch, scenario: CampusState["scenario"]) {
  return decisionCandidatesForScenario(scenario).find((candidate) => candidate.id === branch.candidateId) ?? decisionOptionCandidates[0]
}

function bestDecisionCandidate(scenario: CampusState["scenario"]) {
  return decisionCandidatesForScenario(scenario).reduce((winner, candidate) => calculateDecisionScore(candidate).score > calculateDecisionScore(winner).score ? candidate : winner)
}

function branchStatusLabel(branch: DecisionBranch, active: boolean) {
  if (branch.status === "complete") return active ? "SELECTED / EXPLORED" : "EXPLORED"
  if (branch.status === "running") return "CURRENT / SIMULATING"
  if (branch.status === "selected") return "CURRENT / READY"
  return "UNEXPLORED"
}

function DecisionHeader({ onReset }: { onReset: () => void }) {
  return <header className="focus-header decision-header">
    <Link href="/" aria-label="RIPPLE home" className="brand-lockup"><span className="brand-mark" /><span className="brand-name">RIPPLE</span></Link>
    <ViewSwitcher activeView="decision" />
    <div className="focus-header-actions"><Link className="focus-guided-link" href="/sandbox?guide=1">Guided demo <span>→</span></Link><button className="decision-reset" type="button" onClick={onReset}>Reset session</button><span className="focus-data-label">LOCAL / SYNTHETIC</span></div>
  </header>
}

function DecisionBranchNode({ branch, scenario, active, selectedForCompare, simulationRunning, onSelect, onToggleCompare }: { branch: DecisionBranch; scenario: CampusState["scenario"]; active: boolean; selectedForCompare: boolean; simulationRunning: boolean; onSelect: () => void; onToggleCompare: () => void }) {
  const candidate = candidateForBranch(branch, scenario)
  const result = branch.result
  const status = branchStatusLabel(branch, active)
  return <article className={"decision-branch-node " + (active ? "active " : "") + (branch.status === "complete" ? "complete " : "") + (branch.status === "running" ? "running " : "") + (branch.status === "unexplored" ? "unexplored" : "")} data-testid={"decision-branch-" + candidate.id}>
    <button className="decision-node-button" type="button" onClick={onSelect} disabled={simulationRunning && !active} aria-current={active ? "step" : undefined} aria-label={candidate.label + " future, " + status.toLowerCase()}>
      <span className="decision-node-status">{status}</span>
      <strong>{candidate.label}</strong>
      <span className="decision-node-description">{candidate.description}</span>
      <span className="decision-node-mechanism"><span>MECHANISM</span>{candidate.mechanism ?? candidate.description}</span>
      <span className="decision-node-complexity"><span>COMPLEXITY</span>{candidate.operationalComplexity}</span>
      {result ? <span className="decision-node-result"><span><b>{result.score}</b><small>score</small></span><span><b>{result.stability}</b><small>stability</small></span><span><b>{formatNumber(result.affectedStudents)}</b><small>affected</small></span><span><b>{result.recoveryHours}h</b><small>recovery</small></span></span> : <span className="decision-node-preview"><span><b>{candidate.stability}</b><small>projected stability</small></span><span><b>{formatNumber(candidate.affectedStudents)}</b><small>affected</small></span><span><b>{candidate.recoveryHours}h</b><small>recovery</small></span></span>}
      <span className="decision-node-prompt">{result ? "Review this future" : active ? "Ready to simulate" : "Explore this future"} <b>→</b></span>
    </button>
    {branch.status === "complete" ? <button className={"decision-compare-toggle " + (selectedForCompare ? "selected" : "")} type="button" onClick={onToggleCompare} aria-pressed={selectedForCompare}>{selectedForCompare ? "Selected for comparison" : "Add to comparison"}</button> : null}
  </article>
}

function DecisionHistory({ branches, activeBranchId, scenario, onSelectBranch }: { branches: DecisionBranch[]; activeBranchId: string | null; scenario: CampusState["scenario"]; onSelectBranch: (candidateId: DecisionCandidate["id"]) => void }) {
  return <section className="decision-history" data-testid="decision-history" aria-labelledby="decision-history-title">
    <div className="decision-history-heading"><div><span className="decision-section-kicker">BRANCH HISTORY</span><h2 id="decision-history-title">Explored futures</h2></div><span className="decision-section-note">Completed paths remain available. Revisit one without deleting the others.</span></div>
    <div className="decision-history-list">{branches.map((branch) => {
      const candidate = candidateForBranch(branch, scenario)
      const result = branch.result
      return branch.status === "complete" && result ? <button className={`decision-history-item ${activeBranchId === branch.id ? "active" : ""}`} type="button" onClick={() => onSelectBranch(candidate.id)} aria-current={activeBranchId === branch.id ? "step" : undefined} key={branch.id}>
        <span className="decision-history-mark">✓</span><span><strong>{candidate.label}</strong><small>{result.stability} stability · {result.stability < 60 ? "Critical" : result.stability < 80 ? "High" : "Stable"}</small></span><span className="decision-history-action">Revisit →</span>
      </button> : <div className="decision-history-item unexplored" key={branch.id}><span className="decision-history-mark">○</span><span><strong>{candidate.label}</strong><small>Not explored</small></span><span className="decision-history-action">Available</span></div>
    })}</div>
  </section>
}

function DecisionCompare({ branches, scenario }: { branches: DecisionBranch[]; scenario: CampusState["scenario"] }) {
  if (branches.length < 2) return <section className="decision-compare decision-compare-empty" data-testid="decision-compare" aria-label="Compare futures"><span className="decision-section-kicker">COMPARE FUTURES</span><strong>Explore one more response to unlock the comparison.</strong><p>Completed branches stay in the tree so you can return and select the futures that matter.</p></section>
  const labels = [
    { key: "stability", label: "Campus stability", format: (value: number) => String(value), better: (value: number, best: number) => value === best },
    { key: "affectedStudents", label: "Students affected", format: formatNumber, better: (value: number, best: number) => value === best },
    { key: "conflicts", label: "Faculty conflicts", format: (value: number) => String(value), better: (value: number, best: number) => value === best },
    { key: "recoveryHours", label: "Recovery", format: (value: number) => value + "h", better: (value: number, best: number) => value === best },
    { key: "operationalCost", label: "Estimated cost", format: formatCurrency, better: (value: number, best: number) => value === best },
  ] as const
  return <section className="decision-compare" data-testid="decision-compare" aria-labelledby="decision-compare-title">
    <div className="decision-section-heading"><div><span className="decision-section-kicker">COMPARE FUTURES / {branches.length} SELECTED</span><h2 id="decision-compare-title">Different responses. Measurable outcomes.</h2></div><span className="decision-section-note">Controlled synthetic analysis. Green cells mark the preferred direction for each metric.</span></div>
    <div className="decision-compare-table-wrap"><table className="decision-compare-table"><caption className="sr-only">Comparison of explored intervention futures</caption><thead><tr><th scope="col">Metric</th>{branches.map((branch) => <th scope="col" key={branch.id}>{candidateForBranch(branch, scenario).label}</th>)}</tr></thead><tbody>{labels.map((metric) => { const values = branches.map((branch) => branch.result?.[metric.key] ?? 0); const bestValue = metric.key === "stability" ? Math.max(...values) : Math.min(...values); return <tr key={metric.key}><th scope="row">{metric.label}</th>{branches.map((branch) => { const value = branch.result?.[metric.key] ?? 0; return <td className={metric.better(value, bestValue) ? "recommended" : undefined} key={branch.id}>{metric.format(value)}</td> })}</tr> })}</tbody></table></div>
    {branches.length === 2 && <div className="decision-delta-strip"><span><b>{formatNumber(Math.abs((branches[0].result?.affectedStudents ?? 0) - (branches[1].result?.affectedStudents ?? 0)))}</b> students saved between futures</span><span><b>{Math.abs((branches[0].result?.conflicts ?? 0) - (branches[1].result?.conflicts ?? 0))}</b> conflicts avoided</span><span><b>{Math.abs((branches[0].result?.recoveryHours ?? 0) - (branches[1].result?.recoveryHours ?? 0))}h</b> recovery difference</span></div>}
  </section>
}

function DecisionRecommendation({ scenario }: { scenario: CampusState["scenario"] }) {
  const candidates = decisionCandidatesForScenario(scenario)
  const best = bestDecisionCandidate(scenario)
  const nothing = candidates.find((candidate) => candidate.id === "do-nothing") ?? candidates[0]
  const score = calculateDecisionScore(best).score
  return <section className="decision-recommendation" data-testid="decision-recommendation" aria-labelledby="decision-recommendation-title">
    <div className="decision-recommendation-copy"><span className="decision-section-kicker">RECOMMENDED INTERVENTION</span><h2 id="decision-recommendation-title">Absorb the disruption upstream.</h2><p>{best.mechanism ?? best.description}</p><div className="decision-recommendation-intervention"><span>INTERVENTION</span><strong>{best.label}</strong></div></div>
    <div className="decision-recommendation-score"><span className="decision-section-kicker">DECISION SCORE</span><strong>{score}<small>/100</small></strong><span>Prototype analysis score</span></div>
    <div className="decision-recommendation-evidence"><span className="decision-section-kicker">EVIDENCE</span><div className="decision-recommendation-stats"><span><b>{formatNumber(nothing.affectedStudents - best.affectedStudents)}</b> students protected</span><span><b>{nothing.conflicts - best.conflicts}</b> conflicts avoided</span><span><b>{nothing.recoveryHours - best.recoveryHours}h</b> recovery improvement</span><span><b>{formatCurrency(best.operationalCost)}</b> estimated cost</span></div></div>
    <div className="decision-recommendation-tradeoff"><span className="decision-section-kicker">TRADE-OFF</span><strong>{best.primaryTradeoff}</strong><span>Higher short-term complexity in exchange for a lower system-wide cascade.</span></div>
  </section>
}

function DecisionConfidence({ scenario }: { scenario: CampusState["scenario"] }) {
  const prediction = useMemo(() => predictScenario(scenario), [scenario])
  return <section className="decision-confidence" data-testid="decision-confidence" aria-labelledby="decision-confidence-title">
    <div><span className="decision-section-kicker">ANALYSIS CONFIDENCE</span><h2 id="decision-confidence-title">A prototype signal, not a promise.</h2><p>Confidence reflects synthetic source coverage and scenario assumptions. It is not real-world prediction accuracy.</p></div>
    <div className="decision-confidence-meter"><strong>{prediction.confidence}%</strong><span className="decision-confidence-track" role="meter" aria-label={`Prototype analysis confidence ${prediction.confidence}%`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={prediction.confidence}><i style={{ width: `${prediction.confidence}%` }} /></span><small>Primary uncertainty: {prediction.primaryUncertainty}</small></div>
  </section>
}

function DecisionHumanReview({ onOpenOperations }: { onOpenOperations: () => void }) {
  return <section className="decision-human-review" data-testid="human-review" aria-labelledby="human-review-title"><div><span className="decision-section-kicker">READY FOR HUMAN REVIEW</span><h2 id="human-review-title">RIPPLE supports the operator.</h2><p>The modeled futures are compared. The final operational decision remains with the campus operator.</p></div><div className="decision-human-review-actions"><a className="decision-primary-button" href="#decision-why">Review decision <span>→</span></a><button className="decision-secondary-button" type="button" onClick={onOpenOperations}>Open Operations <span>→</span></button></div></section>
}

function DecisionMechanism({ branch, scenario }: { branch: DecisionBranch; scenario: CampusState["scenario"] }) {
  const candidate = candidateForBranch(branch, scenario)
  const result = branch.result
  const candidates = decisionCandidatesForScenario(scenario)
  const nothing = candidates.find((item) => item.id === "do-nothing") ?? candidates[0]
  return <section className="decision-mechanism" data-testid="decision-mechanism" aria-labelledby="decision-mechanism-title">
    <div className="decision-section-heading"><div><span className="decision-section-kicker">RULE PATH / ACTIVE FUTURE</span><h2 id="decision-mechanism-title">What I chose → how it works → what happens → outcome.</h2></div><span className="decision-section-note">Deterministic intervention rule. Synthetic calibration, not a forecast.</span></div>
    <div className="decision-mechanism-grid">
      <div className="decision-mechanism-step"><span className="decision-mechanism-index">01</span><span className="decision-mechanism-label">WHAT I CHOSE</span><strong>{candidate.label}</strong><p>{candidate.description}</p></div>
      <div className="decision-mechanism-step decision-mechanism-active"><span className="decision-mechanism-index">02</span><span className="decision-mechanism-label">HOW IT WORKS</span><strong>{candidate.mechanism ?? "The selected intervention rule is applied."}</strong><p>Applied before the cascade reaches the next node.</p></div>
      <div className="decision-mechanism-step"><span className="decision-mechanism-index">03</span><span className="decision-mechanism-label">WHAT HAPPENS</span><strong>{result ? `${formatNumber(result.affectedStudents)} students affected` : "Run this future to reveal the cascade."}</strong><p>{result ? `${result.roomUtilization}% room utilization · ${result.conflicts} faculty conflicts` : "The rule will resolve through the shared ripple sequence."}</p></div>
      <div className="decision-mechanism-step decision-mechanism-outcome"><span className="decision-mechanism-index">04</span><span className="decision-mechanism-label">OUTCOME</span><strong>{result ? `${result.stability} stability / 100` : "Awaiting deterministic result"}</strong><p>{result ? `Decision score ${result.score}/100 · ${result.recoveryHours}h recovery` : "No result is committed until simulation completes."}</p></div>
    </div>
    <div className="decision-mechanism-evidence"><span className="decision-section-kicker">EXPECTED EFFECT / CONTROLLED PROJECTION</span><div><strong>{formatNumber(Math.max(0, nothing.affectedStudents - candidate.affectedStudents))}</strong><span>Students protected</span></div><div><strong>{Math.max(0, nothing.conflicts - candidate.conflicts)}</strong><span>Conflicts avoided</span></div><div><strong>{Math.max(0, nothing.recoveryHours - candidate.recoveryHours)}h</strong><span>Recovery improved</span></div><div><strong>{formatCurrency(candidate.operationalCost)}</strong><span>Estimated cost</span></div><div><strong>{candidate.operationalComplexity}</strong><span>Complexity</span></div></div>
  </section>
}

function DecisionWhy({ scenario }: { scenario: CampusState["scenario"] }) {
  const candidates = decisionCandidatesForScenario(scenario)
  const configuration = focusScenarioConfiguration(scenario)
  const chain = configuration.causalSequence
  const best = bestDecisionCandidate(scenario)
  const nothing = candidates.find((candidate) => candidate.id === "do-nothing") ?? candidates[0]
  return <section className="decision-why" id="decision-why" data-testid="decision-why" aria-labelledby="decision-why-title"><div className="decision-section-heading"><div><span className="decision-section-kicker">WHY / CAUSAL EXPLANATION</span><h2 id="decision-why-title">The better future intervenes upstream.</h2></div><span className="decision-section-note">No hidden scoring. No generated explanation.</span></div><div className="decision-why-layout"><div className="decision-causal-chain">{chain.map((item, index) => <div key={item}><span>0{index + 1}</span><strong>{item}</strong>{index < chain.length - 1 ? <b>↓</b> : null}</div>)}</div><div className="decision-why-callout"><span className="decision-section-kicker">INTERVENTION</span><strong>{best.label} absorbs the cascade upstream.</strong><p>{best.mechanism ?? "Compatible rooms are assigned before pressure becomes a downstream faculty, mobility, and stability problem."}</p><div className="decision-why-evidence"><span className="decision-section-kicker">WHAT THIS CHANGES</span><div><strong>{formatNumber(nothing.affectedStudents)} → {formatNumber(best.affectedStudents)}</strong><small>students affected</small></div><div><strong>{nothing.stability} → {best.stability}</strong><small>campus stability</small></div></div></div></div></section>
}

export function DecisionMode({ state, session, onSelectBranch, onSimulate, onBacktrack, onToggleCompare, onReset, onOpenOperations }: DecisionModeProps) {
  const activeBranch = session.branches.find((branch) => branch.id === session.activeBranchId)
  const completedBranches = session.branches.filter((branch) => branch.status === "complete")
  const selectedBranches = session.selectedBranchIds.map((id) => session.branches.find((branch) => branch.id === id)).filter((branch): branch is DecisionBranch => Boolean(branch?.result && branch.status === "complete"))
  const displayedBranches = selectedBranches.length > 0 ? selectedBranches : completedBranches
  const target = state.scenario.targetLabel ?? "TT Block"
  const simulationRunning = state.phase === "running"
  const contextLabel = state.scenario.label ?? target + " closure"
  const phaseLabel = simulationRunning ? "SIMULATION RUNNING" : completedBranches.length >= 2 ? "READY FOR HUMAN REVIEW" : "EXPLORING FUTURES"
  const decisionState = completedBranches.length >= 2 ? "READY FOR HUMAN REVIEW" : "EXPLORING"

  return <main className="decision-shell" data-testid="decision-mode">
    <DecisionHeader onReset={onReset} />
    <div className="decision-main">
      <div className="decision-hero"><div><span className="focus-eyebrow">RIPPLE / DECISION MODE</span><h1>Explore possible futures before you act.</h1><p className="focus-lede">Choose a response, run the model, and backtrack without losing what you have learned.</p></div><div className={"decision-phase " + (simulationRunning ? "running" : completedBranches.length >= 2 ? "complete" : "")} role="status" aria-live="polite"><span />{phaseLabel}</div></div>
      <section className="decision-context" aria-label="Current decision context"><div><span className="decision-section-kicker">CURRENT SCENARIO</span><strong>{contextLabel}</strong><small>{state.scenario.durationHours} hours / {state.scenario.startTime} start</small></div><div><span className="decision-section-kicker">DECISION POINT</span><strong>{activeBranch ? activeBranch.status === "complete" ? "Review this explored future" : "Choose a response" : completedBranches.length > 0 ? "Choose another response" : "What should we do?"}</strong><small>{completedBranches.length} of {session.branches.length} futures explored</small></div><div><span className="decision-section-kicker">SESSION STATE</span><strong>{decisionState}</strong><small>In memory · reset clears exploration</small></div></section>
      <DecisionConfidence scenario={state.scenario} />

      <section className="decision-tree-panel" data-testid="decision-tree" aria-labelledby="decision-tree-title"><div className="decision-section-heading"><div><span className="decision-section-kicker">FUTURE LAB / INTERVENTION STUDIO</span><h2 id="decision-tree-title">How should we respond?</h2></div><p className="decision-section-note">Choose a response, then explore its projected future. Every outcome comes from the same deterministic intervention rules.</p></div><div className="decision-path-label" aria-hidden="true"><span>ONE SCENARIO</span><b>→</b><span>MULTIPLE FUTURES</span></div><div className="decision-tree" role="group" aria-label="Possible futures for the current scenario"><div className="decision-root-node"><span className="decision-node-status">STARTING CONDITION</span><strong>{contextLabel}</strong><small>{state.scenario.durationHours} hours in the modeled window · choose a response below</small></div><div className="decision-tree-trunk" aria-hidden="true" /><div className="decision-branch-grid">{session.branches.map((branch) => <DecisionBranchNode branch={branch} scenario={state.scenario} active={session.activeBranchId === branch.id} selectedForCompare={session.selectedBranchIds.includes(branch.id)} simulationRunning={simulationRunning} onSelect={() => onSelectBranch(branch.candidateId)} onToggleCompare={() => onToggleCompare(branch.id)} key={branch.id} />)}</div></div><div className="decision-tree-actions">{activeBranch ? <button className="decision-secondary-button" type="button" onClick={onBacktrack} disabled={simulationRunning && activeBranch.status !== "running"} aria-label="Back to decision point / intervention">← Back to intervention</button> : <span className="decision-tree-hint">Select a response to create the next branch.</span>}{activeBranch && activeBranch.status !== "complete" && !simulationRunning ? <button className="decision-primary-button" type="button" onClick={onSimulate} aria-label="Simulate this future">Explore this future <span>→</span></button> : null}{activeBranch?.status === "complete" ? <button className="decision-primary-button" type="button" onClick={onBacktrack} aria-label="Try another path / choose another future">↩ Choose another future <span>→</span></button> : null}{state.phase === "running" ? <span className="decision-running-note">The shared ripple is running. Reset remains safe.</span> : null}</div></section>

      {activeBranch ? <DecisionMechanism branch={activeBranch} scenario={state.scenario} /> : null}
      <DecisionHistory branches={session.branches} activeBranchId={session.activeBranchId} scenario={state.scenario} onSelectBranch={onSelectBranch} />
      {completedBranches.length > 0 ? <DecisionCompare branches={displayedBranches} scenario={state.scenario} /> : null}
      {completedBranches.length >= 2 ? <DecisionRecommendation scenario={state.scenario} /> : null}
      {completedBranches.length > 0 ? <DecisionWhy scenario={state.scenario} /> : null}
      {completedBranches.length >= 2 ? <DecisionHumanReview onOpenOperations={onOpenOperations} /> : null}
      <div className="decision-footer-actions"><button className="decision-secondary-button" type="button" onClick={onOpenOperations}>Open Operations <span>→</span></button><button className="decision-text-link" type="button" onClick={onReset}>Reset scenario and session</button></div>
      <p className="focus-footer-disclosure">{syntheticDataDisclosure}</p>
    </div>
  </main>
}
