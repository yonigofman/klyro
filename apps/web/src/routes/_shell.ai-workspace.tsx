import * as React from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Renderer } from '@openuidev/react-lang'

import { AIMessage, UserMessage } from '#/components/ui/message'
import { GeneratedPanel } from '#/components/ui/generated-panel'
import type { TraceStep } from '#/components/ui/investigation-trace'
import { InvestigationTrace } from '#/components/ui/investigation-trace'
import { canvasLibrary } from '#/lib/openui-canvas'
import { PromptInput } from '#/components/ui/prompt-input'
import { SourceChip } from '#/components/ui/source-chip'
import { SplitWorkspace } from '#/components/ui/split-workspace'
import { SuggestedPrompts } from '#/components/ui/suggested-prompts'
import { ToolCall } from '#/components/ui/tool-call'
import { BranchMark } from '#/components/ui/branch-mark'

export const Route = createFileRoute('/_shell/ai-workspace')({ component: AIWorkspace })

const SUGGESTED_PROMPTS = [
  {
    title: 'Why is checkout-web restarting?',
    detail: 'Investigate crash loops and recent rollouts',
    scope: 'checkout · prod-us-east-1',
  },
  { title: 'Which pods are over their memory limit?', detail: 'Scan every namespace for OOM risk', scope: 'prod-us-east-1' },
]

type ToolStepDef = {
  id: string
  title: string
  tool: string
  system: string
  input: string
  summary: string
  durationMs: number
}

const TOOL_STEPS: ToolStepDef[] = [
  {
    id: 'pods',
    title: 'Querying cluster state',
    tool: 'kubectl.get',
    system: 'kube',
    input: 'pods -n checkout',
    summary: '3 pods for checkout-web, 1 ready / 3 desired',
    durationMs: 900,
  },
  {
    id: 'events',
    title: 'Correlating with recent events',
    tool: 'kubectl.get',
    system: 'kube',
    input: 'events -n checkout --field-selector involvedObject.name=checkout-web',
    summary: '9 BackOff warnings in the last hour',
    durationMs: 1100,
  },
  {
    id: 'rollout',
    title: 'Checking rollout history',
    tool: 'argocd.app.history',
    system: 'ArgoCD',
    input: 'checkout-web',
    summary: 'Deployed 2.14.0 47 minutes before the first crash',
    durationMs: 1000,
  },
  {
    id: 'memory',
    title: 'Reviewing memory metrics',
    tool: 'promql.query',
    system: 'Mimir',
    input: 'container_memory_working_set_bytes{pod=~"checkout-web.*"}',
    summary: 'Memory peaks at 498Mi against a 512Mi limit on every spike',
    durationMs: 1200,
  },
]

// Fed to the real OpenUI renderer (canvasLibrary) as a canned, progressively
// revealed program — the model writes this in Phase 7; here it's scripted.
const CANVAS_PROGRAM = `root = Canvas([topology, finding])
topology = Topology(columns, nodes, edges, "deploy-checkout-web")
columns = ["Cluster", "Namespace", "Workload"]
nodes = [{id: "cluster", kind: "Cluster", name: "prod-us-east-1", status: "warning", col: 0, row: 1}, {id: "ns-checkout", kind: "Namespace", name: "checkout", status: "warning", col: 1, row: 0.5}, {id: "ns-payments", kind: "Namespace", name: "payments", status: "healthy", col: 1, row: 2}, {id: "deploy-checkout-web", kind: "Deployment", name: "checkout-web", status: "danger", col: 2, row: 0, focus: true}, {id: "deploy-checkout-worker", kind: "Deployment", name: "checkout-worker", status: "healthy", col: 2, row: 1}, {id: "deploy-payments-api", kind: "Deployment", name: "payments-api", status: "healthy", col: 2, row: 2}]
edges = [{from: "cluster", to: "ns-checkout", tone: "default"}, {from: "cluster", to: "ns-payments", tone: "default"}, {from: "ns-checkout", to: "deploy-checkout-web", tone: "danger"}, {from: "ns-checkout", to: "deploy-checkout-worker", tone: "default"}, {from: "ns-payments", to: "deploy-payments-api", tone: "default"}]
finding = Finding(1, "Memory limit hit on every spike", "high", "danger", "checkout-web has been CrashLoopBackOff since the 2.14.0 rollout 47 minutes ago. Memory peaks at 498Mi against a 512Mi limit on every traffic spike.", evidence)
evidence = [{n: 1, kind: "change", system: "ArgoCD", label: "checkout-web rev 47"}, {n: 2, kind: "metric", system: "Mimir", label: "memory_working_set"}, {n: 3, kind: "event", system: "kube", label: "9x BackOff"}]`

type StepStatus = 'queued' | 'running' | 'success'
type Phase = 'idle' | 'running' | 'done'

function AIWorkspace() {
  const [phase, setPhase] = React.useState<Phase>('idle')
  const [question, setQuestion] = React.useState('')
  const [statuses, setStatuses] = React.useState<Record<string, StepStatus>>({})
  const [revealLen, setRevealLen] = React.useState(0)
  const timers = React.useRef<ReturnType<typeof setTimeout>[]>([])

  React.useEffect(() => {
    return () => {
      timers.current.forEach(clearTimeout)
    }
  }, [])

  const runInvestigation = (prompt: string) => {
    timers.current.forEach(clearTimeout)
    timers.current = []

    setQuestion(prompt)
    setPhase('running')
    setRevealLen(0)
    const initial: Record<string, StepStatus> = {}
    TOOL_STEPS.forEach((s) => (initial[s.id] = 'queued'))
    setStatuses(initial)

    const totalMs = TOOL_STEPS.reduce((sum, s) => sum + s.durationMs, 0)
    const CHUNKS = 24
    for (let c = 1; c <= CHUNKS; c++) {
      timers.current.push(
        setTimeout(
          () => setRevealLen(Math.round((CANVAS_PROGRAM.length * c) / CHUNKS)),
          Math.round((totalMs * c) / CHUNKS),
        ),
      )
    }

    let elapsed = 0
    TOOL_STEPS.forEach((step, i) => {
      const startAt = elapsed
      const endAt = elapsed + step.durationMs
      elapsed = endAt

      timers.current.push(
        setTimeout(() => setStatuses((s) => ({ ...s, [step.id]: 'running' })), startAt),
      )
      timers.current.push(
        setTimeout(() => {
          setStatuses((s) => ({ ...s, [step.id]: 'success' }))
          if (i === TOOL_STEPS.length - 1) {
            setPhase('done')
          }
        }, endAt),
      )
    })
  }

  const traceSteps: TraceStep[] = TOOL_STEPS.map((step) => {
    const status = statuses[step.id] ?? 'queued'
    const traceStatus = status === 'success' ? 'done' : status === 'running' ? 'active' : 'pending'
    return {
      id: step.id,
      title: step.title,
      status: traceStatus,
      children: (
        <ToolCall tool={step.tool} system={step.system} input={step.input} status={status} summary={status === 'success' ? step.summary : undefined} />
      ),
    }
  })

  return (
    <SplitWorkspace
      left={
        phase === 'idle' ? (
          <div className="flex flex-col gap-4">
            <SuggestedPrompts prompts={SUGGESTED_PROMPTS} onPick={runInvestigation} />
            <PromptInput onSubmit={runInvestigation} autoFocus />
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            <UserMessage headline>{question}</UserMessage>
            <InvestigationTrace steps={traceSteps} />
            {phase === 'done' && (
              <AIMessage
                sources={
                  <>
                    <SourceChip n={1} kind="change" system="ArgoCD" label="checkout-web rev 47" />
                    <SourceChip n={2} kind="metric" system="Mimir" label="memory_working_set" />
                  </>
                }
              >
                <strong>It started with the 2.14.0 rollout.</strong> Memory peaks at 498Mi against a 512Mi limit on
                every traffic spike, and the container gets OOMKilled before it finishes warming up.
              </AIMessage>
            )}
          </div>
        )
      }
      right={
        <GeneratedPanel
          kicker="Infrastructure"
          title={phase === 'idle' ? 'Topology' : 'checkout-web'}
          sources={phase === 'done' ? 2 : undefined}
          state={phase === 'running' ? 'assembling' : 'ready'}
        >
          {phase === 'idle' ? (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <BranchMark size={28} lit={false} />
              <p className="text-ui text-ink-muted">Ask a question to see the topology Klyro builds while it investigates.</p>
            </div>
          ) : (
            <Renderer
              response={CANVAS_PROGRAM.slice(0, revealLen)}
              library={canvasLibrary}
              isStreaming={phase === 'running'}
            />
          )}
        </GeneratedPanel>
      }
    />
  )
}
