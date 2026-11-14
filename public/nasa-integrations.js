// Integration-only helpers; no health-record access or medical calculations.
(function (root) {
  const TTL = 1800000, pending = new Map(), inFlight = new Map();
  const dateRange = (now = new Date()) => ({ start: new Date(now.getTime() - 3 * 86400000).toISOString().slice(0, 10), end: now.toISOString().slice(0, 10) });
  const readKey = () => { try { return root.localStorage.getItem('ahm-ui-nasa-key') || ''; } catch { return ''; } };
  function validReply(event) {
    const d = event.data;
    return event.origin === root.location.origin && event.source === root.parent && d && d.type === 'astro:nasa-result' && typeof d.id === 'string' && (d.error === null || typeof d.error === 'string') && (d.records === null || Array.isArray(d.records));
  }
  root.addEventListener('message', event => {
    if (!validReply(event)) return;
    const entry = pending.get(event.data.id); if (!entry) return;
    pending.delete(event.data.id); clearInterval(entry.interval); clearTimeout(entry.timeout);
    event.data.error ? entry.reject(new Error(event.data.error)) : entry.resolve(event.data.records);
  });
  function request(payload) {
    return new Promise((resolve, reject) => {
      const id = root.crypto.randomUUID(), message = { type: 'astro:nasa-request', id, ...payload };
      const send = () => root.parent.postMessage(message, root.location.origin);
      const interval = setInterval(send, 1000), timeout = setTimeout(() => {
        clearInterval(interval); pending.delete(id); reject(new Error('Source request timed out. Open the monitor from the app home page.'));
      }, 60000);
      pending.set(id, { resolve, reject, interval, timeout }); send();
    });
  }
  function readCache(key) {
    try {
      const entry = JSON.parse(root.localStorage.getItem(key) || 'null');
      return entry?.v === 1 && Array.isArray(entry.records) && Number.isFinite(entry.at) && entry.at <= Date.now() ? entry : null;
    } catch { return null; }
  }
  async function weather(endpoint) {
    const range = dateRange(), key = endpoint === 'NOAA' ? '' : readKey();
    const hash = key ? Array.from(new Uint8Array(await root.crypto.subtle.digest('SHA-256', new TextEncoder().encode(key)))).map(x => x.toString(16).padStart(2, '0')).join('') : 'server-default';
    const cacheKey = `ahm-ui-nasa-cache-v1:${endpoint}:${range.start}:${range.end}:${hash}`;
    if (inFlight.has(cacheKey)) return inFlight.get(cacheKey);
    const task = (async () => {
      const cached = readCache(cacheKey);
      if (cached && Date.now() - cached.at < TTL) return { ...cached, stale: false, cached: true, error: null };
      try {
        const records = await request({ kind: 'weather', endpoint, ...range, ...(key ? { key } : {}) });
        if (!Array.isArray(records)) throw new Error('Source returned invalid data.');
        const entry = { v: 1, records, at: Date.now() };
        try { root.localStorage.setItem(cacheKey, JSON.stringify(entry)); } catch { /* Optional cache. */ }
        return { ...entry, stale: false, cached: false, error: null };
      } catch (e) {
        if (cached) return { ...cached, stale: true, cached: true, error: e.message };
        throw e;
      }
    })();
    inFlight.set(cacheKey, task);
    try { return await task; } finally { inFlight.delete(cacheKey); }
  }
  function telemetry() { return { temp: null, press: null, connection: 'connecting', lastUpdate: null }; }
  function update(state, parameter, value, source, at = Date.now()) {
    if (!['temp', 'press'].includes(parameter) || !Number.isFinite(value)) return false;
    if (source === 'snapshot' && state[parameter]?.source === 'live') return false;
    state[parameter] = { value, source, at };
    if (source === 'live') { state.lastUpdate = at; state.connection = 'live'; }
    return true;
  }
  root.NasaIntegrations = { TTL, timeout: 15000, dateRange, readKey, readCache, weather, request, validReply, telemetry, update };
})(window);