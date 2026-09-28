// FAU Owl Weather — plain JS, no build step. Data: Open-Meteo (no API key).

const DEFAULT_LOCATION = { name: "Boca Raton, Florida", latitude: 26.3683, longitude: -80.1289 };
const STORAGE_KEY = "owlWeather.location";

const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";
const GEOCODE_URL = "https://geocoding-api.open-meteo.com/v1/search";

// WMO weather codes -> [description, day icon, night icon]
const WEATHER_CODES = {
  0: ["Clear sky", "☀️", "🌙"],
  1: ["Mainly clear", "🌤️", "🌙"],
  2: ["Partly cloudy", "⛅", "☁️"],
  3: ["Overcast", "☁️", "☁️"],
  45: ["Fog", "🌫️", "🌫️"],
  48: ["Rime fog", "🌫️", "🌫️"],
  51: ["Light drizzle", "🌦️", "🌧️"],
  53: ["Drizzle", "🌦️", "🌧️"],
  55: ["Heavy drizzle", "🌧️", "🌧️"],
  56: ["Freezing drizzle", "🌧️", "🌧️"],
  57: ["Heavy freezing drizzle", "🌧️", "🌧️"],
  61: ["Light rain", "🌦️", "🌧️"],
  63: ["Rain", "🌧️", "🌧️"],
  65: ["Heavy rain", "🌧️", "🌧️"],
  66: ["Freezing rain", "🌧️", "🌧️"],
  67: ["Heavy freezing rain", "🌧️", "🌧️"],
  71: ["Light snow", "🌨️", "🌨️"],
  73: ["Snow", "🌨️", "🌨️"],
  75: ["Heavy snow", "❄️", "❄️"],
  77: ["Snow grains", "🌨️", "🌨️"],
  80: ["Light showers", "🌦️", "🌧️"],
  81: ["Showers", "🌧️", "🌧️"],
  82: ["Violent showers", "⛈️", "⛈️"],
  85: ["Snow showers", "🌨️", "🌨️"],
  86: ["Heavy snow showers", "❄️", "❄️"],
  95: ["Thunderstorm", "⛈️", "⛈️"],
  96: ["Thunderstorm with hail", "⛈️", "⛈️"],
  99: ["Severe thunderstorm with hail", "⛈️", "⛈️"],
};

function describe(code, isDay = true) {
  const entry = WEATHER_CODES[code] || ["Unknown", "❔", "❔"];
  return { text: entry[0], icon: isDay ? entry[1] : entry[2] };
}

const $ = (id) => document.getElementById(id);

function setStatus(message, isError = false) {
  const el = $("status");
  el.textContent = message;
  el.classList.toggle("error", isError);
  el.hidden = !message;
}

// Open-Meteo returns local times like "2026-09-28T14:00" when timezone=auto.
// Parse the parts directly so the browser's own timezone doesn't shift them.
function parseLocal(iso) {
  const [date, time = "00:00"] = iso.split("T");
  const [y, m, d] = date.split("-").map(Number);
  const [h, min] = time.split(":").map(Number);
  return new Date(y, m - 1, d, h, min);
}
const fmtTime = (iso) => parseLocal(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
const fmtHour = (iso) => parseLocal(iso).toLocaleTimeString([], { hour: "numeric" });
const fmtDay = (iso, i) => i === 0 ? "Today" : parseLocal(iso).toLocaleDateString([], { weekday: "short", month: "numeric", day: "numeric" });

function windDirection(deg) {
  const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return dirs[Math.round(deg / 45) % 8];
}

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  return res.json();
}

async function loadWeather(location) {
  setStatus(`Loading weather for ${location.name}…`);
  const params = new URLSearchParams({
    latitude: location.latitude,
    longitude: location.longitude,
    current: "temperature_2m,relative_humidity_2m,apparent_temperature,is_day,weather_code,wind_speed_10m,wind_direction_10m",
    hourly: "temperature_2m,precipitation_probability,weather_code,is_day",
    daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset,uv_index_max",
    temperature_unit: "fahrenheit",
    wind_speed_unit: "mph",
    precipitation_unit: "inch",
    timezone: "auto",
    forecast_days: "7",
  });

  try {
    const data = await fetchJson(`${FORECAST_URL}?${params}`);
    render(location, data);
    setStatus("");
  } catch (err) {
    console.error(err);
    setStatus(`Couldn't load weather: ${err.message}. Check your connection and try again.`, true);
  }
}

function render(location, data) {
  const { current, hourly, daily } = data;
  const t = (v) => `${Math.round(v)}°`;

  // Current conditions
  const now = describe(current.weather_code, current.is_day === 1);
  $("location-name").textContent = location.name;
  $("updated").textContent = `Updated ${fmtTime(current.time)} local time`;
  $("current-icon").textContent = now.icon;
  $("current-temp").textContent = `${t(current.temperature_2m)}F`;
  $("current-desc").textContent = `${now.text} · H ${t(daily.temperature_2m_max[0])} / L ${t(daily.temperature_2m_min[0])}`;
  $("feels-like").textContent = t(current.apparent_temperature);
  $("humidity").textContent = `${current.relative_humidity_2m}%`;
  $("wind").textContent = `${Math.round(current.wind_speed_10m)} mph ${windDirection(current.wind_direction_10m)}`;
  $("uv").textContent = daily.uv_index_max[0] != null ? daily.uv_index_max[0].toFixed(1) : "–";
  $("sunrise").textContent = fmtTime(daily.sunrise[0]);
  $("sunset").textContent = fmtTime(daily.sunset[0]);

  // Next 24 hours, starting at the current hour
  const currentHour = current.time.slice(0, 13);
  let start = hourly.time.findIndex((time) => time.slice(0, 13) >= currentHour);
  if (start < 0) start = 0;
  const hourlyEl = $("hourly");
  hourlyEl.replaceChildren();
  for (let i = start; i < Math.min(start + 24, hourly.time.length); i++) {
    const w = describe(hourly.weather_code[i], hourly.is_day[i] === 1);
    const li = document.createElement("li");
    li.innerHTML = `
      <div>${i === start ? "Now" : fmtHour(hourly.time[i])}</div>
      <span class="icon" title="${w.text}">${w.icon}</span>
      <div class="temp">${t(hourly.temperature_2m[i])}</div>
      <div class="precip">💧${hourly.precipitation_probability[i] ?? 0}%</div>`;
    hourlyEl.append(li);
  }

  // 7-day
  const dailyEl = $("daily");
  dailyEl.replaceChildren();
  daily.time.forEach((day, i) => {
    const w = describe(daily.weather_code[i]);
    const li = document.createElement("li");
    li.innerHTML = `
      <span class="day">${fmtDay(day, i)}</span>
      <span class="icon" title="${w.text}">${w.icon}</span>
      <span class="desc">${w.text} · 💧${daily.precipitation_probability_max[i] ?? 0}%</span>
      <span class="range">${t(daily.temperature_2m_max[i])}<span class="lo">${t(daily.temperature_2m_min[i])}</span></span>`;
    dailyEl.append(li);
  });

  ["current", "hourly-section", "daily-section"].forEach((id) => ($(id).hidden = false));
}

// Search
function placeLabel(place) {
  return [place.name, place.admin1, place.country].filter(Boolean).join(", ");
}

function selectLocation(location) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(location)); } catch {}
  $("search-results").hidden = true;
  $("search-input").value = "";
  loadWeather(location);
}

$("search-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const query = $("search-input").value.trim();
  if (!query) return;
  const list = $("search-results");
  list.replaceChildren();

  try {
    const params = new URLSearchParams({ name: query, count: "5", language: "en", format: "json" });
    const data = await fetchJson(`${GEOCODE_URL}?${params}`);
    const results = data.results || [];
    if (!results.length) {
      list.innerHTML = `<li><button type="button" disabled>No matches for "${query.replace(/[<>&"]/g, "")}"</button></li>`;
    }
    for (const place of results) {
      const li = document.createElement("li");
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = placeLabel(place);
      btn.addEventListener("click", () =>
        selectLocation({ name: placeLabel(place), latitude: place.latitude, longitude: place.longitude }));
      li.append(btn);
      list.append(li);
    }
    list.hidden = false;
  } catch (err) {
    console.error(err);
    setStatus(`Search failed: ${err.message}`, true);
  }
});

// Close results when clicking elsewhere
document.addEventListener("click", (e) => {
  if (!$("search-form").contains(e.target)) $("search-results").hidden = true;
});

// Start: last searched place, else Boca Raton
function initialLocation() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved && typeof saved.latitude === "number" && typeof saved.longitude === "number") return saved;
  } catch {}
  return DEFAULT_LOCATION;
}

loadWeather(initialLocation());
