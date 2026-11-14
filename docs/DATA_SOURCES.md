# Scientific data and provenance

| Source | Population or measurement | Use and limitations |
| --- | --- | --- |
| [NASA OSDR](https://osdr.nasa.gov/) | Organism, units, sample size, and collection period vary by study. | Research workspace searches public study metadata and imports accessible files. The prior OSD-48 verification used RNA sequencing quality-control metrics, which cannot be interpreted as astronaut vital signs. See the research implementation report for the original verification. |
| [NASA CCMC DONKI](https://ccmc.gsfc.nasa.gov/tools/DONKI/) | Solar flare events with event timestamps and flare classes. Solar energetic particle events with reported times in UTC. | Space weather context. On November 14, 2026, the public FLR and SEP endpoints both returned HTTP 200 for May 10–11, 2024. Event counts depend on the query window. These records do not measure crew exposure. |
| [NOAA SWPC GOES](https://www.swpc.noaa.gov/products/goes-proton-flux) | Timestamped satellite proton flux in pfu by energy band. | The monitor uses the maximum available ≥10 MeV value over the preceding 24 hours. The public JSON feed returned HTTP 200 on November 14, 2026. Observations and sample counts depend on availability. |
| [NASA Human Research Program](https://www.nasa.gov/hrp/) | Research context on risks to human spaceflight. | Motivates monitoring sleep, behavioral health and physiological adaptation. No HRP participant measurements are bundled. |
| Synthetic Mars transit | One fictional crew member, 30 daily records. Resting heart rate in bpm, sleep in hours, and four illustrative 0–10 ratings. | Reproducible mission scenario. Day 21 is a scripted solar particle event. Thresholds are demonstration parameters, with no inference about clinical diagnoses or causation. |

[PhysioNet MMASH](https://physionet.org/content/mmash/1.0.0/) is a candidate for future terrestrial validation. Its day-scale healthy-participant observations cannot establish a 30-day astronaut baseline. No MMASH participant data is bundled.
