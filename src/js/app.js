// lodash і dayjs підключені в index.html (глобальні _ та dayjs).
const {
  capitalize, deburr, filter, find, get, includes, isArray, isBoolean, isEmpty, isFunction,
  isNil, isNumber, isPlainObject, isString, map, mapValues, mean, orderBy, partition, pickBy,
  property, round, size, some, toLower, trim, uniqBy, upperFirst,
} = window._;
const dayjs = window.dayjs;

export const COURSES = [
  "Mathematics", "Physics", "English", "Computer Science",
  "Dancing", "Chess", "Biology", "Chemistry",
  "Law", "Art", "Medicine", "Statistics"
];

const asList = (value) => (isArray(value) ? value : []);

/**
 * API не повертає спеціальність, тож призначаємо її самі. Робимо це детерміновано
 * (хеш від id): той самий викладач завжди має ту саму спеціальність після перезавантаження.
 */
function pickCourse(seed) {
  let hash = 0;
  for (const char of String(seed)) {
    hash = (hash * 31 + char.codePointAt(0)) >>> 0;
  }
  return COURSES[hash % COURSES.length];
}

/* ---------- Дати (dayjs) ---------- */

// Беремо лише частину YYYY-MM-DD: так день народження не зсувається часовим поясом.
function parseDate(dateString) {
  const date = dateString ? dayjs(String(dateString).slice(0, 10)) : null;
  return date?.isValid() ? date : null;
}

/** Кількість повних років від дати народження до сьогодні. */
export function calculateAge(dateString) {
  const birth = parseDate(dateString);
  return birth ? dayjs().diff(birth, "year") : null;
}

/** Скільки днів залишилось до наступного дня народження (0 — сьогодні). */
export function daysToBirthday(dateString) {
  const birth = parseDate(dateString);
  if (!birth) return null;

  const today = dayjs().startOf("day");
  let next = birth.year(today.year());
  if (next.isBefore(today)) next = next.add(1, "year");
  return next.diff(today, "day");
}

/* ---------- Завдання 1: мапінг ---------- */

// Поле викладача -> шляхи, де воно може бути в різних джерелах (перший непорожній виграє).
const FIELD_PATHS = {
  title: ["title", "name.title"],
  city: ["city", "location.city"],
  state: ["state", "location.state"],
  country: ["country", "location.country"],
  postcode: ["postcode", "location.postcode"],
  coordinates: ["coordinates", "location.coordinates"],
  timezone: ["timezone", "location.timezone"],
  email: ["email"],
  phone: ["phone"],
  b_date: ["b_date", "b_day", "dob.date"],
  picture_large: ["picture_large", "picture.large"],
  picture_thumbnail: ["picture_thumbnail", "picture.thumbnail"],
  note: ["note"],
};

const pickFirst = (source, paths) => find(paths.map((path) => get(source, path)), Boolean) ?? null;

function normalizeUser(user, index) {
  const fields = mapValues(FIELD_PATHS, (paths) => pickFirst(user, paths));
  const id = get(user, "id.value") || (isString(user.id) ? user.id : get(user, "login.uuid")) || `user_${index + 1}`;

  return {
    id,
    gender: user.gender ? upperFirst(user.gender) : null,
    full_name: user.full_name || (user.name ? `${user.name.first} ${user.name.last}` : null),
    ...fields,
    age: isNumber(user.age) ? user.age : (get(user, "dob.age") ?? calculateAge(fields.b_date)),
    favorite: isBoolean(user.favorite) ? user.favorite : false,
    course: user.course || pickCourse(id),
    bg_color: user.bg_color || "#ffffff",
  };
}

export function formatTeachers(primUsers = [], secUsers = []) {
  return uniqBy(
    [...primUsers, ...secUsers].map(normalizeUser),
    (teacher) => toLower(teacher.full_name) || teacher.id
  );
}

/* ---------- Завдання 2: валідація ---------- */

const PHONE_RULES = {
  Germany: { pattern: /^\d{4}-\d{7}$/, example: "0151-1234567" },
  Ireland: { pattern: /^\d{3}-\d{3}-\d{4}$/, example: "081-234-5678" },
  Australia: { pattern: /^\d{2}-\d{4}-\d{4}$/, example: "04-1234-5678" },
  "United States": { pattern: /^\(\d{3}\)-\d{3}-\d{4}$/, example: "(555)-123-4567" },
  Finland: { pattern: /^\d{2}-\d{3}-\d{3}$/, example: "04-123-456" },
  Turkey: { pattern: /^\(\d{3}\)-\d{3}-\d{4}$/, example: "(555)-123-4567" },
  Switzerland: { pattern: /^\d{3}\s\d{3}\s\d{2}\s\d{2}$/, example: "078 123 45 67" },
  "New Zealand": { pattern: /^\(\d{3}\)-\d{3}-\d{4}$/, example: "(021)-123-4567" },
  Spain: { pattern: /^\d{3}-\d{3}-\d{3}$/, example: "612-345-678" },
  Norway: { pattern: /^\d{8}$/, example: "12345678" },
  Denmark: { pattern: /^\d{8}$/, example: "12345678" },
  Iran: { pattern: /^\d{3}-\d{8}$/, example: "091-12345678" },
  Canada: { pattern: /^\d{3}-\d{3}-\d{4}$/, example: "613-555-0123" },
  France: { pattern: /^\d{2}-\d{2}-\d{2}-\d{2}-\d{2}$/, example: "06-12-34-56-78" },
  Netherlands: { pattern: /^\(\d{3}\)-\d{3}-\d{4}$/, example: "(061)-234-5678" },
};

export const getPhoneExample = (country) => PHONE_RULES[country]?.example ?? null;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CAPITALIZED_FIELDS = { full_name: "Name", state: "State", city: "City", country: "Country" };

const isCapitalized = (value) => isString(value) && /^[\p{Lu}\p{Lo}]/u.test(value);
const isBlank = (value) => !isString(value) || isEmpty(trim(value));

function getPhoneError({ phone, country }) {
  if (isBlank(phone)) return "Phone is required";
  const rule = PHONE_RULES[country];
  return rule && !rule.pattern.test(phone) && `Phone for ${country} must look like ${rule.example}`;
}

/**
 * Повертає об'єкт { поле: повідомлення } з усіма помилками валідації.
 * Порожній об'єкт — викладач валідний.
 */
export function getTeacherErrors(teacher) {
  if (!isPlainObject(teacher)) return { _form: "Teacher data is missing" };

  // Кожна перевірка повертає текст помилки або false; pickBy залишає лише помилки.
  return pickBy({
    ...mapValues(CAPITALIZED_FIELDS, (label, field) =>
      !isCapitalized(teacher[field]) && `${label} is required and must start with a capital letter`),
    gender: !isCapitalized(teacher.gender) && "Select a gender",
    course: isBlank(teacher.course) && "Select a speciality",
    note: !isNil(teacher.note) && !isCapitalized(teacher.note) && "Notes must start with a capital letter",
    age: !(Number.isFinite(teacher.age) && teacher.age > 0) && "Enter a valid date of birth (not in the future)",
    email: !(isString(teacher.email) && EMAIL_PATTERN.test(teacher.email)) && "Enter a valid email, for example name@example.com",
    phone: getPhoneError(teacher),
  }, Boolean);
}

export const validateTeacher = (teacher) => isEmpty(getTeacherErrors(teacher));

/* ---------- Завдання 3: фільтрація ---------- */

// age — або точне число, або діапазон { min, max } (обидві межі включно, кожна необов'язкова).
function matchesAge(teacherAge, ageFilter) {
  if (isNil(ageFilter)) return true;
  if (isNumber(ageFilter)) return teacherAge === ageFilter;

  const { min = -Infinity, max = Infinity } = ageFilter;
  return Number.isFinite(teacherAge) && teacherAge >= min && teacherAge <= max;
}

const sameText = (a, b) => toLower(a) === toLower(b);

export function filterTeachers(teachers, { country, gender, age, favorite, withPhoto } = {}) {
  return filter(asList(teachers), (teacher) =>
    (!country || sameText(teacher.country, country)) &&
    (!gender || sameText(teacher.gender, gender)) &&
    matchesAge(teacher.age, age) &&
    (isNil(favorite) || teacher.favorite === favorite) &&
    (!withPhoto || Boolean(teacher.picture_large || teacher.picture_thumbnail))
  );
}

/* ---------- Завдання 4: сортування ---------- */

const DATE_KEYS = ["b_day", "b_date"];
const isMissing = (value) => isNil(value) || value === "" || Number.isNaN(value);
// Без урахування регістру й діакритики (аналог Intl.Collator із sensitivity: "base").
const toSortKey = (value) => (isString(value) ? toLower(deburr(value)) : value);

export function sortTeachers(teachers, sortBy = "full_name", order = "asc") {
  const read = includes(DATE_KEYS, sortBy) ? (teacher) => Date.parse(teacher.b_date) : property(sortBy);

  // Перший ключ відправляє порожні значення в кінець незалежно від напрямку.
  return orderBy(
    asList(teachers),
    [(teacher) => isMissing(read(teacher)), (teacher) => toSortKey(read(teacher))],
    ["asc", order === "desc" ? "desc" : "asc"]
  );
}

/* ---------- Завдання 5: пошук (ім'я, коментар, вік) ---------- */

export function matchesQuery(teacher, query) {
  const q = toLower(trim(query));
  if (!q) return false;

  return includes(toLower(teacher.full_name), q)
    || includes(toLower(teacher.note), q)
    || String(teacher.age) === q;
}

/** Усі викладачі, що відповідають запиту. Порожній запит повертає повний список. */
export function searchTeachers(teachers, query) {
  const list = asList(teachers);
  return trim(query) ? filter(list, (teacher) => matchesQuery(teacher, query)) : [...list];
}

export const findTeacher = (teachers, query) =>
  find(asList(teachers), (teacher) => matchesQuery(teacher, query)) ?? null;

/* ---------- Завдання 6: відсоток співпадінь ---------- */

export function getTeacherPercentage(teachers, condition) {
  if (isEmpty(teachers) || !condition) return 0;

  const predicate = isFunction(condition) ? condition : (teacher) => matchesQuery(teacher, condition);
  return round((size(filter(teachers, predicate)) / size(teachers)) * 100);
}

/* ---------- Додавання викладача (форма) ---------- */

const generateId = () =>
  globalThis.crypto?.randomUUID?.() ?? `user_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

const cleanString = (value) => (isString(value) && trim(value)) || null;

/**
 * Створює нового викладача з даних форми й перевіряє його.
 * Нічого не мутує: повертає { teacher, errors }. Якщо є помилки — teacher === null.
 */
export function createTeacher(input, existingTeachers = []) {
  const gender = cleanString(input.gender);
  const bDate = cleanString(input.b_date);

  const draft = {
    id: generateId(),
    gender: gender ? capitalize(gender) : null,
    title: null,
    full_name: cleanString(input.full_name),
    city: cleanString(input.city),
    state: cleanString(input.state),
    country: cleanString(input.country),
    postcode: null,
    coordinates: null,
    timezone: null,
    email: cleanString(input.email),
    b_date: bDate,
    age: calculateAge(bDate),
    phone: cleanString(input.phone),
    picture_large: null,
    picture_thumbnail: null,
    favorite: false,
    course: cleanString(input.course),
    bg_color: cleanString(input.bg_color) ?? "#ffffff",
    note: cleanString(input.note),
  };

  const errors = getTeacherErrors(draft);
  if (!errors.full_name && some(existingTeachers, (t) => sameText(t.full_name, draft.full_name))) {
    errors.full_name = "A teacher with this name already exists";
  }

  return isEmpty(errors) ? { teacher: draft, errors: {} } : { teacher: null, errors };
}

/* ---------- Дані з API ---------- */

/**
 * Повний шлях сирих даних API до готових викладачів:
 * нормалізація -> видалення дублікатів -> валідація.
 * Невалідні записи не потрапляють у список, але повертаються окремо (для логів і статистики).
 */
export function ingestUsers(rawUsers) {
  const entries = formatTeachers(asList(rawUsers)).map((teacher) => ({ teacher, errors: getTeacherErrors(teacher) }));
  const [valid, rejected] = partition(entries, ({ errors }) => isEmpty(errors));
  return { teachers: map(valid, "teacher"), rejected };
}

/**
 * Додає нових викладачів до наявних, пропускаючи дублікати (за id та за іменем).
 * Нічого не мутує. Повертає { merged, added }.
 */
export function mergeUniqueTeachers(existing, incoming) {
  const ids = new Set(map(existing, (t) => String(t.id)));
  const names = new Set(map(existing, (t) => toLower(t.full_name)).filter(Boolean));
  const added = [];

  for (const teacher of incoming) {
    const name = toLower(teacher.full_name);
    if (ids.has(String(teacher.id)) || (name && names.has(name))) continue;

    ids.add(String(teacher.id));
    if (name) names.add(name);
    added.push(teacher);
  }

  return { merged: [...existing, ...added], added };
}

/* ---------- Статистика ---------- */

/**
 * Зведена статистика для блоку Statistics.
 * visible — викладачі після фільтрів і пошуку, all — усі завантажені.
 */
export function calculateStatistics(visible, all) {
  const ages = filter(map(visible, "age"), isNumber);

  return {
    total: all.length,
    shown: visible.length,
    averageAge: isEmpty(ages) ? null : round(mean(ages), 1),
    favoritesPercent: getTeacherPercentage(visible, (teacher) => teacher.favorite),
  };
}