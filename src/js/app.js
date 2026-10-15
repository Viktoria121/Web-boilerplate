import { randomUserMock, additionalUsers } from "./mock-data.js";

const COURSES = [
  "Mathematics", "Physics", "English", "Computer Science",
  "Dancing", "Chess", "Biology", "Chemistry",
  "Law", "Art", "Medicine", "Statistics"
];

function getRandomCourse() {
  const index = Math.floor(Math.random() * COURSES.length);
  return COURSES[index];
}

function calculateAge(dateString) {
  if (!dateString) return null;
  const birth = new Date(dateString);
  if (isNaN(birth.getTime())) return null;
  const diff = Date.now() - birth.getTime();
  const ageDate = new Date(diff);
  return ageDate.getUTCFullYear() - 1970;
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

// Завдання 1: Форматування та об'єднання
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

// Завдання 2: Валідація
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

function isCapitalized(value) {
  if (typeof value !== "string" || value.length === 0) return false;
  return /^[\p{Lu}\p{Lo}]/u.test(value);
}

export function validateTeacher(teacher) {
  if (!teacher || typeof teacher !== "object") return false;

  const stringFields = ["full_name", "gender", "state", "city", "country"];
  for (const field of stringFields) {
    if (!isCapitalized(teacher[field])) {
      return false;
    }
  }

  if (teacher.note !== null && teacher.note !== undefined) {
    if (!isCapitalized(teacher.note)) {
      return false;
    }
  }

  if (typeof teacher.age !== "number" || isNaN(teacher.age) || teacher.age <= 0) {
    return false;
  }

  if (typeof teacher.email !== "string" || !teacher.email.includes("@")) {
    return false;
  }

  if (typeof teacher.phone !== "string") {
    return false;
  }

  const format = phoneFormats[teacher.country];
  if (format && !format.test(teacher.phone)) {
    return false;
  }

  return true;
}

// Завдання 3: Фільтрація (Логічне "І")
export function filterTeachers(teachers, filters = {}) {
  if (!Array.isArray(teachers)) return [];

  return teachers.filter((teacher) => {
    if (filters.country && teacher.country?.toLowerCase() !== filters.country.toLowerCase()) {
      return false;
    }
    if (filters.gender && teacher.gender?.toLowerCase() !== filters.gender.toLowerCase()) {
      return false;
    }
    if (filters.age !== undefined && filters.age !== null && teacher.age !== filters.age) {
      return false;
    }
    if (filters.favorite !== undefined && filters.favorite !== null && teacher.favorite !== filters.favorite) {
      return false;
    }
    return true;
  });
}

// Завдання 4: Сортування
export function sortTeachers(teachers, sortBy = "full_name", order = "asc") {
  if (!Array.isArray(teachers)) return [];

  const copy = [...teachers];

  return copy.sort((a, b) => {
    let valA = a[sortBy];
    let valB = b[sortBy];

    if (sortBy === "b_day" || sortBy === "b_date") {
      valA = new Date(a.b_date || 0).getTime();
      valB = new Date(b.b_date || 0).getTime();
    }

    if (!valA) return 1;
    if (!valB) return -1;

    let res = 0;
    if (typeof valA === "number" && typeof valB === "number") {
      res = valA - valB;
    } else {
      res = String(valA).localeCompare(String(valB));
    }

    return order === "desc" ? -res : res;
  });
}

// Завдання 5: Пошук
export function findTeacher(teachers, query) {
  if (!teachers || !query || teachers.length === 0) {
    return null;
  }

  const q = String(query).toLowerCase();

  return teachers.find((teacher) =>
    teacher.full_name?.toLowerCase().includes(q) ||
    teacher.note?.toLowerCase().includes(q) ||
    teacher.age == q
  ) || null;
}

// Завдання 6: Відсоток співпадінь
export function getTeacherPercentage(teachers, condition) {
  if (!teachers || teachers.length === 0 || !condition) return 0;

  const matched = teachers.filter((teacher) => {
    if (typeof condition === "function") {
      return condition(teacher);
    }
    const q = String(condition).toLowerCase();
    return (
      teacher.full_name?.toLowerCase()?.includes(q) ||
      teacher.note?.toLowerCase()?.includes(q) ||
      teacher.age == condition
    );
  });

  return Math.round((matched.length / teachers.length) * 100);
}
