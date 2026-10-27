const tabs = document.querySelectorAll("[data-tab]");
const panels = document.querySelectorAll(".tab-panel");

tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    tabs.forEach((item) => {
      const active = item === tab;
      item.classList.toggle("is-active", active);
      item.setAttribute("aria-selected", String(active));
    });

    panels.forEach((panel) => {
      const active = panel.id === tab.dataset.tab;
      panel.classList.toggle("is-visible", active);
      panel.hidden = !active;
    });
  });
});

document.querySelector("[data-print]")?.addEventListener("click", () => window.print());
