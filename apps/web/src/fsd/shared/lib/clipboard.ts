/** Report success only after the browser accepted the full text. */
export async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return;
  } catch {
    const previous = document.activeElement as HTMLElement | null;
    const field = document.createElement("textarea");
    field.value = text;
    field.readOnly = true;
    field.style.cssText =
      "position:fixed;left:0;top:0;width:1px;height:1px;opacity:0";
    (document.querySelector("dialog[open]") || document.body).append(field);
    try {
      field.select();
      if (!document.execCommand("copy"))
        throw new Error("Clipboard unavailable");
    } finally {
      field.remove();
      previous?.focus({ preventScroll: true });
    }
  }
}
