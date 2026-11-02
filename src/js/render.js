import { el, qs, splitName, getInitials, getContrastColor } from "./dom.js";

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

/* ---------- Статистика ---------- */

export function renderStatistics(tbody, teachers) {
  if (teachers.length === 0) {
    const cell = el("td", { text: "Nothing to show", attrs: { colspan: 5 } });
    tbody.replaceChildren(el("tr", {}, [cell]));
    return;
  }

  const rows = teachers.map((teacher) =>
    el("tr", {}, [
      el("td", { text: teacher.full_name ?? "—" }),
      el("td", { text: teacher.course ?? "—" }),
      el("td", { text: teacher.age ?? "—" }),
      el("td", { text: teacher.gender ?? "—" }),
      el("td", { text: teacher.country ?? "—" }),
    ])
  );
  tbody.replaceChildren(...rows);
}

export function renderSortState(headers, sort) {
  headers.forEach((th) => {
    const isActive = th.dataset.sort === sort.key;
    if (isActive) {
      th.setAttribute("aria-sort", sort.order === "desc" ? "descending" : "ascending");
    } else {
      th.removeAttribute("aria-sort");
    }
  });
}

/* ---------- Пагінація ---------- */

function getPageItems(current, total) {
  const pages = [1, total, current - 1, current, current + 1]
    .filter((page) => page >= 1 && page <= total);
  const unique = [...new Set(pages)].sort((a, b) => a - b);

  const items = [];
  let previous = 0;
  for (const page of unique) {
    if (page - previous > 1) items.push("…");
    items.push(page);
    previous = page;
  }
  return items;
}

export function renderPagination(container, currentPage, totalPages) {
  if (totalPages <= 1) {
    container.replaceChildren();
    container.hidden = true;
    return;
  }

  container.hidden = false;
  const items = getPageItems(currentPage, totalPages).map((item) => {
    if (item === "…") return el("span", { className: "pagination-dots", text: "…" });

    return el("button", {
      className: "pagination-button",
      text: String(item),
      attrs: {
        type: "button",
        "aria-label": `Page ${item}`,
        "aria-current": item === currentPage ? "page" : false,
      },
      dataset: { page: String(item) },
    });
  });
  container.replaceChildren(...items);
}

/* ---------- Попап з інформацією ---------- */

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
