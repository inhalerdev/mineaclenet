(() => {
  "use strict";

  const menus = document.querySelectorAll("[data-site-menu]");

  menus.forEach((menu) => {
    if (!(menu instanceof HTMLDetailsElement)) {
      return;
    }

    const button = menu.querySelector(".site-menu__button");

    const syncLabel = () => {
      button?.setAttribute(
        "aria-label",
        menu.open ? "Close navigation menu" : "Open navigation menu",
      );
    };

    menu.addEventListener("toggle", syncLabel);
    menu.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => {
        menu.open = false;
      });
    });

    document.addEventListener("pointerdown", (event) => {
      if (menu.open && !menu.contains(event.target)) {
        menu.open = false;
      }
    });

    document.addEventListener("keydown", (event) => {
      if (event.key !== "Escape" || !menu.open) {
        return;
      }

      menu.open = false;
      button?.focus();
    });

    syncLabel();
  });
})();
