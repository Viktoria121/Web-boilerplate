const OPEN_CLASS = "is-open";
const BODY_LOCK_CLASS = "has-popup";

let lastFocusedElement = null;

function getOpenOverlays() {
  return [...document.querySelectorAll(`.popup-overlay.${OPEN_CLASS}`)];
}

export function openPopup(id) {
  const overlay = document.getElementById(id);
  if (!overlay) return;

  lastFocusedElement = document.activeElement;
  overlay.classList.add(OPEN_CLASS);
  document.body.classList.add(BODY_LOCK_CLASS);
  overlay.querySelector(".popup-close")?.focus();
}

export function closePopup(overlay) {
  overlay.classList.remove(OPEN_CLASS);

  if (getOpenOverlays().length === 0) {
    document.body.classList.remove(BODY_LOCK_CLASS);
    lastFocusedElement?.focus?.();
    lastFocusedElement = null;
  }
}

/**
 * Прибирає :target з розмітки й керує попапами через клас.
 * Працюють Esc і клік по затемненню.
 */
export function initPopups() {
  document.addEventListener("click", (event) => {
    if (event.defaultPrevented) return;

    // Клік по затемненню (але не по самому вікну).
    if (event.target.classList?.contains("popup-overlay")) {
      closePopup(event.target);
      return;
    }

    const link = event.target.closest('a[href^="#"]');
    if (!link) return;

    if (link.classList.contains("popup-close")) {
      event.preventDefault();
      closePopup(link.closest(".popup-overlay"));
      return;
    }

    const target = document.getElementById(link.getAttribute("href").slice(1));
    if (target?.classList.contains("popup-overlay")) {
      event.preventDefault();
      openPopup(target.id);
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    const overlays = getOpenOverlays();
    if (overlays.length > 0) closePopup(overlays[overlays.length - 1]);
  });
}
