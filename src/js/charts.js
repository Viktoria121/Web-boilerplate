// Chart.js і lodash підключені в index.html (глобальні Chart та _).
const { Chart, _ } = window;

let chart;

// Золотий кут дає помітно різні кольори для будь-якої кількості секторів.
const sliceColor = (index) => `hsl(${(index * 137.5) % 360} 60% 55%)`;

/**
 * Кругова діаграма: скільки викладачів у кожній групі (за ключем: course, country, gender).
 * Один екземпляр Chart оновлюється на місці, щоб не створювати нові на кожну зміну фільтра.
 */
export function renderStatisticsChart(canvas, teachers, key) {
  const counts = _.orderBy(
    _.toPairs(_.countBy(teachers, (teacher) => teacher[key] || "Unknown")),
    [([, count]) => count],
    ["desc"]
  );
  const labels = _.map(counts, 0);
  const data = {
    labels,
    datasets: [{ data: _.map(counts, 1), backgroundColor: labels.map((_label, i) => sliceColor(i)) }],
  };

  if (chart) {
    chart.data = data;
    chart.update();
    return;
  }

  chart = new Chart(canvas, {
    type: "pie",
    data,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: "bottom" } },
    },
  });
}