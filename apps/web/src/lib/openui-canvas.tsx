import { createLibrary, defineComponent } from '@openuidev/react-lang'
import { z } from 'zod'

import { FindingCard } from '#/components/ui/finding-card'
import { SourceChip } from '#/components/ui/source-chip'
import { TopologyMap } from '#/components/ui/topology-map'

/**
 * The OpenUI component library for the AI Workspace's generated canvas.
 * Wraps Klyro's real design-system components (not look-alikes) so the
 * generated canvas renders exactly like the rest of the app. Phase 4 feeds
 * this a canned OpenUI Lang program through the real @openuidev renderer,
 * streamed in via a scripted reveal — no live model, no API key. Phase 7
 * (Generative UI renderer) wires it to a real model through OpenUI Gateway.
 */

const statusEnum = z.enum(['healthy', 'warning', 'danger', 'info', 'neutral', 'progress'])

const topoNodeSchema = z.object({
  id: z.string(),
  kind: z.string(),
  name: z.string(),
  status: statusEnum.optional(),
  col: z.number(),
  row: z.number(),
  focus: z.boolean().optional(),
})

const topoEdgeSchema = z.object({
  from: z.string(),
  to: z.string(),
  tone: z.enum(['default', 'active', 'danger']).optional(),
})

const Topology = defineComponent({
  name: 'Topology',
  description:
    'Infrastructure topology: resources as nodes in layered columns connected by edges. nodes is a list of {id, kind, name, status, col, row, focus}; edges is a list of {from, to, tone}.',
  props: z.object({
    columns: z.array(z.string()).optional(),
    nodes: z.array(topoNodeSchema),
    edges: z.array(topoEdgeSchema),
    selectedId: z.string().optional(),
  }),
  component: ({ props }) => (
    <TopologyMap nodes={props.nodes} edges={props.edges} columns={props.columns} selectedId={props.selectedId} />
  ),
})

const evidenceSchema = z.object({
  n: z.number().optional(),
  kind: z.enum(['metric', 'log', 'event', 'manifest', 'resource', 'change', 'doc', 'trace']).optional(),
  system: z.string().optional(),
  label: z.string(),
})

const Finding = defineComponent({
  name: 'Finding',
  description:
    'A numbered finding: a stated conclusion with evidence. confidence is low/medium/high, tone is danger/warning/info/success, body is one or two sentences, evidence is a list of {n, kind, system, label} citation chips.',
  props: z.object({
    n: z.number(),
    title: z.string(),
    confidence: z.enum(['low', 'medium', 'high']).optional(),
    tone: z.enum(['danger', 'warning', 'info', 'success']).optional(),
    body: z.string(),
    evidence: z.array(evidenceSchema).optional(),
  }),
  component: ({ props }) => (
    <FindingCard
      n={props.n}
      title={props.title}
      confidence={props.confidence}
      tone={props.tone}
      evidence={
        props.evidence && (
          <>
            {props.evidence.map((e, i) => (
              <SourceChip key={i} n={e.n} kind={e.kind} system={e.system} label={e.label} />
            ))}
          </>
        )
      }
    >
      {props.body}
    </FindingCard>
  ),
})

const Canvas = defineComponent({
  name: 'Canvas',
  description: 'Top-level vertical stack for the generated canvas. children is a list of Topology and/or Finding.',
  props: z.object({ children: z.array(z.union([Topology.ref, Finding.ref])) }),
  component: ({ props, renderNode }) => <div className="flex flex-col gap-4">{renderNode(props.children)}</div>,
})

export const canvasLibrary = createLibrary({
  id: 'klyro-canvas',
  root: 'Canvas',
  components: [Canvas, Topology, Finding],
})
