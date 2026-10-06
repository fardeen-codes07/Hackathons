import { SandboxShell } from "@/components/sandbox/SandboxShell"
import type { SandboxView } from "@/components/sandbox/ViewSwitcher"

export default async function SandboxPage({ searchParams }: { searchParams: Promise<{ guide?: string; view?: string }> }) {
  const params = await searchParams
  const view: SandboxView = params.view === "operations" || params.view === "decision" ? params.view : "focus"
  return <SandboxShell initialGuide={params.guide === "1"} initialView={view} />
}
