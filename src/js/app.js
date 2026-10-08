import { randomUserMock, additionalUsers } from './mock-data.js';

function main() {
  console.log("=== [Exercise 1] Formatted & Merged Array ===");
  const userList = formatArrays(randomUserMock, additionalUsers);
  console.log(`Total objects: ${userList.length}`);
  console.log("Sample user:", userList[0]);

  console.log("\n=== [Exercise 2] Validated Users Array ===");
  const validatedUsers = validateUsers(userList);
  console.log(`Valid users: ${validatedUsers.length} of ${userList.length}`);

  console.log("\n=== [Exercise 3] Filtered Users Array ===");
  const filters = {
    country: ["Germany", "Ukraine", "France"], 
    ageRange: [20, 70],
    gender: null,    
    favorite: null     
  };
  const filteredUsers = filterArray(userList, filters);
  console.log(`Matched filters: ${filteredUsers.length}`);

  console.log("\n=== [Exercise 4] Sorted Users Array ===");
  const sortedByAge = sortArray(userList, "age", "asc");
  console.log("Top 3 youngest:");
  console.table(sortedByAge.slice(0, 3).map(u => ({ Name: u.full_name, Age: u.age, Country: u.country })));

  const sortedByDate = sortArray(userList, "b_date", "asc");
  console.log("Top 3 by birth date:");
  console.table(sortedByDate.slice(0, 3).map(u => ({ Name: u.full_name, BirthDate: u.b_date })));

  console.log("\n=== [Exercise 5] Search Users Array ===");
  const foundUsers = findInArray(userList, "Germany");
  console.log(`Found by "Germany": ${foundUsers.length}`);

  console.log("\n=== [Exercise 6] Percentage Array ===");
  const percentage = matchPercentage(userList, user => user.age > 20);
  console.log(`Percentage over 20 years old: ${percentage.toFixed(2)}%`);
}

if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', main);
} else {
  main();
}

//Exercise 1
export function formatArrays(...data) {
  const allUsers = [];

  data.forEach(array => {
    if (Array.isArray(array)) {
      for (let user of array) {
        allUsers.push(formatUser(user));
      }
    }
  });

  const mergedUsers = mergeDuplicates(allUsers);

  // Set missing fields and fix phone format
  mergedUsers.forEach(user => {
    fillDefaults(user);
    user.phone = normalizePhoneNumber(user.phone, user.country);
  });

  return mergedUsers;
}

function formatUser(user) {
  const getString = (val) => typeof val === "string" ? val.trim() : "";
  const getNumber = (val) => (typeof val === "number" && isFinite(val)) ? val
    : (typeof val === "string" && val.trim() !== "" && isFinite(Number(val)) ? Number(val) : null);
  const getBoolean = (val) => typeof val === "boolean" ? val : null;
  const getObject = (val) => (val && typeof val === "object") ? val : null;

  return {
    gender: capitalize(getString(user?.gender)),
    title: getString(user?.name?.title) || getString(user?.title),
    full_name: getString(`${user?.name?.first || ""} ${user?.name?.last || ""}`.trim()) || getString(user?.full_name),
    city: getString(user?.location?.city) || getString(user?.city),
    state: getString(user?.location?.state) || getString(user?.state),
    country: getString(user?.location?.country) || getString(user?.country),
    postcode: user?.location?.postcode ?? user?.postcode ?? "",
    coordinates: getObject(user?.location?.coordinates) || getObject(user?.coordinates),
    timezone: getObject(user?.location?.timezone) || getObject(user?.timezone),
    email: getString(user?.email),
    b_date: getString(user?.dob?.date) || getString(user?.b_date) || getString(user?.b_day),
    age: getNumber(user?.dob?.age) ?? getNumber(user?.age),
    phone: getString(user?.phone),
    picture_large: getString(user?.picture?.large) || getString(user?.picture_large),
    picture_thumbnail: getString(user?.picture?.thumbnail) || getString(user?.picture_thumbnail),

    id: getString(user?.login?.uuid) || getString(user?.id?.value) || getString(user?.id),
    favorite: getBoolean(user?.favorite),
    course: getString(user?.course),
    bg_color: getString(user?.bg_color),
    note: getString(user?.note)
  };
}

function capitalize(text) {
  return text ? text[0].toUpperCase() + text.slice(1) : text;
}

function isEmpty(val) {
  return val === undefined || val === null || val === "";
}

// Find duplicates by full name and fill missing values
function mergeDuplicates(users) {
  const merged = {};
  users.forEach(user => {
    const key = user.full_name.trim().toLowerCase();
    if (!merged[key]) {
      merged[key] = { ...user };
    } else {
      let existing = merged[key];
      for (let field in user) {
        if (isEmpty(existing[field]) && !isEmpty(user[field])) {
          existing[field] = user[field];
        }
      }
    }
  });
  return Object.values(merged);
}

function fillDefaults(user) {
  if (isEmpty(user.id)) user.id = generateId();
  if (typeof user.favorite !== "boolean") user.favorite = getRandomBoolean();
  if (isEmpty(user.course)) user.course = getRandomDiscipline();
  if (isEmpty(user.bg_color)) user.bg_color = getRandomColor();
  if (user.age === null && user.b_date) user.age = calculateAge(user.b_date);
}

function calculateAge(dateStr) {
  const birth = new Date(dateStr);
  if (Number.isNaN(birth.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const monthDiff = now.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

function getRandomDiscipline() {
  const courses = [
    "Mathematics", "Physics", "English", "Computer Science", "Dancing",
    "Chess", "Biology", "Chemistry", "Law", "Art", "Medicine", "Statistics"
  ];
  return courses[Math.floor(Math.random() * courses.length)];
}

function getRandomColor() {
  const cssColors = ["red", "blue", "green", "orange", "purple", "gray"];
  const hex = () => "#" + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
  return Math.random() < 0.5 ? cssColors[Math.floor(Math.random() * cssColors.length)] : hex();
}

function getRandomBoolean() {
  return Math.random() < 0.5;
}

function generateId() {
  return Math.random().toString(36).substring(2, 11);
}

//Exercise 2
export function validateUsers(array) {
  return [...array].filter(user => validateUser(user));
}

export function validateUser(user) {
  return isCorrectFullName(user.full_name) &&
         isSentenceCase(user.gender) &&
         isSentenceCase(user.city) &&
         isSentenceCase(user.state) &&
         isSentenceCase(user.country) &&
         isCorrectNote(user.note) &&
         Number.isInteger(user.age) &&
         isCorrectEmail(user.email) &&
         isCorrectPhone(user.phone, user.country);
}

function isCorrectFullName(fullName) {
  if (!fullName || typeof fullName !== 'string') return false;
  const words = fullName.trim().split(/\s+/);
  if (words.length < 2) return false;
  return words.every(word => word[0] === word[0].toUpperCase());
}

function isSentenceCase(text) {
  if (!text || typeof text !== 'string' || text.trim() === "") return false;
  const trimmed = text.trim();
  return trimmed[0] === trimmed[0].toUpperCase();
}

function isCorrectNote(note) {
  if (note === undefined || note === null) return false;
  if (typeof note !== 'string') return false;
  if (note.trim() === "") return true;

  const sentences = note.split(/(?<=[.?!])\s+/);
  return sentences.every(s => s.trim() === "" || isSentenceCase(s.trim()));
}

function isCorrectEmail(email) {
  if (!email || typeof email !== 'string') return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isCorrectPhone(phone, country) {
  if (!phone || typeof phone !== 'string') return false;
  if (!/^\+\d{7,15}$/.test(phone)) return false;
  const code = getCountryCode(country);
  return code === null || phone.startsWith('+' + code);
}

function normalizePhoneNumber(number, country) {
  if (!number || typeof number !== 'string') return number;
  const countryCode = getCountryCode(country);
  let cleaned = number.replace(/[^\d+]/g, '');

  if (cleaned.startsWith('+')) return cleaned;
  if (cleaned.startsWith('00') && (!countryCode || cleaned.startsWith('00' + countryCode))) {
    return '+' + cleaned.slice(2);
  }
  if (!countryCode) return cleaned;
  if (cleaned.startsWith('0')) return '+' + countryCode + cleaned.slice(1);
  return '+' + countryCode + cleaned;
}

function getCountryCode(country) {
  const codes = {
    "Germany": "49", "France": "33", "Italy": "39", "Spain": "34", "Ukraine": "380",
    "United Kingdom": "44", "United States": "1", "USA": "1", "Canada": "1", "Japan": "81",
    "South Korea": "82", "China": "86", "India": "91", "Australia": "61", "New Zealand": "64",
    "Brazil": "55", "Argentina": "54", "Mexico": "52", "South Africa": "27", "Egypt": "20",
    "Nigeria": "234", "Kenya": "254", "Turkey": "90", "Saudi Arabia": "966", "United Arab Emirates": "971",
    "Israel": "972", "Pakistan": "92", "Bangladesh": "880", "Indonesia": "62", "Thailand": "66",
    "Vietnam": "84", "Philippines": "63", "Malaysia": "60", "Singapore": "65", "Iran": "98",
    "Iraq": "964", "Greece": "30", "Netherlands": "31", "Belgium": "32", "Sweden": "46",
    "Norway": "47", "Denmark": "45", "Finland": "358", "Poland": "48", "Czech Republic": "420",
    "Hungary": "36", "Austria": "43", "Switzerland": "41", "Portugal": "351", "Ireland": "353", "Romania": "40"
  };
  return codes[country] ?? null;
}

//Exercise 3
export function filterArray(usersArray, filters) {
  return [...usersArray].filter(user => {
    const genderMatch =
      filters.gender !== null && filters.gender !== undefined
        ? String(user.gender).toLowerCase() === String(filters.gender).toLowerCase()
        : true;

    const favoriteMatch =
      filters.favorite !== null && filters.favorite !== undefined
        ? user.favorite === filters.favorite
        : true;

    const countryMatch =
      Array.isArray(filters.country) && filters.country.length > 0
        ? filters.country.includes(user.country)
        : true;

    const ageMatch =
      Array.isArray(filters.ageRange) && filters.ageRange.length === 2
        ? Number.isFinite(user.age) && user.age >= filters.ageRange[0] && user.age <= filters.ageRange[1]
        : true;

    return genderMatch && favoriteMatch && countryMatch && ageMatch;
  });
}

//Exercise 4
export function sortArray(usersArray, key, order = "asc") {
  const sortKeys = { b_day: "b_date", date: "b_date" };
  const field = sortKeys[key] ?? key;
  const direction = order === "asc" ? 1 : -1;

  const getValue = user => {
    if (field === "b_date") {
      const time = new Date(user[field]).getTime();
      return Number.isNaN(time) ? null : time;
    }
    return user[field];
  };

  const isInvalid = val => val === undefined || val === null || val === "" || Number.isNaN(val);

  return [...usersArray].sort((a, b) => {
    const left = getValue(a);
    const right = getValue(b);

    if (isInvalid(left) || isInvalid(right)) {
      return isInvalid(left) - isInvalid(right);
    }

    if (typeof left === "string") {
      return direction * left.localeCompare(String(right));
    }
    return direction * (left - right);
  });
}

//Exercise 5
export function findInArray(usersArray, search) {
  const searchTerms = String(search).toLowerCase().split(/\s+/).filter(t => t !== "");
  if (searchTerms.length === 0) return [];

  const isMatchWord = word => searchTerms.some(term => word.startsWith(term));

  return usersArray.filter(user => {
    for (let key in user) {
      let value = user[key];

      if (typeof value === "boolean" || value == null) continue;

      if (typeof value === "number") {
        if (searchTerms.includes(String(value))) return true;
      } else if (typeof value === "string") {
        const words = value.toLowerCase().split(/\s+/);
        if (words.some(word => isMatchWord(word))) return true;
      } else if (Array.isArray(value)) {
        if (value.some(item => searchTerms.includes(String(item).toLowerCase()))) return true;
      } else if (typeof value === "object") {
        if (findInArray([value], search).length > 0) return true;
      }
    }
    return false;
  });
}

//Exercise 6
export function matchPercentage(usersArray, conditionFn) {
  if (typeof conditionFn !== "function") {
    throw new Error("Condition must be a function");
  }

  const total = usersArray.length;
  if (total === 0) return 0;

  const matched = usersArray.filter(user => conditionFn(user)).length;
  return (matched / total) * 100;
}