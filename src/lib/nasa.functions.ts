import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { nasaJson } from "./nasa-fetch.server";
import { setResponseHeader } from "@tanstack/react-start/server";
import { donkiEndpoints, normalizeSpaceWeather } from "./nasa-normalization";

export const weatherRequest = z
  .object({
    endpoint: z.enum([...donkiEndpoints, "NOAA"]),
    start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    key: z
      .string()
      .regex(/^[a-zA-Z0-9_-]{1,128}$/)
      .optional(),
  })
  .refine((d) => {
    const s = Date.parse(d.start),
      e = Date.parse(d.end);
    return (
      Number.isFinite(s) &&
      Number.isFinite(e) &&
      new Date(s).toISOString().slice(0, 10) === d.start &&
      new Date(e).toISOString().slice(0, 10) === d.end &&
      s <= e &&
      e <= Date.now() &&
      e - s <= 7 * 86400000
    );
  }, "Invalid UTC date range.");
export const getSpaceWeather = createServerFn({ method: "POST" })
  .inputValidator(weatherRequest)
  .handler(async ({ data }) => {
    setResponseHeader("Cache-Control", "no-store");
    try {
      const key = data.key || process.env["NASA_API_KEY"];
      const url =
        data.endpoint === "NOAA"
          ? new URL("https://services.swpc.noaa.gov/json/goes/primary/integral-protons-1-day.json")
          : new URL(
              key
                ? `https://api.nasa.gov/DONKI/${data.endpoint}`
                : `https://ccmc.gsfc.nasa.gov/DONKI/WS/get/${data.endpoint}`,
            );
      if (data.endpoint !== "NOAA") {
        url.searchParams.set("startDate", data.start);
        url.searchParams.set("endDate", data.end);
        if (key) url.searchParams.set("api_key", key);
      }
      const records = normalizeSpaceWeather(data.endpoint, await nasaJson(url.href));
      if (data.endpoint === "NOAA" && !records.some((r) => "flux" in r && Number.isFinite(r.flux)))
        throw new Error("Source returned no valid flux values.");
      return { records, error: null };
    } catch (e) {
      return { records: null, error: e instanceof Error ? e.message : "Source unavailable." };
    }
  });
