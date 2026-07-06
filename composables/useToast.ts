export interface ToastState {
  show: boolean;
  message: string;
  type: "info" | "success" | "error";
}

let hideTimer: ReturnType<typeof setTimeout> | null = null;

export function useToast() {
  const toast = useState<ToastState>("toast", () => ({
    show: false,
    message: "",
    type: "info",
  }));

  function showToast(message: string, type: ToastState["type"] = "info") {
    if (hideTimer) clearTimeout(hideTimer);
    toast.value = { show: true, message, type };
    hideTimer = setTimeout(() => {
      toast.value.show = false;
      hideTimer = null;
    }, 2000);
  }

  return { toast: readonly(toast), showToast };
}
