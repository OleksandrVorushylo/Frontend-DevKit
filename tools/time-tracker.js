
const ext = globalThis.chrome || globalThis.browser;
const runtime = ext?.runtime;
const storage = ext?.storage?.local;

const KEY = 'fdtTimeTrackerState';
const DAY = 86400000;

const DEFAULTS = {
  version: 1,
  projects: [],
  tasks: [],
  activeTaskId: null,
  pomodoro: {
    mode: 'independent',
    linkedTaskId: null,
    isRunning: false,
    phase: 'work',
    workMinutes: 25,
    breakMinutes: 5,
    cycles: 4,
    currentCycle: 1,
    autoStartNext: false,
    notifications: true,
    startedAt: null,
    endsAt: null
  },
  lastActivityAt: Date.now(),
  updatedAt: Date.now()
};

function isPromise(v) {
  return !!v && typeof v.then === 'function';
}

function uid(prefix) {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

function n(v, fallback) {
  const parsed = Number(v);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clamp(v, min, max) {
  return Math.min(max, Math.max(min, v));
}

function esc(v) {
  return String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function normalizeProjectName(raw) {
  return String(raw || '').trim().slice(0, 60);
}

function normalizeDescription(raw) {
  return String(raw || '').trim().slice(0, 800);
}

function normalizeTaskUrl(raw) {
  const value = String(raw || '').trim();
  if (!value) return '';

  try {
    const direct = new URL(value);
    if (direct.protocol === 'http:' || direct.protocol === 'https:') return direct.toString();
  } catch (e) {
    // ignore
  }

  try {
    return new URL(`https://${value}`).toString();
  } catch (e) {
    return '';
  }
}

function normalizeTags(raw) {
  const source = Array.isArray(raw) ? raw : String(raw || '').split(/[\s,]+/);
  const unique = new Set();

  source.forEach((part) => {
    const tag = String(part || '').trim().replace(/^#+/, '').toLowerCase();
    if (tag) unique.add(tag);
  });

  return Array.from(unique).slice(0, 12);
}

function normalizeProjects(raw) {
  const unique = new Set();
  const projects = [];

  (Array.isArray(raw) ? raw : []).forEach((name) => {
    const clean = normalizeProjectName(name);
    const key = clean.toLowerCase();
    if (!clean || unique.has(key)) return;
    unique.add(key);
    projects.push(clean);
  });

  return projects.slice(-20);
}

function addProject(state, nameRaw) {
  const name = normalizeProjectName(nameRaw);
  if (!name) return '';

  const idx = state.projects.findIndex((item) => item.toLowerCase() === name.toLowerCase());
  if (idx === -1) {
    state.projects.push(name);
    state.projects = state.projects.slice(-20);
    return name;
  }

  return state.projects[idx];
}

function normalizeSession(raw, fallbackId) {
  const start = n(raw?.start, 0);
  let end = raw?.end == null ? null : n(raw?.end, null);
  if (end != null && end < start) end = start;

  return {
    id: raw?.id || fallbackId,
    start,
    end,
    source: raw?.source === 'pomodoro' ? 'pomodoro' : 'manual'
  };
}

function normalizeTask(raw, idx) {
  const sessions = (Array.isArray(raw?.sessions) ? raw.sessions : [])
    .map((s, sIdx) => normalizeSession(s, `session_${idx}_${sIdx}`))
    .filter((s) => s.start > 0);

  let hasOpen = false;
  sessions.forEach((s) => {
    if (s.end == null) {
      if (hasOpen) s.end = s.start;
      hasOpen = true;
    }
  });

  return {
    id: raw?.id || `task_${idx}`,
    title: String(raw?.title || `Task ${idx + 1}`).trim().slice(0, 80),
    project: normalizeProjectName(raw?.project),
    projectUrl: normalizeTaskUrl(raw?.projectUrl),
    description: normalizeDescription(raw?.description),
    taskUrl: normalizeTaskUrl(raw?.taskUrl),
    tags: normalizeTags(raw?.tags),
    sessions,
    isStopped: Boolean(raw?.isStopped),
    completedAt: raw?.completedAt == null ? null : n(raw?.completedAt, null),
    createdAt: n(raw?.createdAt, Date.now()),
    updatedAt: n(raw?.updatedAt, Date.now())
  };
}

function normalizePomodoro(raw, tasks) {
  const ids = new Set(tasks.map((t) => t.id));
  const cycles = clamp(Math.round(n(raw?.cycles, 4)), 1, 24);

  const startedAt = raw?.startedAt == null ? null : n(raw?.startedAt, null);
  const endsAt = raw?.endsAt == null ? null : n(raw?.endsAt, null);
  let isRunning = Boolean(raw?.isRunning);
  if (!startedAt || !endsAt || endsAt <= startedAt) isRunning = false;

  return {
    mode: raw?.mode === 'task' ? 'task' : 'independent',
    linkedTaskId: ids.has(raw?.linkedTaskId) ? raw.linkedTaskId : null,
    isRunning,
    phase: raw?.phase === 'break' ? 'break' : 'work',
    workMinutes: clamp(Math.round(n(raw?.workMinutes, 25)), 1, 180),
    breakMinutes: clamp(Math.round(n(raw?.breakMinutes, 5)), 1, 90),
    cycles,
    currentCycle: clamp(Math.round(n(raw?.currentCycle, 1)), 1, cycles),
    autoStartNext: Boolean(raw?.autoStartNext),
    notifications: raw?.notifications !== false,
    startedAt,
    endsAt
  };
}

function openSession(task) {
  return task.sessions.find((s) => s.end == null) || null;
}

function findTask(state, taskId) {
  return state.tasks.find((t) => t.id === taskId) || null;
}

function normalize(raw) {
  const base = { ...DEFAULTS, ...(raw && typeof raw === 'object' ? raw : {}) };
  const tasks = (Array.isArray(base.tasks) ? base.tasks : []).map((t, idx) => normalizeTask(t, idx));

  let projects = normalizeProjects(base.projects);
  const projectState = { projects };
  tasks.forEach((task) => {
    if (task.project) {
      task.project = addProject(projectState, task.project);
    }
  });
  projects = projectState.projects;

  const ids = new Set(tasks.map((t) => t.id));
  let activeTaskId = ids.has(base.activeTaskId) ? base.activeTaskId : null;

  tasks.forEach((task) => {
    const open = openSession(task);
    if (!open) return;
    if (task.id !== activeTaskId) {
      open.end = Math.max(open.start, n(base.lastActivityAt, Date.now()));
    }
  });

  if (activeTaskId) {
    const active = findTask({ tasks }, activeTaskId);
    if (!active || !openSession(active)) activeTaskId = null;
  }

  return {
    version: 1,
    projects,
    tasks,
    activeTaskId,
    pomodoro: normalizePomodoro(base.pomodoro, tasks),
    lastActivityAt: n(base.lastActivityAt, Date.now()),
    updatedAt: n(base.updatedAt, Date.now())
  };
}

async function getState() {
  if (!storage) return normalize(DEFAULTS);

  const defaults = { [KEY]: DEFAULTS };
  if (storage.get.length <= 1) {
    const out = await storage.get(defaults);
    return normalize(out?.[KEY]);
  }

  return new Promise((resolve, reject) => {
    const result = storage.get(defaults, (items) => {
      const err = runtime?.lastError;
      if (err) return reject(err);
      resolve(normalize(items?.[KEY]));
    });

    if (isPromise(result)) {
      result.then((items) => resolve(normalize(items?.[KEY]))).catch(reject);
    }
  });
}

async function setStateRaw(nextState) {
  const normalized = normalize({ ...nextState, updatedAt: Date.now() });
  if (!storage) return normalized;

  const payload = { [KEY]: normalized };

  if (storage.set.length <= 1) {
    await storage.set(payload);
    return normalized;
  }

  return new Promise((resolve, reject) => {
    const result = storage.set(payload, () => {
      const err = runtime?.lastError;
      if (err) return reject(err);
      resolve(normalized);
    });

    if (isPromise(result)) {
      result.then(() => resolve(normalized)).catch(reject);
    }
  });
}

function startTask(state, taskId, at, source = 'manual') {
  if (state.activeTaskId && state.activeTaskId !== taskId) {
    const current = findTask(state, state.activeTaskId);
    if (current) {
      const open = openSession(current);
      if (open) open.end = Math.max(open.start, at);
      current.updatedAt = at;
    }
  }

  const task = findTask(state, taskId);
  if (!task) return;

  if (!openSession(task)) {
    task.sessions.push({
      id: uid('session'),
      start: at,
      end: null,
      source: source === 'pomodoro' ? 'pomodoro' : 'manual'
    });
  }

  task.isStopped = false;
  task.completedAt = null;
  task.updatedAt = at;
  moveTaskToTop(state, task.id);
  state.activeTaskId = task.id;
  state.lastActivityAt = at;
}

function pauseTask(state, taskId, at) {
  const task = findTask(state, taskId);
  if (!task) return;

  const open = openSession(task);
  if (open) open.end = Math.max(open.start, at);

  if (state.activeTaskId === taskId) state.activeTaskId = null;
  task.updatedAt = at;
  state.lastActivityAt = at;
}

function removeTask(state, taskId, at) {
  if (state.activeTaskId === taskId) pauseTask(state, taskId, at);
  state.tasks = state.tasks.filter((task) => task.id !== taskId);

  if (state.pomodoro.linkedTaskId === taskId) {
    state.pomodoro.linkedTaskId = null;
    state.pomodoro.mode = 'independent';
  }

  state.lastActivityAt = at;
}

function moveTaskToTop(state, taskId) {
  const idx = state.tasks.findIndex((task) => task.id === taskId);
  if (idx <= 0) return;
  const [task] = state.tasks.splice(idx, 1);
  state.tasks.unshift(task);
}

function stopTask(state, taskId, at) {
  pauseTask(state, taskId, at);
  const task = findTask(state, taskId);
  if (!task) return;
  task.isStopped = true;
  task.completedAt = at;
  task.updatedAt = at;
}

function resumeStoppedTask(state, taskId, at) {
  const task = findTask(state, taskId);
  if (!task) return;
  task.isStopped = false;
  task.completedAt = null;
  task.updatedAt = at;
  moveTaskToTop(state, taskId);
}

function sessionMs(session, now) {
  const end = session.end == null ? now : session.end;
  return Math.max(0, end - session.start);
}

function taskMs(task, now) {
  return task.sessions.reduce((sum, s) => sum + sessionMs(s, now), 0);
}

function hms(ms) {
  const sec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function compact(ms) {
  const mins = Math.floor(Math.max(0, ms) / 60000);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function formatSystemDateTime(ts) {
  if (!Number.isFinite(ts) || ts <= 0) return '—';
  return new Date(ts).toLocaleString();
}

function formatSystemDate(ts) {
  if (!Number.isFinite(ts) || ts <= 0) return '—';
  return new Date(ts).toLocaleDateString();
}

function dayKey(ts) {
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function nextDay(ts) {
  const d = new Date(ts);
  d.setHours(24, 0, 0, 0);
  return d.getTime();
}

function dayBounds(dayKeyValue) {
  const start = new Date(`${dayKeyValue}T00:00:00`).getTime();
  return { start, end: start + DAY };
}

function splitByDay(start, end) {
  const out = [];
  let cursor = start;

  while (cursor < end) {
    const sliceEnd = Math.min(nextDay(cursor), end);
    if (sliceEnd > cursor) {
      out.push({ key: dayKey(cursor), ms: sliceEnd - cursor });
    }
    cursor = sliceEnd;
  }

  return out;
}

function aggregate(state, now) {
  const days = new Map();
  const taskById = new Map(state.tasks.map((t) => [t.id, t]));

  state.tasks.forEach((task) => {
    task.sessions.forEach((session) => {
      const end = session.end == null ? now : session.end;
      if (end <= session.start) return;

      splitByDay(session.start, end).forEach((chunk) => {
        if (!days.has(chunk.key)) {
          days.set(chunk.key, { total: 0, byTask: new Map(), byTag: new Map() });
        }

        const day = days.get(chunk.key);
        day.total += chunk.ms;
        day.byTask.set(task.id, (day.byTask.get(task.id) || 0) + chunk.ms);
        task.tags.forEach((tag) => day.byTag.set(tag, (day.byTag.get(tag) || 0) + chunk.ms));
      });
    });
  });

  return { days, taskById };
}

function totals(days, now) {
  const today = dayKey(now);

  const weekStart = new Date(now);
  const wd = (weekStart.getDay() + 6) % 7;
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(weekStart.getDate() - wd);
  const weekStartTs = weekStart.getTime();

  const monthStart = new Date(now);
  monthStart.setHours(0, 0, 0, 0);
  monthStart.setDate(1);
  const monthStartTs = monthStart.getTime();

  let totalToday = 0;
  let totalWeek = 0;
  let totalMonth = 0;

  days.forEach((value, key) => {
    const ts = new Date(`${key}T00:00:00`).getTime();
    if (key === today) totalToday += value.total;
    if (ts >= weekStartTs) totalWeek += value.total;
    if (ts >= monthStartTs) totalMonth += value.total;
  });

  return { today: totalToday, week: totalWeek, month: totalMonth };
}

function rowsForDay(dayData, taskById) {
  if (!dayData) return [];
  const rows = [];

  dayData.byTask.forEach((ms, taskId) => {
    const task = taskById.get(taskId);
    if (!task) return;
    rows.push({ taskId, title: task.title, ms });
  });

  rows.sort((a, b) => b.ms - a.ms);
  return rows;
}

function topTagRows(dayData) {
  if (!dayData) return [];
  const rows = [];
  dayData.byTag.forEach((ms, tag) => rows.push({ tag, ms }));
  rows.sort((a, b) => b.ms - a.ms);
  return rows.slice(0, 6);
}

function chartPoints(days, now) {
  const base = new Date(now);
  base.setHours(0, 0, 0, 0);
  const baseTs = base.getTime();

  const points = [];
  for (let i = 6; i >= 0; i -= 1) {
    const ts = baseTs - i * DAY;
    const key = dayKey(ts);
    points.push({
      key,
      label: new Date(ts).toLocaleDateString(undefined, { weekday: 'short' }),
      ms: days.get(key)?.total || 0
    });
  }

  return points;
}

function csvEscape(v) {
  const text = String(v ?? '');
  return /[,"\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function toCsv(state, now) {
  const lines = ['Task,Project,Project URL,Tags,Description,Task URL,Start,End,Duration (minutes),Source'];

  state.tasks.forEach((task) => {
    task.sessions.forEach((session) => {
      const end = session.end == null ? now : session.end;
      if (end <= session.start) return;

      lines.push([
        csvEscape(task.title),
        csvEscape(task.project || ''),
        csvEscape(task.projectUrl || ''),
        csvEscape(task.tags.map((tag) => `#${tag}`).join(' ')),
        csvEscape(task.description || ''),
        csvEscape(task.taskUrl || ''),
        csvEscape(new Date(session.start).toISOString()),
        csvEscape(new Date(end).toISOString()),
        csvEscape(((end - session.start) / 60000).toFixed(2)),
        csvEscape(session.source || 'manual')
      ].join(','));
    });
  });

  return lines.join('\n');
}

function toMarkdown(state, now) {
  const { days, taskById } = aggregate(state, now);
  const sum = totals(days, now);
  const today = rowsForDay(days.get(dayKey(now)), taskById);
  const yesterday = rowsForDay(days.get(dayKey(now - DAY)), taskById);

  const lines = [
    '# Frontend Dev Toolbox - Time Tracker Export',
    '',
    `Generated: ${new Date(now).toLocaleString()}`,
    '',
    '## Summary',
    `- Today: ${compact(sum.today)}`,
    `- This week: ${compact(sum.week)}`,
    `- This month: ${compact(sum.month)}`,
    '',
    '## Tasks'
  ];

  state.tasks.forEach((task) => {
    const project = task.project ? ` [${task.project}]` : '';
    lines.push(`- ${task.title}${project} (${compact(taskMs(task, now))})`);
    if (task.description) lines.push(`  - ${task.description}`);
    if (task.taskUrl) lines.push(`  - ${task.taskUrl}`);
  });

  lines.push('', '## Today');
  if (!today.length) lines.push('- No sessions');
  today.forEach((row) => lines.push(`- ${row.title}: ${compact(row.ms)}`));

  lines.push('', '## Yesterday');
  if (!yesterday.length) lines.push('- No sessions');
  yesterday.forEach((row) => lines.push(`- ${row.title}: ${compact(row.ms)}`));

  return lines.join('\n');
}

function download(name, content, mime) {
  const blob = new Blob([content], { type: mime || 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = name;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function renderProjectField(prefix, mode, hasProjects, projects, values) {
  const options = ['<option value="">No project</option>']
    .concat(projects.map((name) => `<option value="${esc(name)}" ${values.projectSelect === name ? 'selected' : ''}>${esc(name)}</option>`))
    .join('');

  const selectVisible = hasProjects && mode === 'select';
  const inputVisible = !hasProjects || mode === 'input';

  return `
    <div class="tt-project-field" data-project-mode="${mode}">
      <label>Project (optional)</label>
      <div class="tt-project-row">
        <input ${inputVisible ? '' : 'style="display:none"'} data-${prefix}-field="projectInput" type="text" placeholder="Project name" maxlength="60" value="${esc(values.projectInput || '')}" />
        <select ${selectVisible ? '' : 'style="display:none"'} data-${prefix}-field="projectSelect">${options}</select>
        ${hasProjects ? `<button data-action="${prefix}-toggle-project" class="secondary-btn tt-project-toggle" type="button">${mode === 'select' ? 'New project' : 'Use existing'}</button>` : ''}
      </div>
    </div>
  `;
}

function taskTimeline(task, now) {
  if (!task.sessions.length) return null;
  let firstStart = null;
  let lastEnd = null;
  let activeSince = null;

  task.sessions.forEach((session) => {
    if (firstStart == null || session.start < firstStart) firstStart = session.start;
    if (session.end == null) {
      if (activeSince == null || session.start > activeSince) activeSince = session.start;
    } else if (lastEnd == null || session.end > lastEnd) {
      lastEnd = session.end;
    }
  });

  return {
    firstStart,
    lastEnd,
    activeSince,
    total: taskMs(task, now)
  };
}

function pauseMarksForDay(task, dayKeyValue) {
  const { start, end } = dayBounds(dayKeyValue);
  const marks = [];

  task.sessions.forEach((session) => {
    if (!Number.isFinite(session.end)) return;
    if (session.end <= start || session.end >= end) return;
    marks.push(session.end);
  });

  marks.sort((a, b) => a - b);
  return marks;
}

function historyBriefText(task, dayKeyValue, dayMs) {
  const dateTs = new Date(`${dayKeyValue}T00:00:00`).getTime();
  const lines = [
    `Task: ${task.title}`,
    task.project ? `Project: ${task.project}` : null,
    `Date: ${formatSystemDate(dateTs)}`,
    `Total: ${compact(dayMs)}`,
    task.description ? `Description: ${task.description}` : null,
    task.projectUrl ? `Project link: ${task.projectUrl}` : null,
    task.taskUrl ? `Task link: ${task.taskUrl}` : null
  ].filter(Boolean);

  return lines.join('\n');
}

function renderHistoryGroup(title, rows, dayKeyValue, taskById, now, openHistoryKeys) {
  if (!rows.length) {
    return `
      <div class="tt-history-group">
        <div class="tt-history-title">${esc(title)}</div>
        <div class="tt-empty-inline">No sessions</div>
      </div>
    `;
  }

  return `
    <div class="tt-history-group">
      <div class="tt-history-title">${esc(title)}</div>
      <div class="tt-history-list">
        ${rows.map((row) => {
          const task = taskById.get(row.taskId);
          if (!task) return '';

          const timeline = taskTimeline(task, now);
          const pauseMarks = pauseMarksForDay(task, dayKeyValue);
          const tags = task.tags.length ? task.tags.map((tag) => `#${tag}`).join(' ') : '—';
          const endLabel = timeline?.activeSince
            ? 'Active'
            : (task.completedAt || timeline?.lastEnd || null);
          const statusLabel = timeline?.activeSince
            ? 'Active'
            : (task.isStopped ? 'Stopped' : 'Paused');

          const historyId = `${dayKeyValue}:${task.id}`;
          const opened = openHistoryKeys.has(historyId) ? 'open' : '';
          const canResumeToday = dayKeyValue === dayKey(now) && task.isStopped;

          return `
            <details class="tt-history-entry" data-history-key="${esc(historyId)}" ${opened}>
              <summary>
                <span class="tt-history-summary-title">${esc(task.title)}</span>
                <strong class="tt-history-summary-time">${esc(compact(row.ms))}</strong>
              </summary>
              <div class="tt-history-entry-body">
                <div class="tt-history-meta">
                  <div class="tt-history-meta-row"><span>Project:</span><strong>${esc(task.project || '—')}</strong></div>
                  <div class="tt-history-meta-row"><span>Tags:</span><strong>${esc(tags)}</strong></div>
                  <div class="tt-history-meta-row"><span>Task start:</span><strong>${esc(timeline ? formatSystemDateTime(timeline.firstStart) : '—')}</strong></div>
                  <div class="tt-history-meta-row"><span>Task end:</span><strong>${esc(endLabel === 'Active' ? 'Active' : (endLabel ? formatSystemDateTime(endLabel) : '—'))}</strong></div>
                </div>

                <details class="tt-history-details">
                  <summary>Task details</summary>
                  <div class="tt-history-details-body">
                    <div class="tt-history-details-grid">
                      <div><span>Status:</span><strong>${esc(statusLabel)}</strong></div>
                      <div><span>Total task time:</span><strong>${esc(timeline ? compact(timeline.total) : '0m')}</strong></div>
                      <div><span>Created:</span><strong>${esc(formatSystemDateTime(task.createdAt))}</strong></div>
                      <div><span>Updated:</span><strong>${esc(formatSystemDateTime(task.updatedAt))}</strong></div>
                    </div>

                    ${task.description ? `<div class="tt-history-desc">${esc(task.description)}</div>` : '<div class="tt-history-desc tt-history-desc-empty">No description</div>'}

                    ${(task.projectUrl || task.taskUrl) ? `
                      <div class="tt-history-link-row">
                        ${task.projectUrl ? `<a class="tt-link-btn" href="${esc(task.projectUrl)}" target="_blank" rel="noopener noreferrer">Open project</a><button type="button" class="tt-btn" data-action="copy-project-link" data-task-id="${esc(task.id)}">Copy project link</button>` : ''}
                        ${task.taskUrl ? `<a class="tt-link-btn" href="${esc(task.taskUrl)}" target="_blank" rel="noopener noreferrer">Open task</a><button type="button" class="tt-btn" data-action="copy-task-link" data-task-id="${esc(task.id)}">Copy task link</button>` : ''}
                      </div>
                    ` : '<div class="tt-history-desc tt-history-desc-empty">No links</div>'}
                  </div>
                </details>

                <div class="tt-history-actions">
                  ${canResumeToday ? `<button type="button" class="tt-btn tt-resume-btn" data-action="resume-task" data-task-id="${esc(task.id)}">Resume task</button>` : ''}
                  <button type="button" class="tt-btn tt-history-copy-btn" data-action="copy-history-brief" data-task-id="${esc(task.id)}" data-day-key="${esc(dayKeyValue)}" data-day-ms="${esc(String(Math.round(row.ms)))}">Copy brief</button>
                  <button type="button" class="tt-btn danger" data-action="delete-task-history" data-task-id="${esc(task.id)}">Delete task</button>
                </div>

                ${pauseMarks.length ? `
                  <details class="tt-history-pauses">
                    <summary>Pause marks</summary>
                    <div class="tt-history-pauses-list">
                      ${pauseMarks.map((mark) => `<div>${esc(formatSystemDateTime(mark))}</div>`).join('')}
                    </div>
                  </details>
                ` : ''}

                <div class="tt-history-day-total">
                  <span>Day total:</span>
                  <strong>${esc(compact(row.ms))}</strong>
                </div>
              </div>
            </details>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

export function render() {
  return `
    <div class="tool-grid tt-tool">
      <section class="tt-card">
        <div class="tt-card-head">
          <div class="tt-card-title">Task list</div>
          <div class="tt-card-sub">Only one active task can run at the same time.</div>
        </div>

        <div id="tt-create-form" class="tt-create-form"></div>

        <div id="tt-task-list" class="tt-task-list"></div>
      </section>

      <section class="tt-card">
        <div class="tt-card-head">
          <div class="tt-card-title">Stats</div>
          <div class="tt-card-sub">Today, this week, this month, and 7-day activity.</div>
        </div>

        <div class="tt-stats-grid">
          <div class="tt-stat"><div class="tt-stat-label">Today</div><div class="tt-stat-value" id="tt-stat-today">0m</div></div>
          <div class="tt-stat"><div class="tt-stat-label">This week</div><div class="tt-stat-value" id="tt-stat-week">0m</div></div>
          <div class="tt-stat"><div class="tt-stat-label">This month</div><div class="tt-stat-value" id="tt-stat-month">0m</div></div>
        </div>

        <div class="tt-chart" id="tt-activity-chart"></div>
        <div class="tt-tags-summary" id="tt-tags-summary"></div>
      </section>

      <section class="tt-card">
        <div class="tt-card-head">
          <div class="tt-card-title">History</div>
          <div class="tt-card-sub">Grouped by day with full task details.</div>
        </div>

        <div class="tt-history" id="tt-history"></div>
      </section>

      <section class="tt-card">
        <div class="tt-card-head">
          <div class="tt-card-title">Export</div>
          <div class="tt-card-sub">JSON, CSV, Markdown.</div>
        </div>

        <div class="tt-actions-row">
          <button id="tt-export-json" class="secondary-btn">Export JSON</button>
          <button id="tt-export-csv" class="secondary-btn">Export CSV</button>
          <button id="tt-export-md" class="secondary-btn">Export Markdown</button>
        </div>
      </section>
    </div>
  `;
}

export async function init(container) {
  const refs = {
    createForm: container.querySelector('#tt-create-form'),
    list: container.querySelector('#tt-task-list'),
    statToday: container.querySelector('#tt-stat-today'),
    statWeek: container.querySelector('#tt-stat-week'),
    statMonth: container.querySelector('#tt-stat-month'),
    chart: container.querySelector('#tt-activity-chart'),
    tagsSummary: container.querySelector('#tt-tags-summary'),
    history: container.querySelector('#tt-history'),
    exportJson: container.querySelector('#tt-export-json'),
    exportCsv: container.querySelector('#tt-export-csv'),
    exportMd: container.querySelector('#tt-export-md')
  };

  let state = await getState();
  let createProjectMode = state.projects.length ? 'select' : 'input';
  let editingTaskId = null;
  let editProjectMode = state.projects.length ? 'select' : 'input';
  let editDraft = null;
  let tickCount = 0;
  const openHistoryKeys = new Set();

  async function mutate(fn) {
    const draft = normalize(await getState());
    const now = Date.now();
    fn(draft, now);
    draft.lastActivityAt = now;
    state = await setStateRaw(draft);
    if (!state.projects.length) {
      createProjectMode = 'input';
      editProjectMode = 'input';
    }
    return state;
  }

  function clearEdit() {
    editingTaskId = null;
    editDraft = null;
  }

  function renderCreateForm() {
    const createValues = {
      projectInput: '',
      projectSelect: ''
    };

    refs.createForm.innerHTML = `
      <div class="tt-add-stack">
        <input id="tt-new-title" type="text" placeholder="Task title" maxlength="80" />
        <input id="tt-new-tags" type="text" placeholder="#frontend, #bugfix" maxlength="120" />
        ${renderProjectField('create', createProjectMode, state.projects.length > 0, state.projects, createValues)}

        <details class="tt-advanced-fields-box">
          <summary>More options (optional)</summary>
          <div class="tt-advanced-fields">
            <textarea id="tt-new-description" placeholder="Task description" rows="3" maxlength="800"></textarea>
            <input id="tt-new-project-url" type="text" placeholder="https://project-link" maxlength="300" />
            <input id="tt-new-url" type="text" placeholder="https://task-link" maxlength="300" />
          </div>
        </details>

        <button id="tt-add-task" class="primary-btn">Add task</button>
      </div>
    `;

    refs.createForm.querySelector('[data-action="create-toggle-project"]')?.addEventListener('click', () => {
      createProjectMode = createProjectMode === 'select' ? 'input' : 'select';
      renderCreateForm();
    });

    refs.createForm.querySelector('#tt-new-title')?.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        refs.createForm.querySelector('#tt-add-task')?.click();
      }
    });

    refs.createForm.querySelector('#tt-add-task')?.addEventListener('click', async () => {
      const title = refs.createForm.querySelector('#tt-new-title')?.value || '';
      const tags = refs.createForm.querySelector('#tt-new-tags')?.value || '';
      const projectInput = refs.createForm.querySelector('[data-create-field="projectInput"]')?.value || '';
      const projectSelect = refs.createForm.querySelector('[data-create-field="projectSelect"]')?.value || '';
      const description = refs.createForm.querySelector('#tt-new-description')?.value || '';
      const projectUrlInput = refs.createForm.querySelector('#tt-new-project-url')?.value || '';
      const urlInput = refs.createForm.querySelector('#tt-new-url')?.value || '';

      const before = state.tasks.length;
      let linkValid = true;

      await mutate((draft, now) => {
        const normalizedTitle = String(title || '').trim();
        if (!normalizedTitle) return;

        const projectRaw = createProjectMode === 'select' ? projectSelect : projectInput;
        const project = addProject(draft, projectRaw);

        const projectUrl = normalizeTaskUrl(projectUrlInput);
        const taskUrl = normalizeTaskUrl(urlInput);
        if ((projectUrlInput.trim() && !projectUrl) || (urlInput.trim() && !taskUrl)) {
          linkValid = false;
          return;
        }

        draft.tasks.unshift({
          id: uid('task'),
          title: normalizedTitle,
          project,
          description: normalizeDescription(description),
          projectUrl,
          taskUrl,
          tags: normalizeTags(tags),
          sessions: [],
          isStopped: false,
          completedAt: null,
          createdAt: now,
          updatedAt: now
        });
      });

      if (!linkValid) {
        window.showToast?.('Invalid project/task URL');
        return;
      }

      if (state.tasks.length === before) {
        window.showToast?.('Enter a task title');
        return;
      }

      if (createProjectMode === 'input' && state.projects.length) {
        createProjectMode = 'select';
      }

      renderAll();
      window.showToast?.('Task created');
    });
  }

  function renderEditCard(task, now) {
    const editValues = {
      projectInput: editDraft?.projectInput || '',
      projectSelect: editDraft?.projectSelect || ''
    };

    return `
      <div class="tt-task is-editing" data-task-id="${esc(task.id)}">
        <div class="tt-task-edit-fields">
          <input data-edit-field="title" type="text" maxlength="80" value="${esc(editDraft?.title || '')}" placeholder="Task title" />
          <input data-edit-field="tags" type="text" maxlength="120" value="${esc(editDraft?.tags || '')}" placeholder="#frontend, #bugfix" />
          ${renderProjectField('edit', editProjectMode, state.projects.length > 0, state.projects, editValues)}
          <textarea data-edit-field="description" rows="3" maxlength="800" placeholder="Task description">${esc(editDraft?.description || '')}</textarea>
          <input data-edit-field="projectUrl" type="text" maxlength="300" value="${esc(editDraft?.projectUrl || '')}" placeholder="https://project-link" />
          <input data-edit-field="url" type="text" maxlength="300" value="${esc(editDraft?.url || '')}" placeholder="https://task-link" />
        </div>

        <div class="tt-task-actions">
          <button type="button" class="tt-btn" data-action="save-edit">Save</button>
          <button type="button" class="tt-btn" data-action="cancel-edit">Cancel</button>
        </div>

        <div class="tt-task-time">Current total: ${esc(hms(taskMs(task, now)))}</div>
      </div>
    `;
  }

  function renderTaskCard(task, now) {
    const active = state.activeTaskId === task.id;
    const tagsHtml = task.tags.length
      ? `<div class="tt-task-tags">${task.tags.map((tag) => `<span class="tt-tag">#${esc(tag)}</span>`).join('')}</div>`
      : '';

    const projectHtml = task.project
      ? `<span class="tt-project-chip">${esc(task.project)}</span>`
      : '';

    const descHtml = task.description
      ? `<div class="tt-task-desc">${esc(task.description)}</div>`
      : '';

    const linkHtml = (task.projectUrl || task.taskUrl)
      ? `
        <div class="tt-task-link-row">
          ${task.projectUrl ? `<a href="${esc(task.projectUrl)}" target="_blank" rel="noopener noreferrer" class="tt-link-btn">Open project</a><button type="button" class="tt-btn" data-action="copy-project-link" data-task-id="${esc(task.id)}">Copy project link</button>` : ''}
          ${task.taskUrl ? `<a href="${esc(task.taskUrl)}" target="_blank" rel="noopener noreferrer" class="tt-link-btn">Open task</a><button type="button" class="tt-btn" data-action="copy-task-link" data-task-id="${esc(task.id)}">Copy task link</button>` : ''}
        </div>
      `
      : '';

    const timeline = taskTimeline(task, now);
    const timelineStart = timeline?.firstStart ? formatSystemDateTime(timeline.firstStart) : 'No sessions yet';
    const timelineEnd = timeline?.activeSince
      ? `Active since: ${formatSystemDateTime(timeline.activeSince)}`
      : (timeline?.lastEnd ? `End: ${formatSystemDateTime(timeline.lastEnd)}` : 'End: —');

    return `
      <div class="tt-task ${active ? 'is-active' : ''}" data-task-id="${esc(task.id)}">
        <div class="tt-task-datetime">Start: ${esc(timelineStart)}</div>
        <div class="tt-task-datetime tt-task-datetime-muted">${esc(timelineEnd)}</div>

        <div class="tt-task-row">
          <div class="tt-task-title-wrap">
            <div class="tt-task-title">${esc(task.title)}</div>
            <div class="tt-task-time" data-task-time="${esc(task.id)}">${hms(taskMs(task, now))}</div>
          </div>
          <div class="tt-task-actions">
            <button type="button" class="tt-btn" data-action="start">${active ? 'Running' : 'Start'}</button>
            <button type="button" class="tt-btn" data-action="pause">Pause</button>
            <button type="button" class="tt-btn" data-action="stop">Stop</button>
            <button type="button" class="tt-btn" data-action="edit">Edit</button>
            <button type="button" class="tt-btn danger" data-action="delete">Delete</button>
          </div>
        </div>

        <div class="tt-task-meta">${projectHtml}${tagsHtml}</div>
        ${descHtml}
        ${linkHtml}
      </div>
    `;
  }

  function renderTaskList() {
    const visibleTasks = state.tasks.filter((task) => !task.isStopped || state.activeTaskId === task.id);

    if (!visibleTasks.length) {
      refs.list.innerHTML = '<div class="tt-empty">No active tasks. Resume from history or add a new one.</div>';
      return;
    }

    const now = Date.now();

    refs.list.innerHTML = visibleTasks.map((task) => {
      if (editingTaskId === task.id && editDraft) {
        return renderEditCard(task, now);
      }
      return renderTaskCard(task, now);
    }).join('');
  }

  function syncOpenHistoryKeysFromDom() {
    if (!refs.history) return;

    refs.history.querySelectorAll('.tt-history-entry[data-history-key]').forEach((details) => {
      if (!(details instanceof HTMLDetailsElement)) return;
      const key = details.getAttribute('data-history-key');
      if (!key) return;
      if (details.open) openHistoryKeys.add(key);
      else openHistoryKeys.delete(key);
    });
  }

  function renderStatsHistory(options = {}) {
    const skipHistory = Boolean(options.skipHistory);
    if (!skipHistory) syncOpenHistoryKeysFromDom();
    const now = Date.now();
    const { days, taskById } = aggregate(state, now);
    const sum = totals(days, now);

    refs.statToday.textContent = compact(sum.today);
    refs.statWeek.textContent = compact(sum.week);
    refs.statMonth.textContent = compact(sum.month);

    const points = chartPoints(days, now);
    const max = Math.max(...points.map((p) => p.ms), 1);

    refs.chart.innerHTML = points
      .map((point) => {
        const height = Math.max(4, Math.round((point.ms / max) * 48));
        return `<div class="tt-bar-col" title="${esc(point.key)} - ${esc(compact(point.ms))}"><div class="tt-bar" style="height:${height}px"></div><div class="tt-bar-label">${esc(point.label)}</div></div>`;
      })
      .join('');

    const todayKey = dayKey(now);

    if (!skipHistory) {
      const yesterdayKey = dayKey(now - DAY);
      const todayRows = rowsForDay(days.get(todayKey), taskById);
      const yesterdayRows = rowsForDay(days.get(yesterdayKey), taskById);
      refs.history.innerHTML = `${renderHistoryGroup('Today', todayRows, todayKey, taskById, now, openHistoryKeys)}${renderHistoryGroup('Yesterday', yesterdayRows, yesterdayKey, taskById, now, openHistoryKeys)}`;
    }

    const tagsRows = topTagRows(days.get(todayKey));
    refs.tagsSummary.innerHTML = tagsRows.length
      ? tagsRows.map((row) => `<div class="tt-tag-row"><span>#${esc(row.tag)}</span><strong>${esc(compact(row.ms))}</strong></div>`).join('')
      : '<div class="tt-empty-inline">No tag activity today</div>';
  }

  function updateTaskTimers() {
    const now = Date.now();
    container.querySelectorAll('[data-task-time]').forEach((el) => {
      const task = findTask(state, el.getAttribute('data-task-time'));
      if (task) el.textContent = hms(taskMs(task, now));
    });
  }

  function renderAll() {
    renderCreateForm();
    renderTaskList();
    renderStatsHistory();
  }

  refs.history.addEventListener('toggle', (event) => {
    const details = event.target;
    if (!(details instanceof HTMLDetailsElement)) return;
    if (!details.classList.contains('tt-history-entry')) return;
    const key = details.getAttribute('data-history-key');
    if (!key) return;
    if (details.open) openHistoryKeys.add(key);
    else openHistoryKeys.delete(key);
  }, true);

  refs.history.addEventListener('click', async (event) => {
    const button = event.target.closest('button[data-action]');
    if (!button) return;

    const action = button.getAttribute('data-action');
    const taskId = button.dataset.taskId;
    if (!taskId) return;

    if (action === 'copy-project-link') {
      const task = findTask(state, taskId);
      if (task?.projectUrl) window.copyToClipboard?.(task.projectUrl, 'Project link copied');
      return;
    }

    if (action === 'copy-task-link') {
      const task = findTask(state, taskId);
      if (task?.taskUrl) window.copyToClipboard?.(task.taskUrl, 'Task link copied');
      return;
    }

    if (action === 'copy-history-brief') {
      const task = findTask(state, taskId);
      const dayKeyValue = button.dataset.dayKey || '';
      const dayMs = Number(button.dataset.dayMs || 0);
      if (!task || !dayKeyValue) return;
      window.copyToClipboard?.(historyBriefText(task, dayKeyValue, dayMs), 'Brief copied');
      return;
    }

    if (action === 'delete-task-history') {
      const task = findTask(state, taskId);
      if (!task) return;
      if (!window.confirm(`Delete task "${task.title}"?`)) return;

      clearEdit();
      await mutate((draft, now) => removeTask(draft, taskId, now));
      renderAll();
      window.showToast?.('Task deleted');
      return;
    }

    if (action === 'resume-task') {
      await mutate((draft, now) => {
        resumeStoppedTask(draft, taskId, now);
      });
      renderAll();
      window.showToast?.('Task resumed');
    }
  });

  refs.list.addEventListener('input', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    if (!editingTaskId || !editDraft) return;

    const field = target.getAttribute('data-edit-field');
    if (!field) return;

    if (field === 'title' || field === 'tags' || field === 'description' || field === 'projectUrl' || field === 'url' || field === 'projectInput' || field === 'projectSelect') {
      editDraft[field] = target.value;
    }
  });

  refs.list.addEventListener('click', async (event) => {
    const button = event.target.closest('button[data-action]');
    if (!button) return;

    const action = button.getAttribute('data-action');
    const taskWrap = button.closest('[data-task-id]');
    const taskId = button.dataset.taskId || taskWrap?.getAttribute('data-task-id');

    if (action === 'edit-toggle-project') {
      editProjectMode = editProjectMode === 'select' ? 'input' : 'select';
      renderTaskList();
      return;
    }

    if (!taskId) return;

    if (action === 'copy-project-link') {
      const task = findTask(state, taskId);
      if (task?.projectUrl) window.copyToClipboard?.(task.projectUrl, 'Project link copied');
      return;
    }

    if (action === 'copy-task-link') {
      const task = findTask(state, taskId);
      if (task?.taskUrl) window.copyToClipboard?.(task.taskUrl, 'Task link copied');
      return;
    }

    if (action === 'resume-task') {
      await mutate((draft, now) => {
        resumeStoppedTask(draft, taskId, now);
      });
      renderAll();
      window.showToast?.('Task resumed');
      return;
    }

    if (action === 'start') {
      clearEdit();
      await mutate((draft, now) => startTask(draft, taskId, now, 'manual'));
      renderAll();
      return;
    }

    if (action === 'pause') {
      clearEdit();
      await mutate((draft, now) => pauseTask(draft, taskId, now));
      renderAll();
      return;
    }

    if (action === 'stop') {
      clearEdit();
      await mutate((draft, now) => stopTask(draft, taskId, now));
      renderAll();
      window.showToast?.('Task moved to history');
      return;
    }

    if (action === 'edit') {
      const task = findTask(state, taskId);
      if (!task) return;

      editingTaskId = taskId;
      editProjectMode = state.projects.length ? 'select' : 'input';
      editDraft = {
        title: task.title,
        tags: task.tags.join(', '),
        projectInput: task.project || '',
        projectSelect: task.project || '',
        description: task.description || '',
        projectUrl: task.projectUrl || '',
        url: task.taskUrl || ''
      };

      renderTaskList();
      return;
    }

    if (action === 'cancel-edit') {
      clearEdit();
      renderTaskList();
      return;
    }

    if (action === 'save-edit') {
      const title = String(editDraft?.title || '').trim();
      if (!title) {
        window.showToast?.('Title cannot be empty');
        return;
      }

      const projectRaw = editProjectMode === 'select' ? (editDraft?.projectSelect || '') : (editDraft?.projectInput || '');
      const tagsValue = editDraft?.tags || '';
      const descValue = editDraft?.description || '';
      const projectUrlRaw = editDraft?.projectUrl || '';
      const urlRaw = editDraft?.url || '';

      const nextProjectUrl = normalizeTaskUrl(projectUrlRaw);
      const nextUrl = normalizeTaskUrl(urlRaw);
      if ((projectUrlRaw.trim() && !nextProjectUrl) || (urlRaw.trim() && !nextUrl)) {
        window.showToast?.('Invalid project/task URL');
        return;
      }

      await mutate((draft, now) => {
        const current = findTask(draft, taskId);
        if (!current) return;

        current.title = title;
        current.project = addProject(draft, projectRaw);
        current.tags = normalizeTags(tagsValue);
        current.description = normalizeDescription(descValue);
        current.projectUrl = nextProjectUrl;
        current.taskUrl = nextUrl;
        current.updatedAt = now;
      });

      clearEdit();
      renderAll();
      window.showToast?.('Task updated');
      return;
    }

    if (action === 'delete') {
      const task = findTask(state, taskId);
      if (!task) return;
      if (!window.confirm(`Delete task "${task.title}"?`)) return;

      clearEdit();
      await mutate((draft, now) => removeTask(draft, taskId, now));
      renderAll();
      window.showToast?.('Task deleted');
    }
  });

  refs.exportJson.addEventListener('click', async () => {
    const latest = await getState();
    download('fdt-time-tracker.json', JSON.stringify(latest, null, 2), 'application/json;charset=utf-8');
    window.showToast?.('JSON exported');
  });

  refs.exportCsv.addEventListener('click', async () => {
    const latest = await getState();
    download('fdt-time-tracker.csv', toCsv(latest, Date.now()), 'text/csv;charset=utf-8');
    window.showToast?.('CSV exported');
  });

  refs.exportMd.addEventListener('click', async () => {
    const latest = await getState();
    download('fdt-time-tracker.md', toMarkdown(latest, Date.now()), 'text/markdown;charset=utf-8');
    window.showToast?.('Markdown exported');
  });

  const onRuntimeMessage = (message) => {
    if (message?.type !== 'fdt-tt-state-updated') return;
    getState().then((latest) => {
      state = latest;
      if (!state.projects.length) {
        createProjectMode = 'input';
        editProjectMode = 'input';
      }
      renderAll();
    });
  };

  runtime?.onMessage?.addListener?.(onRuntimeMessage);

  const timer = setInterval(() => {
    updateTaskTimers();
    tickCount += 1;
    if (tickCount % 5 === 0) {
      renderStatsHistory({ skipHistory: true });
    }
  }, 1000);

  renderAll();

  return {
    destroy() {
      clearInterval(timer);
      runtime?.onMessage?.removeListener?.(onRuntimeMessage);
    }
  };
}
