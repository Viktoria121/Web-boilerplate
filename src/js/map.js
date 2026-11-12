// Leaflet підключений в index.html (глобальний L).
const { L } = window;

const ZOOM = 5;
let map;
let marker;

/** Координати з API приходять рядками: { latitude: "-69.82", longitude: "134.87" }. */
function toLatLng(coordinates) {
  const lat = Number.parseFloat(coordinates?.latitude);
  const lng = Number.parseFloat(coordinates?.longitude);
  return Number.isFinite(lat) && Number.isFinite(lng) ? [lat, lng] : null;
}

/**
 * Показує викладача на карті. Одна карта на весь застосунок: створюється при першому
 * показі, далі лише переміщується маркер. Якщо координат немає (наприклад, викладач
 * доданий через форму), блок з картою ховається.
 * Викликати після відкриття попапа: у прихованому контейнері Leaflet не знає свого розміру.
 */
export function showTeacherMap(container, coordinates) {
  const point = toLatLng(coordinates);
  container.hidden = !point;
  if (!point) return;

  if (!map) {
    map = L.map(container, { scrollWheelZoom: false });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(map);
    marker = L.marker(point).addTo(map);
  }

  marker.setLatLng(point);
  map.invalidateSize();
  map.setView(point, ZOOM);
}