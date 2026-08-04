(() => {
  "use strict";

  const resetTimers = new WeakMap();

  const copyText = async (value) => {
    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(value);
        return true;
      } catch {
        // Use the local fallback below.
      }
    }

    const textArea = document.createElement("textarea");
    const activeElement = document.activeElement;

    textArea.value = value;
    textArea.readOnly = true;
    textArea.tabIndex = -1;
    textArea.style.position = "fixed";
    textArea.style.left = "-9999px";
    textArea.style.opacity = "0";
    document.body.append(textArea);
    textArea.select();

    let copied = false;

    try {
      copied = document.execCommand("copy");
    } catch {
      copied = false;
    } finally {
      textArea.remove();

      if (activeElement instanceof HTMLElement) {
        activeElement.focus({ preventScroll: true });
      }
    }

    return copied;
  };

  document.querySelectorAll("[data-copy-profile]").forEach((button) => {
    const label = button.querySelector("[data-profile-copy-label]");

    if (!(label instanceof HTMLElement)) {
      return;
    }

    button.addEventListener("click", async () => {
      const previousTimer = resetTimers.get(button);

      if (previousTimer) {
        window.clearTimeout(previousTimer);
      }

      const value = button.dataset.copyValue?.trim() ?? "";
      const copied = value !== "" && await copyText(value);

      label.textContent = copied ? "Copied" : "Copy Failed";
      button.classList.toggle("is-copied", copied);
      button.classList.toggle("is-copy-error", !copied);

      const timer = window.setTimeout(() => {
        button.classList.remove("is-copied", "is-copy-error");
        label.textContent = "Copy Link";
        resetTimers.delete(button);
      }, copied ? 1600 : 2200);

      resetTimers.set(button, timer);
    });
  });
})();
