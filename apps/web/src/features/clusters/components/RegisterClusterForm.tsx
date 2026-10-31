import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { useRegisterCluster } from '#/features/clusters/queries'

const registerClusterSchema = z.object({
  kubeconfig: z.string().min(1, 'Kubeconfig is required'),
  context: z.string().optional(),
  displayName: z.string().optional(),
})

type RegisterClusterFormValues = z.infer<typeof registerClusterSchema>

export function RegisterClusterForm({ onSuccess }: { onSuccess?: () => void }) {
  const registerCluster = useRegisterCluster()
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<RegisterClusterFormValues>({
    resolver: zodResolver(registerClusterSchema),
    defaultValues: { kubeconfig: '', context: '', displayName: '' },
  })

  const onSubmit = handleSubmit((values) => {
    registerCluster.mutate(
      {
        kubeconfig: values.kubeconfig,
        context: values.context || undefined,
        displayName: values.displayName || undefined,
      },
      {
        onSuccess: () => {
          reset()
          onSuccess?.()
        },
      },
    )
  })

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="kubeconfig"
          className="text-xs uppercase tracking-wide text-muted-foreground"
        >
          Kubeconfig
        </label>
        <textarea
          id="kubeconfig"
          rows={6}
          className="w-full rounded-md border border-input bg-background p-2 font-mono text-xs text-foreground outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
          {...register('kubeconfig')}
        />
        {errors.kubeconfig && (
          <p role="alert" className="text-xs text-destructive">
            {errors.kubeconfig.message}
          </p>
        )}
      </div>
      <div className="flex gap-3">
        <div className="flex flex-1 flex-col gap-1.5">
          <label
            htmlFor="context"
            className="text-xs uppercase tracking-wide text-muted-foreground"
          >
            Context (optional)
          </label>
          <Input id="context" {...register('context')} />
        </div>
        <div className="flex flex-1 flex-col gap-1.5">
          <label
            htmlFor="displayName"
            className="text-xs uppercase tracking-wide text-muted-foreground"
          >
            Display name (optional)
          </label>
          <Input id="displayName" {...register('displayName')} />
        </div>
      </div>
      {registerCluster.isError && (
        <p role="alert" className="text-xs text-destructive">
          {registerCluster.error.message}
        </p>
      )}
      <Button
        type="submit"
        disabled={registerCluster.isPending}
        className="self-start"
      >
        Register cluster
      </Button>
    </form>
  )
}
