import { createTeacher, getPhoneExample } from "./app.js";
import { el, qs } from "./dom.js";

// Ключ помилки з валідатора -> селектор поля у формі.
const FIELD_SELECTORS = {
  full_name: "#teacher-name",
  course: "#teacher-speciality",
  country: "#teacher-country",
  state: "#teacher-state",
  city: "#teacher-city",
  email: "#teacher-email",
  phone: "#teacher-phone",
  b_date: "#teacher-birth",
  gender: 'input[name="gender"]',
  note: "#teacher-notes",
};

// Вік обчислюється з дати народження, тому помилку показуємо біля поля дати.
const ERROR_KEY_ALIASES = { age: "b_date" };

const CONTAINER_SELECTOR = ".form-field, .form-field-radio, .form-field-background-color";
const DEFAULT_PHONE_PLACEHOLDER = "Enter phone";

function clearFieldError(container) {
  container.querySelector(".form-error")?.remove();
  container.querySelectorAll("[aria-invalid]").forEach((input) => {
    input.removeAttribute("aria-invalid");
    input.removeAttribute("aria-describedby");
  });
}

function clearAllErrors(form) {
  form.querySelectorAll(CONTAINER_SELECTOR).forEach(clearFieldError);
  const formError = form.querySelector("#form-error");
  if (formError) {
    formError.textContent = "";
    formError.hidden = true;
  }
}

// Загальна помилка форми (наприклад, сервер недоступний) — на відміну від помилок окремих полів.
function showFormError(form, message) {
  const formError = qs("#form-error", form);
  formError.textContent = message;
  formError.hidden = false;
}

function showFieldError(form, errorKey, message) {
  const fieldKey = ERROR_KEY_ALIASES[errorKey] ?? errorKey;
  const input = form.querySelector(FIELD_SELECTORS[fieldKey] ?? "");
  if (!input) return;

  const container = input.closest(CONTAINER_SELECTOR);
  clearFieldError(container);

  const errorId = `error-${fieldKey}`;
  container.append(el("p", { className: "form-error", text: message, attrs: { id: errorId, role: "alert" } }));
  input.setAttribute("aria-invalid", "true");
  input.setAttribute("aria-describedby", errorId);
}

/**
 * @param {object} options
 * @param {HTMLFormElement} options.form
 * @param {() => object[]} options.getTeachers  актуальний список (для перевірки дублікатів)
 * @param {(teacher: object) => Promise<void>} options.onAdd  викликається, коли дані валідні.
 *        Якщо повертає rejected-проміс (наприклад, POST не вдався), форма лишається відкритою
 *        з повідомленням і введеними даними.
 */
export function initAddTeacherForm({ form, getTeachers, onAdd }) {
  const countrySelect = qs("#teacher-country", form);
  const phoneInput = qs("#teacher-phone", form);
  const birthInput = qs("#teacher-birth", form);
  const submitButton = qs(".popup-submit", form);
  const submitLabel = submitButton.textContent;
  let isSubmitting = false;

  // Дата народження не може бути в майбутньому.
  birthInput.max = new Date().toISOString().slice(0, 10);

  const syncPhonePlaceholder = () => {
    phoneInput.placeholder = getPhoneExample(countrySelect.value) ?? DEFAULT_PHONE_PLACEHOLDER;
  };
  countrySelect.addEventListener("change", syncPhonePlaceholder);

  // Помилка зникає, щойно користувач почав виправляти поле.
  const onEdit = (event) => {
    const container = event.target.closest(CONTAINER_SELECTOR);
    if (container) clearFieldError(container);
  };
  form.addEventListener("input", onEdit);
  form.addEventListener("change", onEdit);

  const setSubmitting = (value) => {
    isSubmitting = value;
    submitButton.disabled = value;
    submitButton.textContent = value ? "Saving…" : submitLabel;
  };

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (isSubmitting) return;
    clearAllErrors(form);

    const input = Object.fromEntries(new FormData(form));
    const { teacher, errors } = createTeacher(input, getTeachers());

    if (!teacher) {
      for (const [key, message] of Object.entries(errors)) {
        showFieldError(form, key, message);
      }
      form.querySelector('[aria-invalid="true"]')?.focus();
      return;
    }

    setSubmitting(true);
    try {
      await onAdd(teacher);
      form.reset();
      syncPhonePlaceholder();
    } catch (error) {
      showFormError(form, `Teacher was not saved. ${error.message}`);
    } finally {
      setSubmitting(false);
    }
  });

  return { reset: () => { clearAllErrors(form); form.reset(); syncPhonePlaceholder(); } };
}
