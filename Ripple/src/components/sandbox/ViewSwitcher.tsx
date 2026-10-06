import Link from "next/link"

export type SandboxView = "focus" | "decision" | "operations"

const views: { id: SandboxView; label: string; description: string }[] = [
  { id: "focus", label: "Focus", description: "Fast decision" },
  { id: "decision", label: "Decision", description: "Explore possible futures" },
  { id: "operations", label: "Operations", description: "Understand the system" },
]

export function ViewSwitcher({ activeView }: { activeView: SandboxView }) {
  return <nav className="view-switcher" aria-label="RIPPLE view mode">
    {views.map((view) => <Link className={activeView === view.id ? "active" : ""} aria-current={activeView === view.id ? "page" : undefined} href={`/sandbox?view=${view.id}`} key={view.id}>
      <span>{view.label}</span><small>{view.description}</small>
    </Link>)}
  </nav>
}
