import { useState } from 'react'
import type { UseQueryResult } from '@tanstack/react-query'
import { ChevronRight } from 'lucide-react'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '#/components/ui/collapsible'
import { QueryState } from '#/components/shared/QueryState'

/**
 * The read-only "show me the YAML" affordance on every Detail page — the
 * one deliberate exception to curated Detail DTOs (ADR 0003). Collapsed by
 * default: a Manifest can run to hundreds of lines, and it isn't primary
 * scan content, so the query only fires once an operator opens it.
 */
export function ManifestSection({
  useManifest,
}: {
  useManifest: (enabled: boolean) => UseQueryResult<string, Error>
}) {
  const [open, setOpen] = useState(false)
  const manifestQuery = useManifest(open)

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground hover:text-foreground">
        <ChevronRight
          aria-hidden
          className={`size-3 transition-transform ${open ? 'rotate-90' : ''}`}
        />
        Manifest
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-2">
        <QueryState query={manifestQuery} loadingLabel="Loading manifest…">
          {(manifest) => (
            <pre className="max-h-96 overflow-auto rounded border border-border bg-muted/30 p-3 font-mono text-xs text-muted-foreground">
              {manifest}
            </pre>
          )}
        </QueryState>
      </CollapsibleContent>
    </Collapsible>
  )
}
