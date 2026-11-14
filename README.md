# Zero-G Wellness

**Autonomous Health Intelligence for Long-Duration Space Missions**

Team Zero-G Wellness is developing this research and educational prototype for the 2026 NASA International Space Apps Challenge. The project explores how an astronaut might record health indicators and interpret changes when communication with Earth is delayed. It has no clinical certification.

## Try the application

- **Health Monitor** records daily check-ins and measurements in browser storage, shows historical trends and compares readings against individual baselines.
- **Mission Control** at `/mission-demo` plays a 30-day synthetic Mars transit. Start or pause playback, jump to day 20 for concurrent deviations, then compare day 22 and day 30 to see recovery.
- **NASA Research** at `/research` explores NASA OSDR studies and analyzes imported tables. Study measurements retain their source context.
- **Wellness Guidance** uses the Lovable AI Gateway for general guidance after explicit consent. The user chooses whether to include recent measurements. Emergency guidance is handled by deterministic rules.
- **Task Evaluation** at `/evaluation` collects opt-in usability observations locally.

## Development

Use Node.js 24 or a compatible recent Bun release. The repository tracks a Bun lockfile.

```sh
bun install --frozen-lockfile
bun run dev
bun run test
bun run lint
bunx tsc --noEmit
bun run build
```

Node users can use npm install and the equivalent npm scripts. The TanStack Start application uses React, TypeScript, Tailwind, Recharts and Zod. The standalone monitor runs in a same-origin iframe. A validated message bridge connects it to stateless NASA server functions. Research files are processed in the browser.

The [Lovable project](https://lovable.dev/projects/13e2473e-b004-416d-ad2c-47d5f3253a29) is linked from the original project documentation. Preserve history on the connected branch. Supabase browser settings are public configuration. Keep Lovable and Supabase server credentials in managed secrets. Public NASA CCMC endpoints require no key. An optional NASA API key can be configured server-side.

## Science, privacy and limitations

The mission simulator compares each reading against the mean of its first five synthetic days. The dashboard explains directional thresholds, percentage changes and concurrent deviations. The thresholds are illustrative. The simulator keeps its data in memory and does not access operational records or the AI gateway.

ISS Mimic cabin temperature and pressure channels are shown as raw contextual stream values using the published channel catalog; they do not enter medical assessments or health records. DONKI events and NOAA proton flux are contextual information and cannot establish personal dose. NASA OSDR biological metadata is explored separately from health records; research measurements are imported only by user action. Health records in browser storage are accessible to users of that browser profile. Bluetooth hardware, offline reloads, and flight use require separate validation.

See [data provenance](docs/DATA_SOURCES.md), [submission materials](submission/), and [AI disclosure](submission/AI_DISCLOSURE.md). Future work includes validated onboard sensors, controlled usability studies and offline deployments.

## Preview the production artifact

The build targets Cloudflare Workers. Run the generated Worker with Wrangler from the repository root after building:

```sh
npx wrangler dev --config .output/server/wrangler.json
```

The generated configuration supplies the Worker entry and static asset binding. The generic Vite preview command searches for a TanStack server entry under `dist/server`, which this Cloudflare build does not produce. The public Lovable deployment is https://zero-g-wellness.lovable.app/.
