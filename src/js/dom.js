/**
 * Дрібні DOM-утиліти. Весь користувацький текст вставляється через textContent,
 * тому дані з форми не можуть потрапити в розмітку як HTML.
 */

export function el(tag, { className, text, attrs = {}, dataset = {} } = {}, children = []) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined && text !== null) node.textContent = text;
  for (const [name, value] of Object.entries(attrs)) {
    if (value !== undefined && value !== null && value !== false) {
      node.setAttribute(name, value === true ? "" : value);
    }
  }
  Object.assign(node.dataset, dataset);
  node.append(...children);
  return node;
}

export function qs(selector, root = document) {
  const node = root.querySelector(selector);
  if (!node) throw new Error(`Element not found: ${selector}`);
  return node;
}

export function debounce(fn, delay = 250) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

/** "Ihor Tkachuk" -> { firstName: "Ihor", lastName: "Tkachuk" } */
export function splitName(fullName = "") {
  const [firstName = "", ...rest] = fullName.trim().split(/\s+/);
  return { firstName, lastName: rest.join(" ") };
}

/** "Ihor Tkachuk" -> "I.T" (формат, який уже використовує макет) */
export function getInitials(fullName = "") {
  const { firstName, lastName } = splitName(fullName);
  return [firstName, lastName]
    .filter(Boolean)
    .map((part) => part[0].toUpperCase())
    .join(".");
}

/** Чорний або білий — залежно від яскравості фону, щоб текст завжди читався. */
export function getContrastColor(hex) {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex ?? "");
  if (!match) return "";
  const value = parseInt(match[1], 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.55 ? "#211f20" : "#ffffff";
}

/**
 * Перезаповнює <select>, залишаючи перший <option> (плейсхолдер: "All" / "Select…").
 * Поточний вибір зберігається, якщо значення ще існує.
 */
export function setSelectOptions(select, values) {
  const previous = select.value;
  while (select.options.length > 1) select.remove(1);

  for (const value of values) {
    select.add(new Option(value, value));
  }

  const stillExists = values.includes(previous);
  select.value = stillExists ? previous : select.options[0].value;
}

export function uniqueSorted(values) {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

let toastTimer;
export function showToast(message) {
  const toast = qs("#toast");
  toast.textContent = message;
  toast.classList.add("is-visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("is-visible"), 2500);
}
