import { el, qs, splitName, getInitials, getContrastColor } from "./dom.js";
import { daysToBirthday } from "./app.js";

const INFO_POPUP_ID = "teacher-info-popup";

/* ---------- Аватар ---------- */

function createPlaceholder(teacher, className) {
  return el("div", { className, text: getInitials(teacher.full_name), attrs: { "aria-hidden": "true" } });
}

function createAvatar(teacher, { imageClass, placeholderClass }) {
  const src = teacher.picture_large || teacher.picture_thumbnail;
  if (!src) return createPlaceholder(teacher, placeholderClass);

  const img = el("img", {
    className: imageClass,
    attrs: { src, alt: teacher.full_name ?? "Teacher", loading: "lazy" },
  });
  // Якщо картинка не завантажилась — показуємо ініціали замість "битого" зображення.
  img.addEventListener("error", () => img.replaceWith(createPlaceholder(teacher, placeholderClass)), { once: true });
  return img;
}

/* ---------- Картки ---------- */

export function createTeacherCard(teacher, { showSubject = true } = {}) {
  const { firstName, lastName } = splitName(teacher.full_name ?? "");

  const children = [
    createAvatar(teacher, {
      imageClass: "teacher-card-avatar",
      placeholderClass: "teacher-card-avatar-placeholder",
    }),
    el("h2", { className: "teacher-card-name", text: firstName }),
    el("h2", { className: "teacher-card-surname", text: lastName }),
  ];
  if (showSubject) {
    children.push(el("p", { className: "teacher-card-subject", text: teacher.course ?? "" }));
  }
  children.push(el("p", { className: "teacher-card-country", text: teacher.country ?? "" }));

  return el(
    "a",
    {
      className: `teacher-card teacher-card-link${teacher.favorite ? " is-favorite" : ""}`,
      attrs: { href: `#${INFO_POPUP_ID}` },
      dataset: { teacherId: teacher.id },
    },
    children
  );
}

function renderCards(container, teachers, options, emptyMessage) {
  if (teachers.length === 0) {
    container.replaceChildren(el("p", { className: "empty-state", text: emptyMessage }));
    return;
  }
  container.replaceChildren(...teachers.map((teacher) => createTeacherCard(teacher, options)));
}

export function renderTeacherList(container, teachers) {
  renderCards(container, teachers, { showSubject: true }, "No teachers match your filters. Try changing or clearing them.");
}

export function renderFavorites(container, teachers) {
  renderCards(container, teachers, { showSubject: false }, "No favorites yet. Open a teacher and press the star to add one.");
}

/* ---------- Стани завантаження ---------- */

export function renderLoading(container) {
  container.replaceChildren(el("p", { className: "empty-state", text: "Loading teachers…" }));
}

export function renderLoadError(container, message, onRetry) {
  const retry = el("button", { className: "retry-button", text: "Try again", attrs: { type: "button" } });
  retry.addEventListener("click", onRetry);

  container.replaceChildren(
    el("div", { className: "error-state", attrs: { role: "alert" } }, [
      el("p", { text: `Could not load teachers. ${message}` }),
      retry,
    ])
  );
}

/* ---------- Статистика ---------- */

/**
 * Зведення над діаграмою. Оновлюється при кожній зміні даних:
 * фільтри, пошук, догрузка з API, додавання викладача, зміна вибраних.
 */
export function renderStatisticsSummary(container, stats) {
  const item = (label, value) =>
    el("p", { className: "statistics-summary-item" }, [
      document.createTextNode(`${label}: `),
      el("strong", { text: String(value) }),
    ]);

  const items = [
    item("Teachers shown", `${stats.shown} of ${stats.total}`),
    item("Average age", stats.averageAge ?? "—"),
    item("Favorites", `${stats.favoritesPercent}%`),
  ];
  if (stats.rejected > 0) items.push(item("Skipped as invalid", stats.rejected));

  container.replaceChildren(...items);
}

/** Перемикач виду звіту (по країнах / усі викладачі). */
export function renderReportTabs(container, view) {
  container.querySelectorAll("[data-view]").forEach((tab) => {
    tab.setAttribute("aria-pressed", String(tab.dataset.view === view));
  });
}

/* ---------- Попап з інформацією ---------- */

function formatBirthday(days) {
  if (days === 0) return "Birthday is today";
  return `Next birthday in ${days} ${days === 1 ? "day" : "days"}`;
}

export function renderTeacherInfo(teacher) {
  const popup = qs(".popup-teacher-info");

  qs("#info-avatar-slot").replaceChildren(
    createAvatar(teacher, {
      imageClass: "teacher-info-avatar",
      placeholderClass: "teacher-info-avatar teacher-info-avatar-placeholder",
    })
  );

  qs("#info-name").textContent = teacher.full_name ?? "";
  qs("#info-course").textContent = teacher.course ?? "";
  qs("#info-location").textContent = [teacher.city, teacher.country].filter(Boolean).join(", ");
  qs("#info-age-gender").textContent = [teacher.age, teacher.gender].filter((v) => v !== null && v !== undefined).join(", ");
  qs("#info-phone").textContent = teacher.phone ?? "";
  qs("#info-note").textContent = teacher.note ?? "No notes yet.";

  const daysLeft = daysToBirthday(teacher.b_date);
  const birthday = qs("#info-birthday");
  birthday.hidden = daysLeft === null;
  birthday.textContent = daysLeft === null ? "" : formatBirthday(daysLeft);

  const email = qs("#info-email");
  email.textContent = teacher.email ?? "";
  email.href = teacher.email ? `mailto:${teacher.email}` : "#";
  email.hidden = !teacher.email;

  const mapQuery = [teacher.city, teacher.state, teacher.country].filter(Boolean).join(", ");
  const mapLink = qs("#info-map");
  mapLink.href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery)}`;

  // Колір фону, обраний у формі, застосовуємо до тіла попапа.
  const bg = teacher.bg_color && teacher.bg_color.toLowerCase() !== "#ffffff" ? teacher.bg_color : "";
  popup.style.backgroundColor = bg;
  popup.style.color = bg ? getContrastColor(bg) : "";

  renderFavoriteButton(teacher);
}

export function renderFavoriteButton(teacher) {
  const button = qs("#info-favorite");
  button.textContent = teacher.favorite ? "★" : "☆";
  button.setAttribute("aria-pressed", String(teacher.favorite));
  button.setAttribute("aria-label", teacher.favorite ? "Remove from favorites" : "Add to favorites");
}