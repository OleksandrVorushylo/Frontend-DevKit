// background/background.js

const DEFAULT_SETTINGS = {
  rootFontSize: 16,
  minViewport: 640,
  maxViewport: 1440,
  useRem: false,
  minMaxFactor: 0.5,
  theme: 'dark',
  historyLimit: 15,
  historyAutoClearDays: 0
};

const extensionApi = globalThis.chrome || globalThis.browser;
const runtimeApi = extensionApi?.runtime;
const contextMenusApi = extensionApi?.contextMenus;
const scriptingApi = extensionApi?.scripting;
const tabsApi = extensionApi?.tabs;
const storageArea = extensionApi?.storage?.sync || extensionApi?.storage?.local;

function isPromise(result) {
  return !!result && typeof result.then === 'function';
}

async function getSettings() {
  if (!storageArea) return { ...DEFAULT_SETTINGS };

  const getter = storageArea.get;
  if (getter.length <= 1) {
    const result = await storageArea.get(DEFAULT_SETTINGS);
    return result || { ...DEFAULT_SETTINGS };
  }

  return new Promise((resolve, reject) => {
    const res = storageArea.get(DEFAULT_SETTINGS, (items) => {
      const err = extensionApi?.runtime?.lastError;
      if (err) return reject(err);
      resolve(items || { ...DEFAULT_SETTINGS });
    });
    if (isPromise(res)) {
      res.then((items) => resolve(items || { ...DEFAULT_SETTINGS })).catch(reject);
    }
  });
}

// ---- Context Menus ----
if (runtimeApi?.onInstalled) {
  runtimeApi.onInstalled.addListener(() => {
    contextMenusApi?.create({
      id: "frontend-toolbox",
      title: "Frontend Tools",
      contexts: ["selection"]
    });

    contextMenusApi?.create({
      id: "tool-convert-rem",
      parentId: "frontend-toolbox",
      title: "Convert to REM",
      contexts: ["selection"]
    });

    contextMenusApi?.create({
      id: "tool-generate-clamp",
      parentId: "frontend-toolbox",
      title: "Generate Clamp",
      contexts: ["selection"]
    });
  });
}

contextMenusApi?.onClicked?.addListener(async (info, tab) => {
  if (!tab) return;
  const selection = info.selectionText;
  
  const settings = await getSettings();

  // Chrome MV3: use scripting API, fallback to tabs.executeScript for Firefox MV3 legacy.
  if (scriptingApi?.executeScript) {
    scriptingApi.executeScript({
      target: { tabId: tab.id },
      func: handleContextMenuAction,
      args: [info.menuItemId, selection, settings]
    });
  } else if (tabsApi?.executeScript) {
    tabsApi.executeScript(tab.id, {
      code: `(${handleContextMenuAction.toString()})(${JSON.stringify(info.menuItemId)}, ${JSON.stringify(selection)}, ${JSON.stringify(settings)})`
    });
  }
});

// На странице выполняется этот код
function handleContextMenuAction(actionId, selectionText, settings) {
  const parseNumbers = (text) => {
    const numberRegex = /[\d\.]+/g;
    const matches = text.match(numberRegex);
    if (!matches) return [];
    return matches.map(n => parseFloat(n)).filter(n => !isNaN(n));
  };

  const copyAndToast = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      alert(`Frontend Tools Copied:\n${text}`);
    });
  };

  const nums = parseNumbers(selectionText);
  if (nums.length === 0) return alert('No numbers found in selection');

  if (actionId === 'tool-convert-rem') {
    const root = settings.rootFontSize || 16;
    const remValue = nums[0] / root;
    copyAndToast(`${Number.isInteger(remValue) ? remValue : remValue.toFixed(4)}rem`);
  } 
  else if (actionId === 'tool-generate-clamp') {
    let minRaw, maxRaw;
    if (nums.length === 1) {
      maxRaw = nums[0];
      minRaw = maxRaw * (settings.minMaxFactor || 0.5);
    } else {
      minRaw = Math.min(...nums);
      maxRaw = Math.max(...nums);
    }

    // slope logic equivalent hardcoded so context menus don't need imports
    const slope = (maxRaw - minRaw) / (settings.maxViewport - settings.minViewport);
    const yIntersection = -settings.minViewport * slope + minRaw;
    const slopeVw = slope * 100;
    
    let clampStr;
    const formatN = (num) => Number.isInteger(num) ? num : parseFloat(num.toFixed(4));
    
    if (settings.useRem) {
      const root = settings.rootFontSize;
      clampStr = `clamp(${formatN(minRaw/root)}rem, calc(${formatN(yIntersection/root)}rem + ${formatN(slopeVw)}vw), ${formatN(maxRaw/root)}rem)`;
    } else {
      clampStr = `clamp(${formatN(minRaw)}px, calc(${formatN(yIntersection)}px + ${formatN(slopeVw)}vw), ${formatN(maxRaw)}px)`;
    }
    
    copyAndToast(clampStr);
  }
}


// ---- Time Tracker / Pomodoro ----
const alarmsApi = extensionApi?.alarms;
const notificationsApi = extensionApi?.notifications;
const localStorageArea = extensionApi?.storage?.local;

const TT_STORAGE_KEY = 'fdtTimeTrackerState';
const TT_ALARM_NAME = 'fdt-tt-pomodoro-alarm';
const TT_MINUTE_MS = 60 * 1000;

function safeNumber(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeProjectName(raw) {
  return String(raw || '').trim().slice(0, 60);
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

function normalizeProjectList(raw) {
  const seen = new Set();
  const out = [];

  (Array.isArray(raw) ? raw : []).forEach((name) => {
    const clean = normalizeProjectName(name);
    const key = clean.toLowerCase();
    if (!clean || seen.has(key)) return;
    seen.add(key);
    out.push(clean);
  });

  return out.slice(-20);
}

function addProjectToList(list, rawName) {
  const clean = normalizeProjectName(rawName);
  if (!clean) return '';

  const idx = list.findIndex((name) => name.toLowerCase() === clean.toLowerCase());
  if (idx !== -1) return list[idx];

  list.push(clean);
  if (list.length > 20) list.splice(0, list.length - 20);
  return clean;
}

function normalizeTTPomodoro(raw, taskIds) {
  const cycles = Math.min(24, Math.max(1, Math.round(safeNumber(raw?.cycles, 4))));
  const currentCycle = Math.min(cycles, Math.max(1, Math.round(safeNumber(raw?.currentCycle, 1))));
  const linkedTaskId = taskIds.has(raw?.linkedTaskId) ? raw.linkedTaskId : null;
  const phase = raw?.phase === 'break' ? 'break' : 'work';
  const startedAt = raw?.startedAt == null ? null : safeNumber(raw.startedAt, null);
  const endsAt = raw?.endsAt == null ? null : safeNumber(raw.endsAt, null);
  let isRunning = Boolean(raw?.isRunning);

  if (!startedAt || !endsAt || endsAt <= startedAt) {
    isRunning = false;
  }

  return {
    mode: raw?.mode === 'task' ? 'task' : 'independent',
    linkedTaskId,
    isRunning,
    phase,
    workMinutes: Math.min(180, Math.max(1, Math.round(safeNumber(raw?.workMinutes, 25)))),
    breakMinutes: Math.min(90, Math.max(1, Math.round(safeNumber(raw?.breakMinutes, 5)))),
    cycles,
    currentCycle,
    autoStartNext: Boolean(raw?.autoStartNext),
    notifications: raw?.notifications !== false,
    startedAt,
    endsAt
  };
}

function normalizeTTTask(raw, idx) {
  const sessions = (Array.isArray(raw?.sessions) ? raw.sessions : [])
    .map((session, sessionIdx) => {
      const start = safeNumber(session?.start, 0);
      let end = session?.end == null ? null : safeNumber(session?.end, null);
      if (end != null && end < start) end = start;
      return {
        id: session?.id || `session_${idx}_${sessionIdx}`,
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
    title: String(raw?.title || `Task ${idx + 1}`).trim().slice(0, 80),
    project: normalizeProjectName(raw?.project),
    description: String(raw?.description || '').trim().slice(0, 800),
    taskUrl: normalizeTaskUrl(raw?.taskUrl),
    tags: Array.isArray(raw?.tags) ? raw.tags.map((t) => String(t || '').replace(/^#+/, '').trim().toLowerCase()).filter(Boolean).slice(0, 12) : [],
    sessions,
    createdAt: safeNumber(raw?.createdAt, Date.now()),
    updatedAt: safeNumber(raw?.updatedAt, Date.now())
  };
}

function normalizeTTState(raw) {
  const base = raw && typeof raw === 'object' ? raw : {};
  const tasks = (Array.isArray(base.tasks) ? base.tasks : []).map((task, idx) => normalizeTTTask(task, idx));
  const ids = new Set(tasks.map((task) => task.id));
  const projects = normalizeProjectList(base.projects);

  tasks.forEach((task) => {
    if (task.project) {
      task.project = addProjectToList(projects, task.project);
    }
  });

  let activeTaskId = ids.has(base.activeTaskId) ? base.activeTaskId : null;

  tasks.forEach((task) => {
    const open = task.sessions.find((session) => session.end == null);
    if (!open) return;
    if (task.id !== activeTaskId) {
      open.end = Math.max(open.start, safeNumber(base.lastActivityAt, Date.now()));
    }
  });

  if (activeTaskId) {
    const active = tasks.find((task) => task.id === activeTaskId);
    if (!active || !active.sessions.some((session) => session.end == null)) {
      activeTaskId = null;
    }
  }

  return {
    version: 1,
    projects,
    tasks,
    activeTaskId,
    pomodoro: normalizeTTPomodoro(base.pomodoro, ids),
    lastActivityAt: safeNumber(base.lastActivityAt, Date.now()),
    updatedAt: safeNumber(base.updatedAt, Date.now())
  };
}

async function ttGetState() {
  if (!localStorageArea) return normalizeTTState(null);
  const defaults = { [TT_STORAGE_KEY]: null };

  if (localStorageArea.get.length <= 1) {
    const res = await localStorageArea.get(defaults);
    return normalizeTTState(res?.[TT_STORAGE_KEY]);
  }

  return new Promise((resolve, reject) => {
    const result = localStorageArea.get(defaults, (items) => {
      const err = runtimeApi?.lastError;
      if (err) return reject(err);
      resolve(normalizeTTState(items?.[TT_STORAGE_KEY]));
    });

    if (isPromise(result)) {
      result.then((items) => resolve(normalizeTTState(items?.[TT_STORAGE_KEY]))).catch(reject);
    }
  });
}

async function ttSetState(nextState) {
  const normalized = normalizeTTState({ ...nextState, updatedAt: Date.now() });
  if (!localStorageArea) return normalized;

  const payload = { [TT_STORAGE_KEY]: normalized };
  if (localStorageArea.set.length <= 1) {
    await localStorageArea.set(payload);
    return normalized;
  }

  return new Promise((resolve, reject) => {
    const result = localStorageArea.set(payload, () => {
      const err = runtimeApi?.lastError;
      if (err) return reject(err);
      resolve(normalized);
    });

    if (isPromise(result)) {
      result.then(() => resolve(normalized)).catch(reject);
    }
  });
}

function ttFindTask(state, taskId) {
  return state.tasks.find((task) => task.id === taskId) || null;
}

function ttPauseTask(state, taskId, at) {
  const task = ttFindTask(state, taskId);
  if (!task) return;

  const open = task.sessions.find((session) => session.end == null);
  if (open) open.end = Math.max(open.start, at);

  if (state.activeTaskId === taskId) state.activeTaskId = null;
  task.updatedAt = at;
  state.lastActivityAt = at;
}

function ttStartTask(state, taskId, at) {
  if (state.activeTaskId && state.activeTaskId !== taskId) {
    ttPauseTask(state, state.activeTaskId, at);
  }

  const task = ttFindTask(state, taskId);
  if (!task) return;

  if (!task.sessions.some((session) => session.end == null)) {
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

async function ttClearAlarm() {
  if (!alarmsApi?.clear) return;

  if (alarmsApi.clear.length <= 1) {
    await alarmsApi.clear(TT_ALARM_NAME);
    return;
  }

  return new Promise((resolve) => {
    const result = alarmsApi.clear(TT_ALARM_NAME, () => resolve());
    if (isPromise(result)) result.finally(resolve);
  });
}

async function ttScheduleAlarm(when) {
  if (!alarmsApi?.create) return;
  await ttClearAlarm();

  const targetTime = Math.max(Date.now() + 1000, safeNumber(when, Date.now() + TT_MINUTE_MS));
  alarmsApi.create(TT_ALARM_NAME, { when: targetTime });
}

async function ttBroadcastStateUpdated() {
  if (!runtimeApi?.sendMessage) return;

  if (runtimeApi.sendMessage.length <= 1) {
    try { await runtimeApi.sendMessage({ type: 'fdt-tt-state-updated' }); } catch (e) { /* ignore */ }
    return;
  }

  runtimeApi.sendMessage({ type: 'fdt-tt-state-updated' }, () => {
    void runtimeApi?.lastError;
  });
}

async function ttNotify(title, message) {
  if (!notificationsApi?.create) return;

  const options = {
    type: 'basic',
    iconUrl: runtimeApi?.getURL?.('icons/icon48.png') || 'icons/icon48.png',
    title,
    message
  };

  if (notificationsApi.create.length <= 1) {
    try { await notificationsApi.create(`fdt-tt-${Date.now()}`, options); } catch (e) { /* ignore */ }
    return;
  }

  notificationsApi.create(`fdt-tt-${Date.now()}`, options, () => {
    void runtimeApi?.lastError;
  });
}

async function ttAdvancePomodoro(state, now, sendNotifications = true) {
  const p = state.pomodoro;
  if (!p.isRunning || !p.endsAt) return { changed: false, nextAlarm: null };
  if (now < p.endsAt) return { changed: false, nextAlarm: p.endsAt };

  let changed = false;

  while (p.isRunning && p.endsAt && now >= p.endsAt) {
    changed = true;

    if (p.phase === 'work') {
      if (p.mode === 'task' && p.linkedTaskId) {
        ttPauseTask(state, p.linkedTaskId, p.endsAt);
      }

      const reachedTarget = p.currentCycle >= p.cycles;
      if (reachedTarget) {
        p.isRunning = false;
        p.phase = 'work';
        p.currentCycle = 1;
        p.startedAt = null;
        p.endsAt = null;

        if (p.notifications && sendNotifications) {
          await ttNotify('Pomodoro complete', 'All cycles finished.');
        }
        break;
      }

      p.phase = 'break';
      if (p.notifications && sendNotifications) {
        await ttNotify('Work finished', 'Time for a break.');
      }

      if (!p.autoStartNext) {
        p.isRunning = false;
        p.startedAt = null;
        p.endsAt = null;
        break;
      }

      p.startedAt = p.endsAt;
      p.endsAt = p.startedAt + p.breakMinutes * TT_MINUTE_MS;
      continue;
    }

    p.phase = 'work';
    p.currentCycle = Math.min(p.cycles, p.currentCycle + 1);

    if (p.notifications && sendNotifications) {
      await ttNotify('Break finished', 'Ready for the next focus block.');
    }

    if (!p.autoStartNext) {
      p.isRunning = false;
      p.startedAt = null;
      p.endsAt = null;
      break;
    }

    p.startedAt = p.endsAt;
    p.endsAt = p.startedAt + p.workMinutes * TT_MINUTE_MS;

    if (p.mode === 'task' && p.linkedTaskId) {
      ttStartTask(state, p.linkedTaskId, p.startedAt);
    }
  }

  state.lastActivityAt = now;

  return {
    changed,
    nextAlarm: p.isRunning ? p.endsAt : null
  };
}

async function ttProcessPomodoroTick(notify = true) {
  const state = await ttGetState();
  const { changed, nextAlarm } = await ttAdvancePomodoro(state, Date.now(), notify);

  if (!changed) {
    if (nextAlarm) await ttScheduleAlarm(nextAlarm);
    return;
  }

  await ttSetState(state);

  if (nextAlarm) await ttScheduleAlarm(nextAlarm);
  else await ttClearAlarm();

  await ttBroadcastStateUpdated();
}

async function ttPauseRunningOnStartup() {
  const state = await ttGetState();
  let changed = false;
  const at = safeNumber(state.lastActivityAt, Date.now());

  if (state.activeTaskId) {
    ttPauseTask(state, state.activeTaskId, at);
    changed = true;
  } else {
    state.tasks.forEach((task) => {
      const open = task.sessions.find((session) => session.end == null);
      if (!open) return;
      open.end = Math.max(open.start, at);
      task.updatedAt = at;
      changed = true;
    });
  }

  if (state.pomodoro.isRunning) {
    state.pomodoro.isRunning = false;
    state.pomodoro.startedAt = null;
    state.pomodoro.endsAt = null;
    changed = true;
  }

  if (!changed) return;

  state.lastActivityAt = Date.now();
  await ttSetState(state);
  await ttClearAlarm();
  await ttBroadcastStateUpdated();
}

runtimeApi?.onMessage?.addListener((message, sender, sendResponse) => {
  const type = message?.type;
  if (!type || !type.startsWith('fdt-tt-')) return;

  const runner = async () => {
    if (type === 'fdt-tt-schedule-pomodoro-alarm') {
      const when = safeNumber(message?.when, Date.now() + TT_MINUTE_MS);
      await ttScheduleAlarm(when);
      return { ok: true };
    }

    if (type === 'fdt-tt-clear-pomodoro-alarm') {
      await ttClearAlarm();
      return { ok: true };
    }

    if (type === 'fdt-tt-pomodoro-tick') {
      await ttProcessPomodoroTick(true);
      return { ok: true };
    }

    return { ok: false };
  };

  runner()
    .then((result) => sendResponse(result))
    .catch((error) => sendResponse({ ok: false, error: String(error) }));

  return true;
});

alarmsApi?.onAlarm?.addListener((alarm) => {
  if (!alarm || alarm.name !== TT_ALARM_NAME) return;
  ttProcessPomodoroTick(true).catch(() => {
    // ignore
  });
});

runtimeApi?.onStartup?.addListener(() => {
  ttPauseRunningOnStartup().catch(() => {
    // ignore
  });
});
