const ext = globalThis.chrome || globalThis.browser;
const runtime = ext?.runtime;
const storage = ext?.storage?.local;

const KEY = 'fdtTimeTrackerState';
const MINUTE = 60000;

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

function esc(v) {
  return String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function n(v, fallback) {
  const x = Number(v);
  return Number.isFinite(x) ? x : fallback;
}

function clamp(v, min, max) {
  return Math.min(max, Math.max(min, v));
}

function normalizeProject(raw) {
  return String(raw || '').trim().slice(0, 60);
}

function normalizeUrl(raw) {
  const value = String(raw || '').trim();
  if (!value) return '';
  try {
    const url = new URL(value);
    if (url.protocol === 'http:' || url.protocol === 'https:') return url.toString();
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

function normalizeTask(raw, idx) {
  const sessions = (Array.isArray(raw?.sessions) ? raw.sessions : [])
    .map((session, sIdx) => {
      const start = n(session?.start, 0);
      let end = session?.end == null ? null : n(session?.end, null);
      if (end != null && end < start) end = start;
      return {
        id: session?.id || `session_${idx}_${sIdx}`,
        start,
        end,
        source: session?.source === 'pomodoro' ? 'pomodoro' : 'manual'
      };
    })
    .filter((session) => session.start > 0);

  let hasOpen = false;
  sessions.forEach((session) => {
    if (session.end == null) {
      if (hasOpen) session.end = session.start;
      hasOpen = true;
    }
  });

  return {
    id: raw?.id || `task_${idx}`,
    title: String(raw?.title || `Task ${idx + 1}`),
    project: normalizeProject(raw?.project),
    description: String(raw?.description || '').trim().slice(0, 800),
    taskUrl: normalizeUrl(raw?.taskUrl),
    tags: normalizeTags(raw?.tags),
    sessions,
    createdAt: n(raw?.createdAt, Date.now()),
    updatedAt: n(raw?.updatedAt, Date.now())
  };
}

function normalizePomodoro(raw, tasks) {
  const ids = new Set(tasks.map((task) => task.id));
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

function normalizeProjects(raw) {
  const unique = new Set();
  const out = [];
  (Array.isArray(raw) ? raw : []).forEach((name) => {
    const clean = normalizeProject(name);
    const key = clean.toLowerCase();
    if (!clean || unique.has(key)) return;
    unique.add(key);
    out.push(clean);
  });
  return out.slice(-20);
}

function openSession(task) {
  return task.sessions.find((session) => session.end == null) || null;
}

function findTask(state, taskId) {
  return state.tasks.find((task) => task.id === taskId) || null;
}

function normalize(raw) {
  const base = { ...DEFAULTS, ...(raw && typeof raw === 'object' ? raw : {}) };
  const tasks = (Array.isArray(base.tasks) ? base.tasks : []).map((task, idx) => normalizeTask(task, idx));
  const ids = new Set(tasks.map((task) => task.id));

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
    projects: normalizeProjects(base.projects),
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
    if (isPromise(result)) result.then((items) => resolve(normalize(items?.[KEY]))).catch(reject);
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

    if (isPromise(result)) result.then(() => resolve(normalized)).catch(reject);
  });
}

async function send(msg) {
  if (!runtime?.sendMessage) return null;

  if (runtime.sendMessage.length <= 1) {
    try { return await runtime.sendMessage(msg); } catch { return null; }
  }

  return new Promise((resolve) => {
    runtime.sendMessage(msg, (response) => {
      if (runtime.lastError) return resolve(null);
      resolve(response || null);
    });
  });
}

function startTask(state, taskId, at) {
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
      id: `session_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
      start: at,
      end: null,
      source: 'pomodoro'
    });
  }

  task.updatedAt = at;
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

function countdown(ms) {
  const sec = Math.max(0, Math.ceil(ms / 1000));
  const min = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(min).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function renderTaskOptions(tasks, selectedId) {
  const options = ['<option value="">Select task</option>']
    .concat(tasks.map((task) => {
      const label = task.project ? `${task.project} / ${task.title}` : task.title;
      return `<option value="${esc(task.id)}">${esc(label)}</option>`;
    }));

  return { options: options.join(''), selectedId: selectedId || '' };
}

export function render() {
  return `
    <div class="tool-grid pm-tool">
      <section class="pm-card">
        <div class="pm-head">
          <div class="pm-title">Pomodoro</div>
          <div class="pm-sub">Standalone timer or linked to Time Tracker tasks.</div>
        </div>

        <div class="pm-grid">
          <div class="pm-field">
            <label for="pm-mode">Mode</label>
            <select id="pm-mode">
              <option value="independent">Independent</option>
              <option value="task">Linked to task</option>
            </select>
          </div>

          <div class="pm-field">
            <label for="pm-task">Task</label>
            <select id="pm-task"></select>
          </div>

          <div class="pm-field">
            <label for="pm-work">Work (min)</label>
            <input id="pm-work" type="number" min="1" max="180" step="1" />
          </div>

          <div class="pm-field">
            <label for="pm-break">Break (min)</label>
            <input id="pm-break" type="number" min="1" max="90" step="1" />
          </div>

          <div class="pm-field">
            <label for="pm-cycles">Cycles</label>
            <input id="pm-cycles" type="number" min="1" max="24" step="1" />
          </div>
        </div>

        <div class="pm-checks">
          <label class="pm-check"><input id="pm-auto" type="checkbox" /><span>Auto-start next phase</span></label>
          <label class="pm-check"><input id="pm-notify" type="checkbox" /><span>System notifications</span></label>
        </div>

        <div class="pm-status" id="pm-status">Idle</div>

        <div class="pm-actions">
          <button id="pm-start" class="primary-btn">Start</button>
          <button id="pm-pause" class="secondary-btn">Pause</button>
          <button id="pm-reset" class="secondary-btn">Reset</button>
        </div>
      </section>

      <section class="pm-card">
        <div class="pm-head">
          <div class="pm-title">Current state</div>
        </div>

        <div class="pm-state-grid" id="pm-state-grid"></div>
      </section>
    </div>
  `;
}

export async function init(container) {
  const refs = {
    mode: container.querySelector('#pm-mode'),
    task: container.querySelector('#pm-task'),
    work: container.querySelector('#pm-work'),
    break: container.querySelector('#pm-break'),
    cycles: container.querySelector('#pm-cycles'),
    auto: container.querySelector('#pm-auto'),
    notify: container.querySelector('#pm-notify'),
    status: container.querySelector('#pm-status'),
    start: container.querySelector('#pm-start'),
    pause: container.querySelector('#pm-pause'),
    reset: container.querySelector('#pm-reset'),
    stateGrid: container.querySelector('#pm-state-grid')
  };

  let state = await getState();
  let boundarySync = false;

  async function mutate(fn) {
    const draft = normalize(await getState());
    const now = Date.now();
    fn(draft, now);
    draft.lastActivityAt = now;
    state = await setStateRaw(draft);
    return state;
  }

  async function scheduleAlarm(when) {
    await send({ type: 'fdt-tt-schedule-pomodoro-alarm', when });
  }

  async function clearAlarm() {
    await send({ type: 'fdt-tt-clear-pomodoro-alarm' });
  }

  function renderStateGrid() {
    const p = state.pomodoro;
    const linkedTask = p.linkedTaskId ? findTask(state, p.linkedTaskId)?.title || 'Unknown task' : 'None';

    refs.stateGrid.innerHTML = `
      <div class="pm-state-item"><span>Phase</span><strong>${esc(p.phase)}</strong></div>
      <div class="pm-state-item"><span>Cycle</span><strong>${esc(`${p.currentCycle}/${p.cycles}`)}</strong></div>
      <div class="pm-state-item"><span>Mode</span><strong>${esc(p.mode)}</strong></div>
      <div class="pm-state-item"><span>Linked task</span><strong>${esc(linkedTask)}</strong></div>
    `;
  }

  function renderControls() {
    const p = state.pomodoro;

    refs.mode.value = p.mode;
    refs.work.value = String(p.workMinutes);
    refs.break.value = String(p.breakMinutes);
    refs.cycles.value = String(p.cycles);
    refs.auto.checked = Boolean(p.autoStartNext);
    refs.notify.checked = Boolean(p.notifications);

    const options = renderTaskOptions(state.tasks, p.linkedTaskId);
    refs.task.innerHTML = options.options;
    refs.task.value = options.selectedId;
    refs.task.disabled = p.mode !== 'task' || !state.tasks.length;

    if (!p.isRunning || !p.endsAt) {
      const linked = p.mode === 'task' && p.linkedTaskId ? ` - linked to ${findTask(state, p.linkedTaskId)?.title || 'task'}` : '';
      refs.status.textContent = `Idle (${p.phase} phase${linked})`;
    } else {
      const left = p.endsAt - Date.now();
      refs.status.textContent = `${p.phase === 'work' ? 'Work' : 'Break'}: ${countdown(left)} - cycle ${p.currentCycle}/${p.cycles}`;

      if (left <= 0 && !boundarySync) {
        boundarySync = true;
        send({ type: 'fdt-tt-pomodoro-tick' }).finally(async () => {
          state = await getState();
          renderAll();
          setTimeout(() => {
            boundarySync = false;
          }, 500);
        });
      }
    }

    renderStateGrid();
  }

  function renderAll() {
    renderControls();
  }

  refs.mode.addEventListener('change', async () => {
    const mode = refs.mode.value === 'task' ? 'task' : 'independent';
    await mutate((draft) => {
      draft.pomodoro.mode = mode;
      if (mode === 'independent') draft.pomodoro.linkedTaskId = null;
    });
    renderAll();
  });

  refs.task.addEventListener('change', async () => {
    const selected = refs.task.value || null;
    await mutate((draft) => {
      draft.pomodoro.linkedTaskId = selected;
      if (selected) draft.pomodoro.mode = 'task';
    });
    renderAll();
  });

  [
    ['workMinutes', refs.work, 1, 180],
    ['breakMinutes', refs.break, 1, 90],
    ['cycles', refs.cycles, 1, 24]
  ].forEach(([key, input, min, max]) => {
    input.addEventListener('change', async () => {
      const value = clamp(Math.round(n(input.value, min)), min, max);
      input.value = String(value);
      await mutate((draft) => {
        draft.pomodoro[key] = value;
        if (key === 'cycles') {
          draft.pomodoro.currentCycle = clamp(draft.pomodoro.currentCycle, 1, value);
        }
      });
      renderAll();
    });
  });

  refs.auto.addEventListener('change', async () => {
    await mutate((draft) => {
      draft.pomodoro.autoStartNext = Boolean(refs.auto.checked);
    });
  });

  refs.notify.addEventListener('change', async () => {
    await mutate((draft) => {
      draft.pomodoro.notifications = Boolean(refs.notify.checked);
    });
  });

  refs.start.addEventListener('click', async () => {
    let nextEndsAt = null;

    await mutate((draft, now) => {
      const p = draft.pomodoro;

      if (p.mode === 'task' && !p.linkedTaskId) return;
      if (p.mode === 'task' && p.linkedTaskId) {
        startTask(draft, p.linkedTaskId, now);
      }

      p.isRunning = true;
      p.currentCycle = clamp(p.currentCycle || 1, 1, p.cycles);
      const durationMinutes = p.phase === 'work' ? p.workMinutes : p.breakMinutes;
      p.startedAt = now;
      p.endsAt = now + durationMinutes * MINUTE;
      nextEndsAt = p.endsAt;
    });

    if (!nextEndsAt) {
      window.showToast?.('Choose a task for linked mode');
      return;
    }

    await scheduleAlarm(nextEndsAt);
    renderAll();
  });

  refs.pause.addEventListener('click', async () => {
    await mutate((draft, now) => {
      const p = draft.pomodoro;
      p.isRunning = false;
      p.startedAt = null;
      p.endsAt = null;

      if (p.mode === 'task' && p.linkedTaskId) {
        pauseTask(draft, p.linkedTaskId, now);
      }
    });

    await clearAlarm();
    renderAll();
  });

  refs.reset.addEventListener('click', async () => {
    await mutate((draft, now) => {
      const p = draft.pomodoro;
      const linkedTaskId = p.linkedTaskId;
      const isTaskMode = p.mode === 'task';

      p.isRunning = false;
      p.phase = 'work';
      p.currentCycle = 1;
      p.startedAt = null;
      p.endsAt = null;

      if (isTaskMode && linkedTaskId) {
        pauseTask(draft, linkedTaskId, now);
      }
    });

    await clearAlarm();
    renderAll();
  });

  const onRuntimeMessage = (message) => {
    if (message?.type !== 'fdt-tt-state-updated') return;
    getState().then((latest) => {
      state = latest;
      renderAll();
    });
  };

  runtime?.onMessage?.addListener?.(onRuntimeMessage);

  const timer = setInterval(() => {
    renderControls();
  }, 1000);

  renderAll();

  return {
    destroy() {
      clearInterval(timer);
      runtime?.onMessage?.removeListener?.(onRuntimeMessage);
    }
  };
}
