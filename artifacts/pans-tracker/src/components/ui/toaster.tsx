import { CheckCircle2, AlertCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"

export function Toaster() {
  const { toasts } = useToast()

  return (
    <ToastProvider duration={3000}>
      {toasts.map(function ({ id, title, description, action, variant, ...props }) {
        const icon =
          variant === "success" ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-px" />
          ) : variant === "destructive" ? (
            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-px" />
          ) : null

        return (
          <Toast key={id} variant={variant} {...props}>
            <div className="flex items-start gap-2.5 w-full min-w-0">
              {icon}
              <div className="grid gap-0.5 flex-1 min-w-0">
                {title && <ToastTitle>{title}</ToastTitle>}
                {description && (
                  <ToastDescription>{description}</ToastDescription>
                )}
              </div>
            </div>
            {action}
            <ToastClose />
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}
