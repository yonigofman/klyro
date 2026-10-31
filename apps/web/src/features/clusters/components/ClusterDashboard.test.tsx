import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { Cluster } from "@klyro/api-client";

const { listClusters, registerCluster, deleteCluster, getCluster, listNamespaces, listPods } = vi.hoisted(() => ({
  listClusters: vi.fn(),
  registerCluster: vi.fn(),
  deleteCluster: vi.fn(),
  getCluster: vi.fn(),
  listNamespaces: vi.fn(),
  listPods: vi.fn(),
}));

vi.mock("#/lib/api-client", () => ({
  apiClient: { listClusters, registerCluster, deleteCluster, getCluster, listNamespaces, listPods },
}));

const { ClusterDashboard } = await import("./ClusterDashboard");
const { useClusterSelectionStore } = await import("#/features/clusters/selection-store");
const { useNamespaceFilterStore } = await import("#/features/clusters/namespace-filter-store");
const { useResourceTabStore } = await import("#/features/clusters/resource-tab-store");

function renderDashboard() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <ClusterDashboard />
    </QueryClientProvider>,
  );
}

function cluster(overrides: Partial<Cluster> = {}): Cluster {
  return {
    id: "c1",
    displayName: "prod",
    context: "prod-ctx",
    kubernetesVersion: "v1.30.1",
    connectionStatus: "connected",
    health: "green",
    nodeCount: 3,
    podCount: 12,
    lastSeen: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

beforeEach(() => {
  listClusters.mockReset();
  registerCluster.mockReset();
  deleteCluster.mockReset();
  listNamespaces.mockReset().mockResolvedValue([]);
  listPods.mockReset().mockResolvedValue([]);
  // Both stores are module-level singletons (by design — see
  // selection-store.ts / namespace-filter-store.ts) and must be reset
  // explicitly between tests.
  useClusterSelectionStore.setState({ selectedClusterId: null });
  useNamespaceFilterStore.setState({ selectedNamespaceByCluster: {} });
  useResourceTabStore.setState({ activeTabByCluster: {} });
});

describe("ClusterDashboard", () => {
  it("shows the empty state when there are no clusters", async () => {
    listClusters.mockResolvedValue([]);
    renderDashboard();
    expect(await screen.findByText(/no clusters registered yet/i)).toBeInTheDocument();
  });

  it("renders a roster row per cluster with the correct status label", async () => {
    listClusters.mockResolvedValue([
      cluster({ id: "c1", displayName: "prod", health: "green" }),
      cluster({ id: "c2", displayName: "staging", health: "amber" }),
      cluster({ id: "c3", displayName: "down-cluster", health: "red", connectionStatus: "unreachable" }),
    ]);
    renderDashboard();

    expect(await screen.findByText("prod")).toBeInTheDocument();
    expect(screen.getByText("staging")).toBeInTheDocument();
    expect(screen.getByText("down-cluster")).toBeInTheDocument();

    expect(screen.getByText("Healthy")).toBeInTheDocument();
    expect(screen.getByText("Degraded")).toBeInTheDocument();
    expect(screen.getByText("Down")).toBeInTheDocument();
    expect(screen.getByText("Unreachable")).toBeInTheDocument();
  });

  it("selecting a row opens its detail panel instead of navigating away", async () => {
    listClusters.mockResolvedValue([cluster({ id: "c1", displayName: "prod" })]);
    renderDashboard();

    const row = await screen.findByText("prod");
    await userEvent.click(row);

    expect(await screen.findByRole("region", { name: /prod detail/i })).toBeInTheDocument();
    expect(await screen.findByText(/no pods in this cluster/i)).toBeInTheDocument();
  });

  it("rejects an empty kubeconfig before submitting", async () => {
    listClusters.mockResolvedValue([]);
    renderDashboard();

    await userEvent.click(await screen.findByRole("button", { name: /add cluster/i }));
    await userEvent.click(screen.getByRole("button", { name: /register cluster/i }));

    expect(await screen.findByText(/kubeconfig is required/i)).toBeInTheDocument();
    expect(registerCluster).not.toHaveBeenCalled();
  });

  it("submits the register form, closes the dialog, and refreshes the roster", async () => {
    listClusters
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([cluster({ id: "c1", displayName: "new-cluster" })]);
    registerCluster.mockResolvedValue(cluster({ id: "c1", displayName: "new-cluster" }));
    renderDashboard();

    await screen.findByText(/no clusters registered yet/i);

    await userEvent.click(screen.getByRole("button", { name: /add cluster/i }));
    await userEvent.type(screen.getByLabelText(/kubeconfig/i), "apiVersion: v1");
    await userEvent.click(screen.getByRole("button", { name: /register cluster/i }));

    expect(await screen.findByText("new-cluster")).toBeInTheDocument();
    expect(registerCluster).toHaveBeenCalledWith(expect.objectContaining({ kubeconfig: "apiVersion: v1" }));
    expect(screen.queryByLabelText(/kubeconfig/i)).not.toBeInTheDocument();
  });

  it("filters the roster by name or context without touching the registered set", async () => {
    listClusters.mockResolvedValue([
      cluster({ id: "c1", displayName: "prod", context: "prod-ctx" }),
      cluster({ id: "c2", displayName: "staging", context: "stg-ctx" }),
    ]);
    renderDashboard();

    await screen.findByText("prod");
    await userEvent.type(screen.getByLabelText(/search clusters/i), "stg");

    expect(screen.queryByText("prod")).not.toBeInTheDocument();
    expect(screen.getByText("staging")).toBeInTheDocument();
  });

  it("distinguishes no-matches from no-clusters-at-all in the empty state", async () => {
    listClusters.mockResolvedValue([cluster({ id: "c1", displayName: "prod" })]);
    renderDashboard();

    await screen.findByText("prod");
    await userEvent.type(screen.getByLabelText(/search clusters/i), "nothing-matches-this");

    expect(await screen.findByText(/no clusters match your search/i)).toBeInTheDocument();
  });

  it("uses roomy row spacing for a handful of clusters", async () => {
    listClusters.mockResolvedValue(
      Array.from({ length: 3 }, (_, i) => cluster({ id: `c${i}`, displayName: `cluster-${i}` })),
    );
    renderDashboard();

    const table = await screen.findByRole("table");
    expect(table).toHaveAttribute("data-density", "roomy");
  });

  it("switches to dense row spacing at 50+ clusters", async () => {
    listClusters.mockResolvedValue(
      Array.from({ length: 50 }, (_, i) => cluster({ id: `c${i}`, displayName: `cluster-${i}` })),
    );
    renderDashboard();

    const table = await screen.findByRole("table");
    expect(table).toHaveAttribute("data-density", "dense");
  });
});
