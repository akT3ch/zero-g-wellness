// Bounded retries; never include request URLs or credentials in errors.
async function fetchNasaJson(url: string, timeout: number): Promise<unknown> {
  for (let attempt = 0; attempt < 3; attempt++) {
    let response: Response;
    try { response = await fetch(url, { signal: AbortSignal.timeout(timeout), headers: { Accept: 'application/json' }, redirect: 'error' }); }
    catch { if (attempt === 2) throw new Error('Source connection timed out.'); await new Promise(r => setTimeout(r, 500 * 2 ** attempt)); continue; }
    if (response.ok) {
      let data: unknown;
      try { data = await response.json(); } catch { throw new Error('Source returned invalid JSON.'); }
      return data;
    }
    const retry = response.headers.get('Retry-After');
    const wait = retry ? (/^\d+$/.test(retry) ? Number(retry) * 1000 : Date.parse(retry) - Date.now()) : 500 * 2 ** attempt;
    await response.body?.cancel();
    if (attempt === 2 || ![429, 500, 502, 503, 504].includes(response.status) || wait > 5000) throw new Error(response.status === 429 ? 'Source rate limit reached. Please retry later.' : `Source unavailable (HTTP ${response.status}).`);
    await new Promise(r => setTimeout(r, Math.max(500, wait || 500)));
  }
  throw new Error('Source unavailable.');
}

export async function nasaJsonPayload(url: string): Promise<unknown> {
  return fetchNasaJson(url, 30000);
}

export async function nasaJson(url: string): Promise<unknown[]> {
  const data = await fetchNasaJson(url, 12000);
  if (!Array.isArray(data)) throw new Error('Source returned an invalid response.');
  return data;
}