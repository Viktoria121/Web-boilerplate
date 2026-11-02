import { randomUserMock, additionalUsers } from "./mock-data.js";

export const COURSES = [
  "Mathematics", "Physics", "English", "Computer Science",
  "Dancing", "Chess", "Biology", "Chemistry",
  "Law", "Art", "Medicine", "Statistics"
];

function getRandomCourse() {
  const index = Math.floor(Math.random() * COURSES.length);
  return COURSES[index];
}

/**
 * Повертає кількість повних років від дати народження до сьогодні.
 * Рахуємо за календарними компонентами (а не за різницею в мс),
 * щоб не накопичувати похибку через високосні роки.
 */
export function calculateAge(dateString) {
  if (!dateString) return null;
  const birth = new Date(dateString);
  if (Number.isNaN(birth.getTime())) return null;

  const today = new Date();
  let age = today.getFullYear() - birth.getUTCFullYear();
  const monthDiff = today.getMonth() - birth.getUTCMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getUTCDate())) {
    age--;
  }
  return age;
}

function normalizeUser(user, index) {
  const fullName = user.full_name || (user.name ? `${user.name.first} ${user.name.last}` : null);
  const bDate = user.b_date || user.b_day || user.dob?.date || null;
  const age = typeof user.age === "number" ? user.age : (user.dob?.age ?? calculateAge(bDate));
  const course = user.course || getRandomCourse();
  const id = user.id?.value || (typeof user.id === "string" ? user.id : user.login?.uuid || `user_${index + 1}`);

  return {
    id,
    gender: user.gender ? user.gender[0].toUpperCase() + user.gender.slice(1) : null,
    title: user.title || user.name?.title || null,
    full_name: fullName,
    city: user.city || user.location?.city || null,
    state: user.state || user.location?.state || null,
    country: user.country || user.location?.country || null,
    postcode: user.postcode || user.location?.postcode || null,
    coordinates: user.coordinates || user.location?.coordinates || null,
    timezone: user.timezone || user.location?.timezone || null,
    email: user.email || null,
    b_date: bDate,
    age,
    phone: user.phone || null,
    picture_large: user.picture_large || user.picture?.large || null,
    picture_thumbnail: user.picture_thumbnail || user.picture?.thumbnail || null,
    favorite: typeof user.favorite === "boolean" ? user.favorite : false,
    course,
    bg_color: user.bg_color || "#ffffff",
    note: user.note || null,
  };
}

// Завдання 1
export function formatTeachers(primUsers = randomUserMock, secUsers = additionalUsers) {
  const map = new Map();
  const allUsers = [...primUsers, ...secUsers];

  allUsers.forEach((user, index) => {
    const normalized = normalizeUser(user, index);
    const key = normalized.full_name ? normalized.full_name.toLowerCase() : normalized.id;

    if (!map.has(key)) {
      map.set(key, normalized);
    }
  });

  return Array.from(map.values());
}

// Завдання 2
const phoneFormats = {
  Germany: /^\d{4}-\d{7}$/,
  Ireland: /^\d{3}-\d{3}-\d{4}$/,
  Australia: /^\d{2}-\d{4}-\d{4}$/,
  "United States": /^\(\d{3}\)-\d{3}-\d{4}$/,
  Finland: /^\d{2}-\d{3}-\d{3}$/,
  Turkey: /^\(\d{3}\)-\d{3}-\d{4}$/,
  Switzerland: /^\d{3}\s\d{3}\s\d{2}\s\d{2}$/,
  "New Zealand": /^\(\d{3}\)-\d{3}-\d{4}$/,
  Spain: /^\d{3}-\d{3}-\d{3}$/,
  Norway: /^\d{8}$/,
  Denmark: /^\d{8}$/,
  Iran: /^\d{3}-\d{8}$/,
  Canada: /^\d{3}-\d{3}-\d{4}$/,
  France: /^\d{2}-\d{2}-\d{2}-\d{2}-\d{2}$/,
  Netherlands: /^\(\d{3}\)-\d{3}-\d{4}$/,
};

const phoneExamples = {
  Germany: "0151-1234567",
  Ireland: "081-234-5678",
  Australia: "04-1234-5678",
  "United States": "(555)-123-4567",
  Finland: "04-123-456",
  Turkey: "(555)-123-4567",
  Switzerland: "078 123 45 67",
  "New Zealand": "(021)-123-4567",
  Spain: "612-345-678",
  Norway: "12345678",
  Denmark: "12345678",
  Iran: "091-12345678",
  Canada: "613-555-0123",
  France: "06-12-34-56-78",
  Netherlands: "(061)-234-5678",
};

export function getPhoneExample(country) {
  return phoneExamples[country] ?? null;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isCapitalized(value) {
  if (typeof value !== "string" || value.length === 0) return false;
  return /^[\p{Lu}\p{Lo}]/u.test(value);
}

/**
 * Повертає об'єкт { поле: повідомлення } з усіма помилками валідації.
 * Порожній об'єкт — викладач валідний.
 */
export function getTeacherErrors(teacher) {
  if (!teacher || typeof teacher !== "object") {
    return { _form: "Teacher data is missing" };
  }

  const errors = {};

  const capitalizedFields = {
    full_name: "Name",
    state: "State",
    city: "City",
    country: "Country",
  };
  for (const [field, label] of Object.entries(capitalizedFields)) {
    if (!isCapitalized(teacher[field])) {
      errors[field] = `${label} is required and must start with a capital letter`;
    }
  }

  if (!isCapitalized(teacher.gender)) {
    errors.gender = "Select a gender";
  }

  if (typeof teacher.course !== "string" || teacher.course.trim() === "") {
    errors.course = "Select a speciality";
  }

  if (teacher.note !== null && teacher.note !== undefined && !isCapitalized(teacher.note)) {
    errors.note = "Notes must start with a capital letter";
  }

  if (typeof teacher.age !== "number" || Number.isNaN(teacher.age) || teacher.age <= 0) {
    errors.age = "Enter a valid date of birth (not in the future)";
  }

  if (typeof teacher.email !== "string" || !EMAIL_PATTERN.test(teacher.email)) {
    errors.email = "Enter a valid email, for example name@example.com";
  }

  if (typeof teacher.phone !== "string" || teacher.phone.trim() === "") {
    errors.phone = "Phone is required";
  } else {
    const format = phoneFormats[teacher.country];
    if (format && !format.test(teacher.phone)) {
      errors.phone = `Phone for ${teacher.country} must look like ${phoneExamples[teacher.country]}`;
    }
  }

  return errors;
}

export function validateTeacher(teacher) {
  return Object.keys(getTeacherErrors(teacher)).length === 0;
}

// Завдання 3: Фільтрація
// filters.age — або точне число, або діапазон { min, max } (обидві межі включно, кожна необов'язкова).
function matchesAge(teacherAge, ageFilter) {
  if (ageFilter === undefined || ageFilter === null) return true;
  if (typeof ageFilter === "number") return teacherAge === ageFilter;
  if (typeof teacherAge !== "number") return false;

  const { min = -Infinity, max = Infinity } = ageFilter;
  return teacherAge >= min && teacherAge <= max;
}

export function filterTeachers(teachers, filters = {}) {
  if (!Array.isArray(teachers)) return [];

  return teachers.filter((teacher) => {
    if (filters.country && teacher.country?.toLowerCase() !== filters.country.toLowerCase()) {
      return false;
    }
    if (filters.gender && teacher.gender?.toLowerCase() !== filters.gender.toLowerCase()) {
      return false;
    }
    if (!matchesAge(teacher.age, filters.age)) {
      return false;
    }
    if (filters.favorite !== undefined && filters.favorite !== null && teacher.favorite !== filters.favorite) {
      return false;
    }
    if (filters.withPhoto && !(teacher.picture_large || teacher.picture_thumbnail)) {
      return false;
    }
    return true;
  });
}

// Завдання 4: Сортування
const collator = new Intl.Collator(undefined, { sensitivity: "base", numeric: true });

function isMissing(value) {
  return value === null || value === undefined || value === "" || Number.isNaN(value);
}

export function sortTeachers(teachers, sortBy = "full_name", order = "asc") {
  if (!Array.isArray(teachers)) return [];

  const direction = order === "desc" ? -1 : 1;
  const isDateKey = sortBy === "b_day" || sortBy === "b_date";

  const readValue = (teacher) => {
    if (isDateKey) {
      const time = new Date(teacher.b_date || NaN).getTime();
      return Number.isNaN(time) ? null : time;
    }
    return teacher[sortBy];
  };

  return [...teachers].sort((a, b) => {
    const valA = readValue(a);
    const valB = readValue(b);

    // Порожні значення завжди в кінці, незалежно від напрямку.
    const missingA = isMissing(valA);
    const missingB = isMissing(valB);
    if (missingA && missingB) return 0;
    if (missingA) return 1;
    if (missingB) return -1;

    const result = typeof valA === "number" && typeof valB === "number"
      ? valA - valB
      : collator.compare(String(valA), String(valB));

    return result * direction;
  });
}

// Завдання 5: Пошук (ім'я, коментар, вік)
export function matchesQuery(teacher, query) {
  const q = String(query ?? "").trim().toLowerCase();
  if (!q) return false;

  return Boolean(
    teacher.full_name?.toLowerCase().includes(q) ||
    teacher.note?.toLowerCase().includes(q) ||
    String(teacher.age) === q
  );
}

/** Усі викладачі, що відповідають запиту. Порожній запит повертає повний список. */
export function searchTeachers(teachers, query) {
  if (!Array.isArray(teachers)) return [];
  if (!String(query ?? "").trim()) return [...teachers];
  return teachers.filter((teacher) => matchesQuery(teacher, query));
}

export function findTeacher(teachers, query) {
  if (!teachers || !query || teachers.length === 0) {
    return null;
  }
  return teachers.find((teacher) => matchesQuery(teacher, query)) || null;
}

// Завдання 6: Відсоток співпадінь
export function getTeacherPercentage(teachers, condition) {
  if (!teachers || teachers.length === 0 || !condition) return 0;

  const matched = teachers.filter((teacher) =>
    typeof condition === "function" ? condition(teacher) : matchesQuery(teacher, condition)
  );

  return Math.round((matched.length / teachers.length) * 100);
}

// Додавання викладача (форма)
function generateId() {
  return globalThis.crypto?.randomUUID?.() ?? `user_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function cleanString(value) {
  const trimmed = typeof value === "string" ? value.trim() : "";
  return trimmed === "" ? null : trimmed;
}

/**
 * Створює нового викладача з даних форми й перевіряє його.
 * Нічого не мутує: повертає { teacher, errors }.
 * Якщо є помилки — teacher === null.
 */
export function createTeacher(input, existingTeachers = []) {
  const gender = cleanString(input.gender);
  const bDate = cleanString(input.b_date);

  const draft = {
    id: generateId(),
    gender: gender ? gender[0].toUpperCase() + gender.slice(1).toLowerCase() : null,
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

  const nameKey = draft.full_name?.toLowerCase();
  if (!errors.full_name && existingTeachers.some((t) => t.full_name?.toLowerCase() === nameKey)) {
    errors.full_name = "A teacher with this name already exists";
  }

  return Object.keys(errors).length > 0
    ? { teacher: null, errors }
    : { teacher: draft, errors: {} };
}
