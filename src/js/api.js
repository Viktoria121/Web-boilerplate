/**
 * Усі мережеві запити застосунку в одному місці.
 *  - randomuser.me: джерело викладачів (початкові 50 + догрузка по 10);
 *  - json-server:   "наша" база, куди зберігаються викладачі, додані через форму.
 */

export const RANDOM_USER_URL = "https://randomuser.me/api/";
export const JSON_SERVER_URL = "http://localhost:3000";
export const TEACHERS_ENDPOINT = `${JSON_SERVER_URL}/teachers`;

export const INITIAL_COUNT = 50;
export const PAGE_SIZE = 10;

/**
 * seed робить вибірку відтворюваною: той самий seed завжди дає тих самих користувачів,
 * а отже, "наступна сторінка" справді продовжує список, а не дублює його.
 */
export const SEED = "teachinder";


export const FIRST_NEXT_PAGE = INITIAL_COUNT / PAGE_SIZE + 1;

export class ApiError extends Error {
  constructor(message, { status = null, cause = null } = {}) {
    super(message, { cause });
    this.name = "ApiError";
    this.status = status;
  }
}

async function requestJson(url, options) {
  let response;
  try {
    response = await fetch(url, options);
  } catch (cause) {
    // fetch кидає виняток лише при мережевих збоях (немає інтернету, сервер вимкнений)
    throw new ApiError("Network error: the server is unreachable", { cause });
  }

  // fetch НЕ вважає помилкою відповіді 4xx/5xx, тому перевіряємо response.ok самі.
  if (!response.ok) {
    throw new ApiError(`Request failed: ${response.status} ${response.statusText}`.trim(), {
      status: response.status,
    });
  }

  try {
    return await response.json();
  } catch (cause) {
    throw new ApiError("The server returned invalid JSON", { cause });
  }
}

/* ---------- randomuser.me ---------- */

export async function fetchRandomUsers({ results, page = 1, seed = SEED }) {
  const params = new URLSearchParams({ results: String(results), page: String(page), seed });
  const data = await requestJson(`${RANDOM_USER_URL}?${params}`);

  if (!Array.isArray(data?.results)) {
    throw new ApiError(data?.error ?? "Unexpected response from randomuser.me");
  }
  return data.results;
}

export function fetchInitialUsers() {
  return fetchRandomUsers({ results: INITIAL_COUNT, page: 1 });
}

export function fetchNextUsers(page) {
  return fetchRandomUsers({ results: PAGE_SIZE, page });
}

/* ---------- json-server ---------- */

export async function fetchSavedTeachers() {
  const data = await requestJson(TEACHERS_ENDPOINT);
  return Array.isArray(data) ? data : [];
}

/** POST /teachers. json-server повертає створений запис (статус 201). */
export function saveTeacher(teacher) {
  return requestJson(TEACHERS_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(teacher),
  });
}
