import {
  COURSES,
  calculateStatistics,
  filterTeachers,
  ingestUsers,
  mergeUniqueTeachers,
  searchTeachers,
} from "./app.js";
import {
  FIRST_NEXT_PAGE,
  fetchInitialUsers,
  fetchNextUsers,
  fetchSavedTeachers,
  saveTeacher,
} from "./api.js";
import { debounce, qs, setSelectOptions, showToast, uniqueSorted } from "./dom.js";
import { closePopup, initPopups, openPopup } from "./popup.js";
import { initAddTeacherForm } from "./form.js";
import { renderStatisticsChart } from "./charts.js";
import { renderReport } from "./pivot.js";
import { showTeacherMap } from "./map.js";
import {
  renderFavoriteButton,
  renderFavorites,
  renderLoadError,
  renderLoading,
  renderReportTabs,
  renderStatisticsSummary,
  renderTeacherInfo,
  renderTeacherList,
} from "./render.js";

const SEARCH_DEBOUNCE_MS = 250;
const FORM_BASE_COUNTRIES = ["Ukraine", "Poland", "Germany", "United States", "Canada"];

const state = {
  teachers: [],
  filters: { age: "all", country: "", gender: "", favorite: false, withPhoto: false },
  query: "",
  chartGroup: "course",
  reportView: "country",
  selectedId: null,
  // Пагінація API
  nextApiPage: FIRST_NEXT_PAGE,
  isLoading: false,
  isLoaded: false,
  rejectedCount: 0,
};

const dom = {
  teacherList: qs("#teacher-list"),
  loadMore: qs("#load-more"),
  favoritesList: qs("#favorites-list"),
  slider: qs(".slider"),
  statsSummary: qs("#statistics-summary"),
  chartCanvas: qs("#statistics-chart"),
  chartGroup: qs("#chart-group"),
  reportTabs: qs("#report-tabs"),
  filters: qs(".filters"),
  filterAge: qs("#filter-age"),
  filterCountry: qs("#filter-country"),
  filterSex: qs("#filter-sex"),
  filterPhoto: qs("#filter-photo"),
  filterFavorites: qs("#filter-favorites"),
  searchForm: qs("#search-form"),
  searchInput: qs("#search-input"),
  infoFavorite: qs("#info-favorite"),
  infoMapCanvas: qs("#info-map-canvas"),
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

// Залежить від фільтрів і пошуку: картки, зведення та діаграма.
function renderMain() {
  const visible = getVisibleTeachers();
  renderTeacherList(dom.teacherList, visible);
  renderStatisticsSummary(dom.statsSummary, {
    ...calculateStatistics(visible, state.teachers),
    rejected: state.rejectedCount,
  });
  renderStatisticsChart(dom.chartCanvas, visible, state.chartGroup);
}

// Звіт показує всіх завантажених викладачів, тому не залежить від фільтрів:
// перемальовуємо лише коли змінюється список або вид звіту.
function renderReportSection() {
  renderReportTabs(dom.reportTabs, state.reportView);
  renderReport(state.teachers, state.reportView);
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

function setLoading(isLoading) {
  state.isLoading = isLoading;
  dom.teacherList.setAttribute("aria-busy", String(isLoading));
  dom.loadMore.disabled = isLoading;
  dom.loadMore.textContent = isLoading && state.isLoaded ? "Loading…" : "Next";
}

function updateLoadMoreVisibility() {
  dom.loadMore.hidden = !state.isLoaded;
}

/* ---------- Завантаження даних ---------- */

function reportRejected(rejected) {
  state.rejectedCount += rejected.length;
  if (rejected.length === 0) return;

  console.warn(`${rejected.length} user(s) from the API failed validation and were skipped:`);
  console.table(
    rejected.map(({ teacher, errors }) => ({
      name: teacher.full_name,
      country: teacher.country,
      problems: Object.values(errors).join("; "),
    }))
  );
}

/**
 * Викладачі, збережені раніше через форму (json-server).
 * Якщо сервер вимкнений, застосунок працює без неї.
 */
async function loadSavedTeachers() {
  try {
    const saved = await fetchSavedTeachers();
    const { teachers, rejected } = ingestUsers([...saved].reverse());
    reportRejected(rejected);
    return teachers;
  } catch (error) {
    console.warn("json-server is not available, saved teachers were not loaded:", error.message);
    return [];
  }
}

async function loadInitialTeachers() {
  setLoading(true);
  updateLoadMoreVisibility();
  renderLoading(dom.teacherList);
  state.rejectedCount = 0;

  try {
    // Запити незалежні, виконуємо паралельно.
    const [rawUsers, savedTeachers] = await Promise.all([fetchInitialUsers(), loadSavedTeachers()]);
    const { teachers, rejected } = ingestUsers(rawUsers);
    reportRejected(rejected);

    state.teachers = mergeUniqueTeachers(savedTeachers, teachers).merged;
    state.nextApiPage = FIRST_NEXT_PAGE;
    state.isLoaded = true;
  } catch (error) {
    state.isLoaded = false;
    state.teachers = [];
    renderMain();
    renderLoadError(dom.teacherList, error.message, loadInitialTeachers);
    return;
  } finally {
    setLoading(false);
    updateLoadMoreVisibility();
  }

  syncSelectOptions();
  renderMain();
  renderReportSection();
  renderFavoritesSection();
}

async function loadNextTeachers() {
  if (state.isLoading || !state.isLoaded) return;
  setLoading(true);

  try {
    const rawUsers = await fetchNextUsers(state.nextApiPage);
    state.nextApiPage += 1;

    const { teachers, rejected } = ingestUsers(rawUsers);
    reportRejected(rejected);

    const { merged, added } = mergeUniqueTeachers(state.teachers, teachers);
    state.teachers = merged;

    syncSelectOptions();
    renderMain();
    renderReportSection();
    showToast(`Loaded ${added.length} more teacher${added.length === 1 ? "" : "s"}`);
  } catch (error) {
    showToast(`Could not load more teachers. ${error.message}`);
  } finally {
    setLoading(false);
  }
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
  showTeacherMap(dom.infoMapCanvas, teacher.coordinates); // після openPopup: карті потрібен видимий контейнер
}

function toggleFavorite(id) {
  const teacher = findTeacherById(id);
  if (!teacher) return;

  teacher.favorite = !teacher.favorite;
  renderFavoriteButton(teacher);
  renderFavoritesSection();
  renderMain(); // "Only favorites" та відсоток вибраних залежать від цього прапорця
}

function applySearch(query) {
  state.query = query.trim();
  renderMain();
}

/**
 * Викликається формою, коли дані вже пройшли валідацію.
 * Спочатку зберігаємо на сервері (POST), і лише потім показуємо в списку:
 * якщо POST упаде, виняток дійде до форми, і вона покаже помилку.
 */
async function handleTeacherAdded(teacher) {
  const saved = await saveTeacher(teacher);

  state.teachers.unshift({ ...teacher, ...saved });
  syncSelectOptions();
  renderMain();
  renderReportSection();
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

  dom.loadMore.addEventListener("click", loadNextTeachers);
}

function bindStatistics() {
  dom.chartGroup.addEventListener("change", () => {
    state.chartGroup = dom.chartGroup.value;
    renderMain();
  });

  dom.reportTabs.addEventListener("click", (event) => {
    const tab = event.target.closest("[data-view]");
    if (!tab) return;
    state.reportView = tab.dataset.view;
    renderReportSection();
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

async function init() {
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

  renderFavoritesSection();
  await loadInitialTeachers();
}

init();