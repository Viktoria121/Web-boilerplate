// WebDataRocks і lodash підключені в index.html (глобальні WebDataRocks та _).
const { WebDataRocks, _ } = window;

const CONTAINER = "#report-pivot";

// Поле даних -> підпис колонки та тип. Ключі лишаються технічними, користувач бачить caption.
const FIELDS = {
  full_name: { caption: "Name", type: "string" },
  course: { caption: "Speciality", type: "string" },
  age: { caption: "Age", type: "number" },
  gender: { caption: "Gender", type: "string" },
  country: { caption: "Country", type: "string" },
  city: { caption: "City", type: "string" },
  email: { caption: "Email", type: "string" },
  phone: { caption: "Phone", type: "string" },
};

const rowsOf = (names) => names.map((uniqueName) => ({ uniqueName }));

const REPORTS = {
  // Звіт за країнами: кількість викладачів і середній вік.
  country: {
    slice: {
      rows: rowsOf(["country"]),
      columns: rowsOf(["[Measures]"]),
      measures: [
        { uniqueName: "full_name", aggregation: "count", caption: "Teachers" },
        { uniqueName: "age", aggregation: "average", caption: "Average age" },
      ],
    },
    options: { grid: { type: "compact" } },
  },
  // Плоска таблиця: кожен викладач — окремий рядок (у flat-формі дані не агрегуються).
  flat: {
    slice: {
      rows: rowsOf(_.without(_.keys(FIELDS), "age")),
      columns: rowsOf(["[Measures]"]),
      measures: [{ uniqueName: "age", aggregation: "sum", caption: FIELDS.age.caption }],
    },
    options: { grid: { type: "flat", showTotals: "off", showGrandTotals: "off" } },
  },
};

const buildReport = (teachers, view) => ({
  dataSource: { data: _.map(teachers, (teacher) => _.pick(teacher, _.keys(FIELDS))), mapping: FIELDS },
  formats: [{ name: "", maxDecimalPlaces: 1 }],
  slice: REPORTS[view].slice,
  options: { ...REPORTS[view].options, configuratorButton: false },
});

let pivot;

/** Показує звіт для всіх завантажених викладачів (view: "country" | "flat"). */
export function renderReport(teachers, view) {
  if (_.isEmpty(teachers)) return;

  const report = buildReport(teachers, view);
  if (pivot) {
    pivot.setReport(report);
    return;
  }
  pivot = new WebDataRocks({
    container: CONTAINER,
    toolbar: false,
    width: "100%",
    height: 420,
    report,
  });
}