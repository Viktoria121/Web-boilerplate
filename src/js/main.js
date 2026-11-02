import {
  COURSES,
  formatTeachers,
  filterTeachers,
  searchTeachers,
  sortTeachers,
} from "./app.js";
import { debounce, qs, setSelectOptions, showToast, uniqueSorted } from "./dom.js";
import { closePopup, initPopups, openPopup } from "./popup.js";
import { initAddTeacherForm } from "./form.js";
import {
  renderFavoriteButton,
  renderFavorites,
  renderPagination,
  renderSortState,
  renderStatistics,
  renderTeacherInfo,
  renderTeacherList,
} from "./render.js";

const PAGE_SIZE = 10;
const SEARCH_DEBOUNCE_MS = 250;
const FORM_BASE_COUNTRIES = ["Ukraine", "Poland", "Germany", "United States", "Canada"];

const state = {
  teachers: [],
  filters: { age: "all", country: "", gender: "", favorite: false, withPhoto: false },
  query: "",
  sort: { key: null, order: "asc" },
  page: 1,
  selectedId: null,
};

const dom = {
  teacherList: qs("#teacher-list"),
  favoritesList: qs("#favorites-list"),
  slider: qs(".slider"),
  statsBody: qs("#statistics-body"),
  sortHeaders: [...document.querySelectorAll(".statistics-table th[data-sort]")],
  pagination: qs("#pagination"),
  filters: qs(".filters"),
  filterAge: qs("#filter-age"),
  filterCountry: qs("#filter-country"),
  filterSex: qs("#filter-sex"),
  filterPhoto: qs("#filter-photo"),
  filterFavorites: qs("#filter-favorites"),
  searchForm: qs("#search-form"),
  searchInput: qs("#search-input"),
  infoFavorite: qs("#info-favorite"),
  addTeacherForm: qs("#add-teacher-form"),
  addTeacherPopup: qs("#add-teacher-popup"),
};

/* ---------- Вибірка даних ---------- */

function parseAgeRange(value) {
  if (!value || value === "all") return undefined;
  if (value.endsWith("+")) return { min: Number.parseInt(value, 10) };
  const [min, max] = value.split("-").map(Number);
  return { min, max };
}

function getVisibleTeachers() {
  const { age, country, gender, favorite, withPhoto } = state.filters;
  const filtered = filterTeachers(state.teachers, {
    age: parseAgeRange(age),
    country: country || undefined,
    gender: gender || undefined,
    favorite: favorite ? true : undefined,
    withPhoto,
  });
  return searchTeachers(filtered, state.query);
}

/* ---------- Рендер ---------- */

function renderCards() {
  renderTeacherList(dom.teacherList, getVisibleTeachers());
}

function renderTable() {
  const visible = getVisibleTeachers();
  const sorted = state.sort.key ? sortTeachers(visible, state.sort.key, state.sort.order) : visible;

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  state.page = Math.min(Math.max(state.page, 1), totalPages);

  const start = (state.page - 1) * PAGE_SIZE;
  renderStatistics(dom.statsBody, sorted.slice(start, start + PAGE_SIZE));
  renderPagination(dom.pagination, state.page, totalPages);
  renderSortState(dom.sortHeaders, state.sort);
}

function renderMain() {
  renderCards();
  renderTable();
}

function renderFavoritesSection() {
  renderFavorites(dom.favoritesList, state.teachers.filter((teacher) => teacher.favorite));
}

function syncSelectOptions() {
  const countries = state.teachers.map((t) => t.country);
  const courses = state.teachers.map((t) => t.course);

  setSelectOptions(dom.filterCountry, uniqueSorted(countries));
  setSelectOptions(qs("#teacher-country"), uniqueSorted([...FORM_BASE_COUNTRIES, ...countries]));
  setSelectOptions(qs("#teacher-speciality"), uniqueSorted([...COURSES, ...courses]));
}

/* ---------- Дії ---------- */

function findTeacherById(id) {
  return state.teachers.find((teacher) => String(teacher.id) === String(id)) ?? null;
}

function showTeacherInfo(id) {
  const teacher = findTeacherById(id);
  if (!teacher) return;

  state.selectedId = teacher.id;
  renderTeacherInfo(teacher);
  openPopup("teacher-info-popup");
}

function toggleFavorite(id) {
  const teacher = findTeacherById(id);
  if (!teacher) return;

  teacher.favorite = !teacher.favorite;
  renderFavoriteButton(teacher);
  renderFavoritesSection();
  renderMain(); // "Only favorites" може змінити склад списку
}

function toggleSort(key) {
  state.sort = state.sort.key === key
    ? { key, order: state.sort.order === "asc" ? "desc" : "asc" }
    : { key, order: "asc" };
  state.page = 1;
  renderTable();
}

function applySearch(query) {
  state.query = query.trim();
  state.page = 1;
  renderMain();
}

function handleTeacherAdded(teacher) {
  state.teachers.unshift(teacher);
  syncSelectOptions();
  state.page = 1;
  renderMain();
  closePopup(dom.addTeacherPopup);
  showToast(`${teacher.full_name} was added`);
}

function scrollSlider(direction) {
  const content = dom.slider.querySelector(".slider-content");
  content.scrollBy({ left: direction * content.clientWidth, behavior: "smooth" });
}

/* ---------- Події ---------- */

function bindFilters() {
  dom.filters.addEventListener("change", () => {
    state.filters = {
      age: dom.filterAge.value,
      country: dom.filterCountry.value,
      gender: dom.filterSex.value,
      favorite: dom.filterFavorites.checked,
      withPhoto: dom.filterPhoto.checked,
    };
    state.page = 1;
    renderMain();
  });
}

function bindSearch() {
  const debouncedSearch = debounce(() => applySearch(dom.searchInput.value), SEARCH_DEBOUNCE_MS);
  dom.searchInput.addEventListener("input", debouncedSearch);
  dom.searchForm.addEventListener("submit", (event) => {
    event.preventDefault();
    applySearch(dom.searchInput.value);
  });
}

function bindTeacherCards() {
  const onCardClick = (event) => {
    const card = event.target.closest("[data-teacher-id]");
    if (!card) return;
    event.preventDefault();
    showTeacherInfo(card.dataset.teacherId);
  };
  dom.teacherList.addEventListener("click", onCardClick);
  dom.favoritesList.addEventListener("click", onCardClick);

  dom.infoFavorite.addEventListener("click", () => {
    if (state.selectedId !== null) toggleFavorite(state.selectedId);
  });
}

function bindStatistics() {
  for (const th of dom.sortHeaders) {
    th.tabIndex = 0;
    th.addEventListener("click", () => toggleSort(th.dataset.sort));
    th.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        toggleSort(th.dataset.sort);
      }
    });
  }

  dom.pagination.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-page]");
    if (!button) return;
    state.page = Number(button.dataset.page);
    renderTable();
  });
}

function bindSlider() {
  dom.slider.addEventListener("click", (event) => {
    if (event.target !== dom.slider) return;

    const rect = dom.slider.getBoundingClientRect();
    const edge = Number.parseFloat(getComputedStyle(dom.slider).paddingLeft) || 40;
    const x = event.clientX - rect.left;

    if (x <= edge) scrollSlider(-1);
    else if (x >= rect.width - edge) scrollSlider(1);
  });
}

/* ---------- Старт ---------- */

function init() {
  state.teachers = formatTeachers();

  initPopups();
  syncSelectOptions();
  initAddTeacherForm({
    form: dom.addTeacherForm,
    getTeachers: () => state.teachers,
    onAdd: handleTeacherAdded,
  });

  bindFilters();
  bindSearch();
  bindTeacherCards();
  bindStatistics();
  bindSlider();

  renderMain();
  renderFavoritesSection();
}

init();
