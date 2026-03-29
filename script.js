const SHEET_URL =
  "https://docs.google.com/spreadsheets/d/1uMd7UiKrAcJ8vAoglPhb1ZjJZSHiqFIDu7Sdw60wK0E/gviz/tq?tqx=out:csv";

const FALLBACK_CSV = `"","","chest","back","","abs","","bottom","","triceps","","","","","","","","528","","8"
"","6","4","5","6","13","8","4","7","5","4","0","3","0","0","6","0","","",""
"","72","75","61","70","161","51","38","42","30","15","113","11","21","10","11","1","","",""
"01.03.2026","","","","","","","","","","","","","","","","","","",""
"02.03.2026","","form","","","obl","","","","","","","","","","","","","",""
"03.03.2026","","","","","","","","","","","","","","","","","","",""
"04.03.2026","","","full","","set 1","","","","","","","","","","","","","",""
"05.03.2026","","","","","","","","","","","","","","","","","","",""
"06.03.2026","","","","","","","set 2","","set 2","","","","","","","","","",""
"07.03.2026","","","","","obl","","","","","","","","","","","","","",""
"08.03.2026","","form","top","","","","","","","","","","","","","","","",""
"09.03.2026","","","","","set 1","","","","","","","","","","","","","",""
"10.03.2026","","","","","","","","","","","","","","","","","","",""
"11.03.2026","","","","","obl","","","","","","","","","","","","","",""
"12.03.2026","","","","","","","","","","","","","","","","","","",""
"13.03.2026","","","full","","set 1","","set 1","","set 1","","","","","","","","","",""
"14.03.2026","","","","","","","","","","","","","","","","","","",""
"15.03.2026","","form","","","obl","","","","","","","","","","","","","",""
"16.03.2026","","","","","set 1","","","","","","","","","","","","","",""
"17.03.2026","","","","","","","","","","","","","","","","","","",""
"18.03.2026","","","top","","obl","","","","set 2","","","","","","","","","",""
"19.03.2026","","","","","","","","","","","","","","","","","","",""
"20.03.2026","","","","","set 1","","","","","","","","","","","","","",""
"21.03.2026","","","","","","","set 2","","","","","","","","","","","",""
"22.03.2026","","","","","","","","","","","","","","","","","","",""
"23.03.2026","","form","","","obl","","","","set 1","","","","","","","","","",""
"24.03.2026","","","full","","","","","","","","","","","","","","","",""
"25.03.2026","","","","","","","","","","","","","","","","","","",""
"26.03.2026","","","","","set 1","","","","","","","","","","","","","",""
"27.03.2026","","","","","","","","","","","","","","","","","","",""
"28.03.2026","","","","","","","","","","","","","","","","","","",""
"29.03.2026","","","","","obl","","set 1","","set 2","","","","","","","","","",""
"30.03.2026","","","","","","","","","","","","","","","","","","",""
"31.03.2026","","","","","","","","","","","","","","","","","","",""`;

document.addEventListener("DOMContentLoaded", init);

async function init() {
  try {
    const { csv, source } = await loadCsv();
    const rows = parseCsv(csv);
    const model = buildModel(rows);
    render(model, source);
  } catch (error) {
    console.error(error);
    renderError();
  }
}

async function loadCsv() {
  try {
    const response = await fetch(SHEET_URL, { cache: "no-store", mode: "cors" });
    if (!response.ok) {
      throw new Error(`Fetch failed: ${response.status}`);
    }

    return { csv: await response.text(), source: "live" };
  } catch (error) {
    return { csv: FALLBACK_CSV, source: "snapshot" };
  }
}

function parseCsv(csvText) {
  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;

  for (let index = 0; index < csvText.length; index += 1) {
    const char = csvText[index];
    const next = csvText[index + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        cell += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(cell);
      cell = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") {
        index += 1;
      }
      row.push(cell);
      cell = "";
      if (row.some((value) => value.trim() !== "")) {
        rows.push(row);
      }
      row = [];
      continue;
    }

    cell += char;
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    if (row.some((value) => value.trim() !== "")) {
      rows.push(row);
    }
  }

  return rows;
}

function buildModel(rows) {
  const headerRow = rows[0] || [];
  const sessionsRow = rows[1] || [];
  const volumeRow = rows[2] || [];
  const dailyRows = rows.slice(3);

  const focusAreas = headerRow
    .map((label, index) => {
      const name = label.trim();
      if (!name) {
        return null;
      }

      return {
        index,
        name: capitalize(name),
        sessions: toNumber(sessionsRow[index]),
        volume: toNumber(volumeRow[index]),
      };
    })
    .filter(Boolean);

  const daily = dailyRows
    .map((row) => {
      const dateLabel = (row[0] || "").trim();
      if (!dateLabel) {
        return null;
      }

      const activities = focusAreas
        .map((area) => {
          const tag = (row[area.index] || "").trim();
          if (!tag) {
            return null;
          }

          return {
            area: area.name,
            tag,
          };
        })
        .filter(Boolean);

      return {
        dateLabel,
        date: parseDate(dateLabel),
        activities,
        sessions: activities.length,
      };
    })
    .filter(Boolean);

  const activeDays = daily.filter((day) => day.sessions > 0);
  const totalSessions = focusAreas.reduce((sum, area) => sum + area.sessions, 0);
  const totalVolume = focusAreas.reduce((sum, area) => sum + area.volume, 0);
  const bestArea = [...focusAreas].sort((left, right) => right.volume - left.volume)[0];

  return {
    focusAreas,
    daily,
    totals: {
      totalSessions,
      totalVolume,
      activeDays: activeDays.length,
      leader: bestArea ? bestArea.name : "N/A",
      leaderVolume: bestArea ? bestArea.volume : 0,
      bestStreak: calculateBestStreak(daily),
    },
    highlights: [...activeDays].sort((left, right) => right.sessions - left.sessions).slice(0, 5),
  };
}

function render(model, source) {
  const status = document.getElementById("data-status");
  status.textContent =
    source === "live" ? "Live data connected" : "Showing local snapshot";

  setStat("sessions", model.totals.totalSessions);
  setStat("days", model.totals.activeDays);
  setStat("leader", `${model.totals.leader} · ${model.totals.leaderVolume}`);
  setStat("streak", model.totals.bestStreak);

  renderFocusChart(model.focusAreas);
  renderTimeline(model.daily);
  renderHeatmap(model.daily);
  renderHighlights(model.highlights);
}

function renderFocusChart(focusAreas) {
  const root = document.getElementById("focus-chart");
  root.innerHTML = "";

  if (!focusAreas.length) {
    root.innerHTML = `<div class="empty-state">No categories available to display.</div>`;
    return;
  }

  const maxVolume = Math.max(...focusAreas.map((area) => area.volume), 1);

  focusAreas.forEach((area) => {
    const row = document.createElement("div");
    row.className = "focus-row";
    row.innerHTML = `
      <div class="focus-label">${area.name}</div>
      <div class="focus-track" aria-hidden="true">
        <div class="focus-bar" style="width:${(area.volume / maxVolume) * 100}%"></div>
      </div>
      <div class="focus-meta">${area.sessions} / ${area.volume}</div>
    `;
    root.appendChild(row);
  });
}

function renderTimeline(daily) {
  const svg = document.getElementById("timeline-chart");
  svg.innerHTML = "";

  if (!daily.length) {
    return;
  }

  const width = 640;
  const height = 280;
  const padding = 28;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;
  const maxSessions = Math.max(...daily.map((day) => day.sessions), 1);

  const points = daily.map((day, index) => {
    const x = padding + (index / Math.max(daily.length - 1, 1)) * chartWidth;
    const y = height - padding - (day.sessions / maxSessions) * chartHeight;
    return { x, y, day };
  });

  const linePath = points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
    .join(" ");

  const areaPath = `${linePath} L ${points[points.length - 1].x.toFixed(2)} ${(height - padding).toFixed(
    2
  )} L ${points[0].x.toFixed(2)} ${(height - padding).toFixed(2)} Z`;

  svg.innerHTML = `
    <defs>
      <linearGradient id="line-gradient" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="#69d7ff" />
        <stop offset="100%" stop-color="#8affd4" />
      </linearGradient>
      <linearGradient id="area-gradient" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#8affd4" stop-opacity="0.42" />
        <stop offset="100%" stop-color="#8affd4" stop-opacity="0" />
      </linearGradient>
      <filter id="line-glow">
        <feGaussianBlur stdDeviation="4.2" result="glow" />
        <feMerge>
          <feMergeNode in="glow" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>
  `;

  for (let step = 0; step <= maxSessions; step += 1) {
    const y = height - padding - (step / maxSessions) * chartHeight;
    svg.insertAdjacentHTML(
      "beforeend",
      `<line x1="${padding}" y1="${y}" x2="${width - padding}" y2="${y}" stroke="rgba(255,255,255,0.08)" />`
    );
  }

  svg.insertAdjacentHTML(
    "beforeend",
    `<path d="${areaPath}" fill="url(#area-gradient)" opacity="0.6"></path>`
  );
  svg.insertAdjacentHTML(
    "beforeend",
    `<path d="${linePath}" fill="none" stroke="url(#line-gradient)" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" filter="url(#line-glow)"></path>`
  );

  points.forEach((point, index) => {
    const isMarked = point.day.sessions > 0;
    svg.insertAdjacentHTML(
      "beforeend",
      `<circle cx="${point.x}" cy="${point.y}" r="${isMarked ? 5 : 3}" fill="${
        isMarked ? "#8affd4" : "rgba(255,255,255,0.26)"
      }"></circle>`
    );

    if (index % 4 === 0 || index === points.length - 1) {
      svg.insertAdjacentHTML(
        "beforeend",
        `<text x="${point.x}" y="${height - 8}" fill="rgba(255,255,255,0.55)" font-size="11" text-anchor="middle">${
          point.day.date ? point.day.date.getDate() : index + 1
        }</text>`
      );
    }
  });
}

function renderHeatmap(daily) {
  const root = document.getElementById("heatmap");
  root.innerHTML = "";

  if (!daily.length) {
    root.innerHTML = `<div class="empty-state">No dates available for the heatmap.</div>`;
    return;
  }

  const maxSessions = Math.max(...daily.map((day) => day.sessions), 1);

  daily.forEach((day) => {
    const level = day.sessions / maxSessions;
    const cell = document.createElement("article");
    cell.className = "heat-cell";
    cell.style.background = `linear-gradient(180deg, rgba(255,255,255,0.03), rgba(138,255,212,${0.08 + level * 0.4}))`;
    cell.style.boxShadow = `0 0 ${10 + level * 22}px rgba(53,240,181,${0.08 + level * 0.3})`;
    cell.setAttribute(
      "aria-label",
      `${day.dateLabel}: ${day.sessions} ${pluralize(day.sessions, ["session", "sessions", "sessions"])}`
    );
    cell.innerHTML = `
      <span class="heat-day">${day.date ? day.date.getDate() : day.dateLabel}</span>
      <span class="heat-level">${day.sessions || "0"} active</span>
    `;
    root.appendChild(cell);
  });
}

function renderHighlights(highlights) {
  const root = document.getElementById("activity-log");
  root.innerHTML = "";

  if (!highlights.length) {
    root.innerHTML = `<div class="empty-state">No active days have been recorded yet.</div>`;
    return;
  }

  highlights.forEach((day) => {
    const item = document.createElement("article");
    item.className = "log-item";
    item.innerHTML = `
      <div class="log-topline">
        <div class="log-date">${day.dateLabel}</div>
        <div class="log-score">${day.sessions} ${pluralize(day.sessions, ["session", "sessions", "sessions"])}</div>
      </div>
      <div class="tag-list">
        ${day.activities
          .map((activity) => `<span class="tag">${activity.area} · ${activity.tag}</span>`)
          .join("")}
      </div>
    `;
    root.appendChild(item);
  });
}

function renderError() {
  const status = document.getElementById("data-status");
  status.textContent = "Unable to load data";
  document.getElementById("focus-chart").innerHTML =
    '<div class="empty-state">Check the sheet link or network access.</div>';
}

function setStat(name, value) {
  const element = document.querySelector(`[data-stat="${name}"]`);
  if (element) {
    element.textContent = value;
  }
}

function toNumber(value) {
  const parsed = Number.parseFloat(String(value || "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseDate(value) {
  const match = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(value);
  if (!match) {
    return null;
  }

  const [, day, month, year] = match;
  return new Date(Number(year), Number(month) - 1, Number(day));
}

function calculateBestStreak(daily) {
  let best = 0;
  let current = 0;

  daily.forEach((day) => {
    if (day.sessions > 0) {
      current += 1;
      best = Math.max(best, current);
    } else {
      current = 0;
    }
  });

  return best;
}

function capitalize(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function pluralize(number, forms) {
  return number === 1 ? forms[0] : forms[1];
}
