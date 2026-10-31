import { activeTabFor, resourceTabs, useResourceTabStore } from "#/features/clusters/resource-tab-store";
import { cn } from "#/lib/utils";

export function ResourceTabs({ clusterId }: { clusterId: string }) {
  const activeTab = useResourceTabStore(activeTabFor(clusterId));
  const selectTab = useResourceTabStore((state) => state.selectTab);

  return (
    <div role="tablist" aria-label="Resource type" className="flex gap-1 border-b border-border">
      {resourceTabs.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            role="tab"
            type="button"
            aria-selected={isActive}
            onClick={() => selectTab(clusterId, tab.id)}
            className={cn(
              "px-3 py-1.5 font-mono text-xs uppercase tracking-wide outline-none",
              isActive
                ? "border-b-2 border-foreground text-foreground"
                : "border-b-2 border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
