import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "#/components/ui/button";
import { useRegisterCluster } from "#/features/clusters/queries";

const registerClusterSchema = z.object({
  kubeconfig: z.string().min(1, "Kubeconfig is required"),
  context: z.string().optional(),
  displayName: z.string().optional(),
});

type RegisterClusterFormValues = z.infer<typeof registerClusterSchema>;

export function RegisterClusterForm() {
  const registerCluster = useRegisterCluster();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<RegisterClusterFormValues>({
    resolver: zodResolver(registerClusterSchema),
    defaultValues: { kubeconfig: "", context: "", displayName: "" },
  });

  const onSubmit = handleSubmit((values) => {
    registerCluster.mutate(
      {
        kubeconfig: values.kubeconfig,
        context: values.context || undefined,
        displayName: values.displayName || undefined,
      },
      { onSuccess: () => reset() },
    );
  });

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3 border border-border bg-card p-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="kubeconfig" className="text-xs uppercase tracking-wide text-muted-foreground">
          Kubeconfig
        </label>
        <textarea
          id="kubeconfig"
          rows={4}
          className="w-full rounded-md border border-input bg-background p-2 font-mono text-xs"
          {...register("kubeconfig")}
        />
        {errors.kubeconfig && (
          <p role="alert" className="text-xs text-destructive">
            {errors.kubeconfig.message}
          </p>
        )}
      </div>
      <div className="flex gap-3">
        <div className="flex flex-1 flex-col gap-1">
          <label htmlFor="context" className="text-xs uppercase tracking-wide text-muted-foreground">
            Context (optional)
          </label>
          <input
            id="context"
            className="rounded-md border border-input bg-background p-2 text-sm"
            {...register("context")}
          />
        </div>
        <div className="flex flex-1 flex-col gap-1">
          <label htmlFor="displayName" className="text-xs uppercase tracking-wide text-muted-foreground">
            Display name (optional)
          </label>
          <input
            id="displayName"
            className="rounded-md border border-input bg-background p-2 text-sm"
            {...register("displayName")}
          />
        </div>
      </div>
      {registerCluster.isError && (
        <p role="alert" className="text-xs text-destructive">
          {registerCluster.error.message}
        </p>
      )}
      <Button type="submit" disabled={registerCluster.isPending} className="self-start">
        Register cluster
      </Button>
    </form>
  );
}
