(() => {
  "use strict";

  const form = document.querySelector("[data-contact-form]");
  const submitButton = form?.querySelector("[data-contact-submit]");
  const submitLabel = form?.querySelector("[data-contact-submit-label]");
  const popAnchor = form?.querySelector("[data-contact-totem-anchor]");

  if (
    !(form instanceof HTMLFormElement) ||
    !(submitButton instanceof HTMLButtonElement) ||
    !(popAnchor instanceof HTMLElement)
  ) {
    return;
  }

  let submitting = false;

  const playTotemPop = () => {
    popAnchor.replaceChildren();

    const baseSource =
      form.dataset.totemSrc?.trim() || "/home/assets/images/totem.gif";
    const separator = baseSource.includes("?") ? "&" : "?";
    const image = document.createElement("img");

    image.className = "contact-totem-pop";
    image.src = `${baseSource}${separator}pop=${Date.now()}`;
    image.alt = "";
    image.setAttribute("aria-hidden", "true");
    image.draggable = false;

    image.addEventListener(
      "error",
      () => {
        image.remove();
      },
      { once: true },
    );

    popAnchor.append(image);

    window.setTimeout(() => {
      image.remove();
    }, 760);
  };

  form.addEventListener("submit", (event) => {
    if (submitting) {
      event.preventDefault();
      return;
    }

    /*
     * The submit event only fires after native required/minlength/email
     * validation succeeds, so the pop represents a real form submission.
     */
    event.preventDefault();
    submitting = true;

    submitButton.disabled = true;
    submitButton.setAttribute("aria-disabled", "true");

    if (submitLabel instanceof HTMLElement) {
      submitLabel.textContent = "Sending…";
    }

    playTotemPop();

    /*
     * Give the one-shot totem effect enough time to be seen, then perform one
     * native POST. HTMLFormElement.prototype.submit bypasses this listener so
     * a double submission cannot occur.
     */
    window.setTimeout(() => {
      HTMLFormElement.prototype.submit.call(form);
    }, 650);
  });
})();
