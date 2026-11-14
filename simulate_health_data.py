#!/usr/bin/env python3
"""
Astronaut Health Monitor - Synthetic Time-Series Dataset Generator
==================================================================
Generates realistic, longitudinal and high-frequency time-series datasets for
a Spaceflight Health Monitor hackathon prototype.

Calibrated using empirical parameters and distributions from NASA Spaceflight
Standard Measures (Hardy et al., 2025) and accompanying space-medicine research:
- Sensorimotor & Vestibular: Clément et al. (2022), Kuldavletova (2023)
- Cardiovascular & Orthostasis: Lee et al. (2025)
- Biochemistry, Albumin & VTE Risk: Zwart et al. (2022)
- Cognitive Battery & Sleep: Dev et al. (2024)
- Bone Remodeling & Recovery: Walle et al. (2024)

Covers all 11 risks defined in Risks.md across multiple mission environments
(Spacecraft, Space Station, Lunar/Martian Base, Rover/EVA, Post-Flight) and
outputs status color-coding (green/yellow/red), actionable recommendations,
and gamification / measurement-prompt records.

Zero external dependencies (Python 3 standard library only).
"""

import argparse
import csv
import datetime
import json
import math
import random
from pathlib import Path
from typing import Any, Dict, List, Tuple


# ---------------------------------------------------------------------------
# Reference Definitions & Clinical/NASA Thresholds (Risks + Considerations)
# ---------------------------------------------------------------------------

RISK_DEFINITIONS: Dict[str, Dict[str, Any]] = {
    "immune_response": {
        "name_en": "Altered Immune System Responses",
        "name_de": "Veränderte Immunantwort",
        "primary_metrics": ["t_cell_function_pct", "hs_crp_mg_L", "ebv_viral_load_copies_mL", "cortisol_ug_dL"],
        "description_en": "Microgravity, radiation, and stress dysregulate innate and adaptive immunity, increasing inflammation and latent herpesvirus (EBV) reactivation.",
        "description_de": "Mikrogravitation, Strahlung und Stress verändern die Immunabwehr, erhöhen Entzündungsmarker (hsCRP) und können latente Viren (EBV) reaktivieren.",
        "countermeasure_en": "Prioritize 7+ hours of sleep, manage workload stress, and report rashes or allergy symptoms early.",
        "countermeasure_de": "Mindestens 7 Stunden Schlaf priorisieren, Stressbelastung reduzieren und Hautausschläge oder Allergien frühzeitig loggen.",
    },
    "sensorimotor_vestibular": {
        "name_en": "Altered Sensorimotor and Vestibular Function",
        "name_de": "Sensorimotorische & Vestibuläre Störungen",
        "primary_metrics": ["sit_to_stand_s", "recovery_from_fall_s", "tandem_walk_ec_pct", "motion_sickness_score"],
        "description_en": "Gravity transitions (0G <-> 0.16G/1G) impair balance, spatial orientation, and locomotion, increasing fall risk during egress or surface ops.",
        "description_de": "Gravitationswechsel (0G <-> 0.16G/1G) beeinträchtigen Gleichgewicht, räumliche Orientierung und Koordination.",
        "countermeasure_en": "Perform controlled head movements during transitions, execute balance drills, and delay critical EVA/egress until stabilized.",
        "countermeasure_de": "Langsame Kopfbewegungen bei Gravitationswechseln, Gleichgewichtsübungen durchführen und kritische EVAs ggf. verzögern.",
    },
    "cardiovascular": {
        "name_en": "Cardiovascular Adaptations & Orthostatic Intolerance",
        "name_de": "Kardiovaskuläre Anpassung & Thromboserisiko (VTE)",
        "primary_metrics": ["resting_hr_bpm", "orthostatic_delta_hr_bpm", "orthostatic_delta_map_mmHg", "serum_albumin_g_dL"],
        "description_en": "Fluid shifts and cardiac deconditioning lead to orthostatic intolerance upon reloading. Low serum albumin (<3.5 g/dL) elevates VTE risk.",
        "description_de": "Flüssigkeitsverschiebungen verursachen orthostatische Intoleranz bei Schwerkraftwechsel. Niedriges Serum-Albumin (<3.5 g/dL) erhöht das Thromboserisiko.",
        "countermeasure_en": "Wear Lower Body Compression Garments during transitions, execute fluid/salt loading, and monitor jugular venous flow.",
        "countermeasure_de": "Kompressionskleidung bei Übergängen tragen, gezielte Flüssigkeits-/Elektrolytaufnahme und regelmäßiges Ausdauertraining.",
    },
    "decompression_sickness": {
        "name_en": "Decompression Sickness (DCS)",
        "name_de": "Dekompressionskrankheit (DCS)",
        "primary_metrics": ["dcs_risk_index", "o2_prebreathe_min", "tissue_n2_ratio", "eva_suit_pressure_kPa"],
        "description_en": "Rapid transition from cabin pressure (101.3 kPa) to lower EVA suit pressure (~29.6 kPa) can form nitrogen bubbles in tissues.",
        "description_de": "Der Druckabfall vom Habitat zum Raumanzug (~29.6 kPa) kann bei unzureichendem O2-Prebreathe Stickstoffbläschen im Gewebe auslösen.",
        "countermeasure_en": "Strictly complete the full O2 pre-breathe + mild exercise protocol prior to EVA depressurization.",
        "countermeasure_de": "Das vollständige O2-Prebreathe-Protokoll vor jedem Außenbordeinsatz (EVA) zwingend einhalten.",
    },
    "host_microorganism": {
        "name_en": "Host-Microorganism Interactions",
        "name_de": "Wirt-Mikroorganismus-Interaktionen",
        "primary_metrics": ["gut_shannon_diversity", "skin_dysbiosis_score", "mrsa_colonization_risk"],
        "description_en": "Closed spacecraft habitats and altered diet reduce gut microbiome diversity and increase opportunistic skin/nasal pathogen risks.",
        "description_de": "Geschlossene Habitate und veränderte Ernährung reduzieren die Darmmikrobiom-Diversität und begünstigen Haut-/Schleimhautinfektionen.",
        "countermeasure_en": "Maintain probiotic/fiber intake, follow daily hygiene swab routines, and sanitize high-touch cabin surfaces.",
        "countermeasure_de": "Ballaststoff- und probiotikareiche Ernährung einhalten, Hygiene-Swabs durchführen und Oberflächen desinfizieren.",
    },
    "hypoxia": {
        "name_en": "Hypoxia & Atmospheric Stress",
        "name_de": "Hypoxie & Atemgas-Belastung",
        "primary_metrics": ["spo2_pct", "cabin_ppo2_kPa", "cabin_ppco2_kPa", "respiration_rate_bpm"],
        "description_en": "Reduced oxygen partial pressure (ppO2) or elevated CO2 (ppCO2) in closed habitats/suits impairs oxygenation and cognition.",
        "description_de": "Abgesunkener Sauerstoffpartialdruck (ppO2) oder erhöhtes CO2 (ppCO2) führt zu Sauerstoffmangel und kognitiven Einbußen.",
        "countermeasure_en": "Verify ECLSS scrubber/O2 supply immediately, switch to backup breathing loop if ppO2 < 19.5 kPa or SpO2 < 93%.",
        "countermeasure_de": "Sofort Lebenserhaltungssystem (ECLSS) und CO2-Absorber prüfen; bei SpO2 < 93% Notfall-O2 aktivieren.",
    },
    "nutrition": {
        "name_en": "Inadequate Food and Nutrition",
        "name_de": "Unzureichende Ernährung & Hydratation",
        "primary_metrics": ["calories_pct_target", "hydration_liters", "vitamin_d_ng_mL", "serum_iron_umol_L"],
        "description_en": "Appetite suppression and limited fresh food can cause caloric deficits, dehydration, and micronutrient depletion (Vitamin D, Iron).",
        "description_de": "Appetitverlust und Lagerungslimits begünstigen Kaloriendefizite, Dehydrierung sowie Vitamin-D- und Eisenmangel.",
        "countermeasure_en": "Log all meals, hit daily 2.2+ L hydration targets, and take scheduled Vitamin D3 supplementation.",
        "countermeasure_de": "Mahlzeiten konsequent erfassen, mindestens 2.2 L Flüssigkeit zuführen und Vitamin-D3-Supplementierung einhalten.",
    },
    "eva_injury_performance": {
        "name_en": "Injury & Compromised Performance from Spacewalks (EVA)",
        "name_de": "Verletzungsrisiko & Leistungseinbußen bei EVAs",
        "primary_metrics": ["hand_grip_fatigue_pct", "eva_musculoskeletal_strain", "core_temp_c"],
        "description_en": "Pressurized EVA gloves and suits cause forearm/hand fatigue, shoulder strain, and thermal stress during surface or orbital tasks.",
        "description_de": "Druckanzüge und steife Handschuhe verursachen starke Unterarm-Ermüdung, Schulterbelastung und Hitzestress.",
        "countermeasure_en": "Take micro-rests during high-torque tasks, monitor thermal suit cooling loop, and perform post-EVA stretching.",
        "countermeasure_de": "Kurzpausen bei Greifarbeiten einlegen, Anzug-Kühlung überwachen und Dehnübungen nach dem EVA ausführen.",
    },
    "fitness_deconditioning": {
        "name_en": "Reduced Cardiorespiratory and Musculoskeletal Fitness",
        "name_de": "Reduzierte Kardiorespiratorische & Muskuläre Fitness",
        "primary_metrics": ["imtp_peak_force_n", "vo2_max_ml_kg_min", "daily_exercise_min"],
        "description_en": "Mechanical unloading rapidly degrades muscle strength (tracked via Isometric Mid-Thigh Pull) and aerobic capacity.",
        "description_de": "Fehlende Schwerkraft baut Muskelkraft (IMTP-Test) und Ausdauerleistungsfähigkeit (VO2max) ohne Gegenmaßnahmen schnell ab.",
        "countermeasure_en": "Complete daily 90–120 min resistive (ARED) and aerobic (T2/CEVIS) training blocks.",
        "countermeasure_de": "Tägliches 90–120-minütiges Kraft- (ARED) und Ausdauertraining (Ergometer/Laufband) absolvieren.",
    },
    "sans_neuroocular": {
        "name_en": "Spaceflight-Associated Neuro-ocular Syndrome (SANS)",
        "name_de": "Spaceflight-Associated Neuro-ocular Syndrome (SANS)",
        "primary_metrics": ["optic_nerve_sheath_mm", "intraocular_pressure_mmHg", "refractive_shift_diopters"],
        "description_en": "Cephalad fluid shift elevates intracranial pressure, causing optic disc edema, nerve sheath distension, and hyperopic vision shifts.",
        "description_de": "Kopf-wärts verlagerte Körperflüssigkeiten erhöhen den Druck auf den Sehnerv (ONSD) und verändern die Sehschärfe.",
        "countermeasure_en": "Perform Lower Body Negative Pressure (LBNP) sessions, check B-vitamin status, and report visual blurriness.",
        "countermeasure_de": "Lower Body Negative Pressure (LBNP) anwenden, B-Vitamin-Status prüfen und Sehveränderungen melden.",
    },
    "bone_changes": {
        "name_en": "Spaceflight-Induced Bone Changes",
        "name_de": "Raumflug-induzierter Knochenabbau",
        "primary_metrics": ["bmd_tibia_change_pct", "bone_resorption_rate_pct", "serum_ctx_ng_mL"],
        "description_en": "Bone resorption exceeds formation ~3:1 in microgravity, causing irreversible microstructural loss if recovery sites arrest.",
        "description_de": "In Schwerelosigkeit übersteigt der Knochenabbau den Aufbau um ca. 3:1, mit kritischem Zeitfenster für Erholung.",
        "countermeasure_en": "Maximize high-strain ARED squat/deadlift loading and maintain adequate calcium + Vitamin D intake.",
        "countermeasure_de": "Hohe mechanische Lasten beim ARED-Training sicherstellen und Kalzium-/Vitamin-D-Zufuhr optimieren.",
    },
    "cognitive_behavioral": {
        "name_en": "Cognitive & Behavioral Performance",
        "name_de": "Kognitive Leistung & Schlafgesundheit",
        "primary_metrics": ["pvt_speed_score", "sleep_duration_h", "team_cohesion_score", "alertness_rating"],
        "description_en": "Circadian desynchronization and high operational stress slow sustained attention (PVT), working memory, and team cohesion.",
        "description_de": "Schlafmangel und Isolation verlangsamen Reaktionszeiten (PVT) und können die Team-Kohäsion zur Missionsmitte dämpfen.",
        "countermeasure_en": "Use circadian blue/white light therapy schedule, log Cognition Battery weekly, and protect wind-down time.",
        "countermeasure_de": "Zirkadianes Lichtprotokoll nutzen, wöchentlichen Cognition-Test machen und Ruhezeiten einhalten.",
    },
}


ASTRONAUT_PROFILES: List[Dict[str, Any]] = [
    {
        "astronaut_id": "AST-01",
        "name": "Cmdr. Alex Mercer",
        "sex": "M",
        "age": 48,
        "role": "Mission Commander",
        "experienced_flyer": True,
        "uses_coc": False,
        "baseline_hr": 58.0,
        "baseline_sbp": 118.0,
        "baseline_dbp": 75.0,
        "baseline_vo2max": 48.5,
        "baseline_imtp_n": 2750.0,
        "baseline_mass_kg": 79.0,
        "baseline_hgb_g_dL": 15.0,
        "baseline_albumin_g_dL": 4.4,
        "baseline_onsd_mm": 4.4,
        "sans_susceptibility": 1.35,   # slightly higher SANS fluid-shift sensitivity
        "vte_susceptibility": 0.85,
        "bone_loss_rate_mult": 1.0,
    },
    {
        "astronaut_id": "AST-02",
        "name": "Dr. Elena Vance",
        "sex": "F",
        "age": 41,
        "role": "Flight Engineer & Medical Officer",
        "experienced_flyer": False,
        "uses_coc": True,              # Per Zwart et al. (2022): lowers albumin, raises transferrin/cortisol/VTE risk
        "baseline_hr": 63.0,
        "baseline_sbp": 112.0,
        "baseline_dbp": 72.0,
        "baseline_vo2max": 44.0,
        "baseline_imtp_n": 2180.0,
        "baseline_mass_kg": 63.5,
        "baseline_hgb_g_dL": 13.1,
        "baseline_albumin_g_dL": 4.1,
        "baseline_onsd_mm": 4.2,
        "sans_susceptibility": 0.90,
        "vte_susceptibility": 1.65,
        "bone_loss_rate_mult": 1.05,
    },
    {
        "astronaut_id": "AST-03",
        "name": "Spec. Kenji Takahashi",
        "sex": "M",
        "age": 44,
        "role": "Payload & EVA Specialist",
        "experienced_flyer": True,
        "uses_coc": False,
        "baseline_hr": 61.0,
        "baseline_sbp": 121.0,
        "baseline_dbp": 78.0,
        "baseline_vo2max": 50.2,
        "baseline_imtp_n": 2620.0,
        "baseline_mass_kg": 74.5,
        "baseline_hgb_g_dL": 14.8,
        "baseline_albumin_g_dL": 4.5,
        "baseline_onsd_mm": 4.3,
        "sans_susceptibility": 1.0,
        "vte_susceptibility": 0.95,
        "bone_loss_rate_mult": 1.25,   # slightly higher bone resorption rate
    },
]


# ---------------------------------------------------------------------------
# Helper Math & Status Evaluation Functions
# ---------------------------------------------------------------------------

def clamp(val: float, low: float, high: float) -> float:
    return max(low, min(high, val))


def noise(rng: random.Random, sigma: float) -> float:
    return rng.gauss(0.0, sigma)


def get_environment_for_day(day: int, total_flight_days: int) -> Tuple[str, float, str]:
    """
    Returns (environment_id, gravity_g, mission_phase) for a relative mission day.
    day < 0: Pre-flight baseline
    0 <= day < total_flight_days: Flight across Spacecraft -> Station -> Lunar Base / Rover
    day >= total_flight_days: Post-flight recovery (R+0 .. R+14)
    """
    if day < 0:
        return "EARTH_BASELINE", 1.0, "PRE_FLIGHT"
    if day >= total_flight_days:
        return "EARTH_RECOVERY", 1.0, "POST_FLIGHT"

    progress = day / max(1, total_flight_days)
    if day <= 4:
        return "SPACECRAFT", 0.0, "LAUNCH_TRANSIT"
    if progress < 0.65:
        return "SPACE_STATION", 0.0, "ORBITAL_OPERATIONS"
    if day in (int(total_flight_days * 0.72), int(total_flight_days * 0.78), int(total_flight_days * 0.85), int(total_flight_days * 0.90)):
        return "ROVER_EVA", 0.16, "SURFACE_EVA"
    if progress < 0.95:
        return "LUNAR_BASE", 0.16, "SURFACE_HABITAT"
    return "SPACECRAFT", 0.0, "RETURN_TRANSIT"


def evaluate_risk_statuses(row: Dict[str, Any]) -> Tuple[Dict[str, str], int, List[Dict[str, str]]]:
    """
    Applies clinical & NASA thresholds to produce color coding ('green', 'yellow', 'red'),
    an overall readiness score (0-100), and actionable alerts for the astronaut.
    """
    statuses: Dict[str, str] = {}
    alerts: List[Dict[str, str]] = []

    def set_status(risk_key: str, level: str, msg_en: str = "", msg_de: str = "") -> None:
        order = {"green": 0, "yellow": 1, "red": 2}
        prev = statuses.get(risk_key, "green")
        if order[level] > order[prev]:
            statuses[risk_key] = level
        elif risk_key not in statuses:
            statuses[risk_key] = level
        if level in ("yellow", "red") and msg_en:
            alerts.append({
                "risk_id": risk_key,
                "severity": level,
                "message_en": msg_en,
                "message_de": msg_de,
                "action_en": RISK_DEFINITIONS[risk_key]["countermeasure_en"],
                "action_de": RISK_DEFINITIONS[risk_key]["countermeasure_de"],
            })

    # 1. Immune Response
    set_status("immune_response", "green")
    if row["hs_crp_mg_L"] > 3.5 or row["ebv_viral_load_copies_mL"] > 1500 or row["t_cell_function_pct"] < 62:
        set_status("immune_response", "red",
                   f"Elevated inflammation/viral shedding (hsCRP {row['hs_crp_mg_L']} mg/L, EBV {row['ebv_viral_load_copies_mL']} copies/mL).",
                   f"Erhöhte Entzündung/Virus-Reaktivierung (hsCRP {row['hs_crp_mg_L']} mg/L, EBV {row['ebv_viral_load_copies_mL']} Kopien/mL).")
    elif row["hs_crp_mg_L"] > 1.8 or row["ebv_viral_load_copies_mL"] > 400 or row["t_cell_function_pct"] < 75:
        set_status("immune_response", "yellow",
                   f"Mild immune dysregulation (T-cell function {row['t_cell_function_pct']}%).",
                   f"Leichte Immundysregulation (T-Zell-Funktion {row['t_cell_function_pct']}%).")

    # 2. Sensorimotor & Vestibular
    set_status("sensorimotor_vestibular", "green")
    if row["tandem_walk_ec_pct"] < 40 or row["sit_to_stand_s"] > 4.2 or row["motion_sickness_score"] >= 10:
        set_status("sensorimotor_vestibular", "red",
                   f"Severe post-transition balance/vestibular deficit (Tandem EC {row['tandem_walk_ec_pct']}%, Sit-to-stand {row['sit_to_stand_s']}s).",
                   f"Deutliches Gleichgewichtsdefizit nach Gravitationswechsel (Tandem-Walk {row['tandem_walk_ec_pct']}%, Sit-to-Stand {row['sit_to_stand_s']}s).")
    elif row["tandem_walk_ec_pct"] < 65 or row["sit_to_stand_s"] > 2.6 or row["motion_sickness_score"] >= 4:
        set_status("sensorimotor_vestibular", "yellow",
                   f"Moderate sensorimotor adaptation symptoms (Motion sickness {row['motion_sickness_score']}/20).",
                   f"Moderate vestibuläre Anpassungssymptome (Motion Sickness {row['motion_sickness_score']}/20).")

    # 3. Cardiovascular & VTE
    set_status("cardiovascular", "green")
    if row["serum_albumin_g_dL"] < 3.5 or row["orthostatic_delta_hr_bpm"] > 22 or row["orthostatic_delta_map_mmHg"] < -12:
        set_status("cardiovascular", "red",
                   f"Critical cardiovascular/VTE alert (Albumin {row['serum_albumin_g_dL']} g/dL, ΔHR +{row['orthostatic_delta_hr_bpm']} bpm).",
                   f"Kritisches Herz-Kreislauf-/Thromboserisiko (Albumin {row['serum_albumin_g_dL']} g/dL, ΔPuls +{row['orthostatic_delta_hr_bpm']} bpm).")
    elif row["serum_albumin_g_dL"] < 3.8 or row["orthostatic_delta_hr_bpm"] > 14 or row["orthostatic_delta_map_mmHg"] < -7:
        set_status("cardiovascular", "yellow",
                   f"Elevated orthostatic strain / borderline albumin ({row['serum_albumin_g_dL']} g/dL).",
                   f"Erhöhte orthostatische Belastung / grenzwertiges Albumin ({row['serum_albumin_g_dL']} g/dL).")

    # 4. Decompression Sickness
    set_status("decompression_sickness", "green")
    if row["dcs_risk_index"] >= 65:
        set_status("decompression_sickness", "red",
                   f"High DCS risk ({row['dcs_risk_index']}/100): insufficient O2 pre-breathe ({row['o2_prebreathe_min']} min).",
                   f"Hohes Dekompressionsrisiko ({row['dcs_risk_index']}/100): O2-Prebreathe unzureichend ({row['o2_prebreathe_min']} Min).")
    elif row["dcs_risk_index"] >= 35:
        set_status("decompression_sickness", "yellow",
                   f"Moderate nitrogen supersaturation during EVA prep (DCS Index {row['dcs_risk_index']}).",
                   f"Erhöhte Stickstoffsättigung bei EVA-Vorbereitung (DCS-Index {row['dcs_risk_index']}).")

    # 5. Host-Microorganism
    set_status("host_microorganism", "green")
    if row["gut_shannon_diversity"] < 2.55 or row["skin_dysbiosis_score"] > 0.75:
        set_status("host_microorganism", "red",
                   f"Severe microbiome shift (Shannon diversity {row['gut_shannon_diversity']}).",
                   f"Starke Mikrobiom-Verschiebung (Shannon-Diversität {row['gut_shannon_diversity']}).")
    elif row["gut_shannon_diversity"] < 2.95 or row["skin_dysbiosis_score"] > 0.56:
        set_status("host_microorganism", "yellow",
                   "Reduced gut/skin microbiome stability.",
                   "Reduzierte Darm-/Haut-Mikrobiom-Stabilität.")

    # 6. Hypoxia
    set_status("hypoxia", "green")
    if row["spo2_pct"] < 92.0 or row["cabin_ppo2_kPa"] < 18.4 or row["cabin_ppco2_kPa"] > 0.70:
        set_status("hypoxia", "red",
                   f"Hypoxia/CO2 alert (SpO2 {row['spo2_pct']}%, ppO2 {row['cabin_ppo2_kPa']} kPa, ppCO2 {row['cabin_ppco2_kPa']} kPa).",
                   f"Hypoxie-/CO2-Alarm (SpO2 {row['spo2_pct']}%, ppO2 {row['cabin_ppo2_kPa']} kPa, ppCO2 {row['cabin_ppco2_kPa']} kPa).")
    elif row["spo2_pct"] < 94.8 or row["cabin_ppo2_kPa"] < 19.7 or row["cabin_ppco2_kPa"] > 0.50:
        set_status("hypoxia", "yellow",
                   f"Borderline cabin O2/CO2 (SpO2 {row['spo2_pct']}%, ppCO2 {row['cabin_ppco2_kPa']} kPa).",
                   f"Grenzwertige Kabinenluft (SpO2 {row['spo2_pct']}%, ppCO2 {row['cabin_ppco2_kPa']} kPa).")

    # 7. Nutrition
    set_status("nutrition", "green")
    if row["calories_pct_target"] < 75.0 or row["hydration_liters"] < 1.55 or row["vitamin_d_ng_mL"] < 20.0:
        set_status("nutrition", "red",
                   f"Significant nutritional/hydration deficit ({row['calories_pct_target']}% kcal target, {row['hydration_liters']} L).",
                   f"Deutliches Nährstoff-/Flüssigkeitsdefizit ({row['calories_pct_target']}% Kalorienziel, {row['hydration_liters']} L).")
    elif row["calories_pct_target"] < 85.0 or row["hydration_liters"] < 1.90 or row["vitamin_d_ng_mL"] < 27.0:
        set_status("nutrition", "yellow",
                   f"Suboptimal hydration or caloric intake ({row['hydration_liters']} L).",
                   f"Suboptimale Kalorien- oder Wasseraufnahme ({row['hydration_liters']} L).")

    # 8. EVA Injury & Performance
    set_status("eva_injury_performance", "green")
    if row["hand_grip_fatigue_pct"] > 38.0 or row["core_temp_c"] > 38.3 or row["eva_musculoskeletal_strain"] >= 7.5:
        set_status("eva_injury_performance", "red",
                   f"High EVA strain/thermal load (Grip fatigue {row['hand_grip_fatigue_pct']}%, Core temp {row['core_temp_c']} °C).",
                   f"Hohe EVA-Belastung/Hitzestress (Greifermüdung {row['hand_grip_fatigue_pct']}%, Kerntemp. {row['core_temp_c']} °C).")
    elif row["hand_grip_fatigue_pct"] > 24.0 or row["core_temp_c"] > 37.7 or row["eva_musculoskeletal_strain"] >= 5.2:
        set_status("eva_injury_performance", "yellow",
                   "Moderate EVA fatigue/strain recorded.",
                   "Moderate EVA-Muskelermüdung festgestellt.")

    # 9. Fitness
    set_status("fitness_deconditioning", "green")
    if row["imtp_change_pct"] < -15.0 or row["vo2_max_change_pct"] < -15.0 or row["ared_load_compliance_pct"] < 55.0:
        set_status("fitness_deconditioning", "red",
                   f"Musculoskeletal/aerobic deconditioning (IMTP {row['imtp_change_pct']}%, VO2max {row['vo2_max_change_pct']}%).",
                   f"Starker Kraft-/Ausdauerverlust (IMTP {row['imtp_change_pct']}%, VO2max {row['vo2_max_change_pct']}%).")
    elif row["imtp_change_pct"] < -8.0 or row["vo2_max_change_pct"] < -8.0 or row["ared_load_compliance_pct"] < 75.0:
        set_status("fitness_deconditioning", "yellow",
                   f"Mild strength/fitness drift (ARED compliance {row['ared_load_compliance_pct']}%).",
                   f"Leichter Fitness-Rückgang (Trainingserfüllung {row['ared_load_compliance_pct']}%).")

    # 10. SANS
    set_status("sans_neuroocular", "green")
    if row["optic_nerve_sheath_mm"] > 5.75 or row["frisen_papilledema_grade"] >= 2 or row["refractive_shift_diopters"] >= 0.85:
        set_status("sans_neuroocular", "red",
                   f"SANS progression alert (ONSD {row['optic_nerve_sheath_mm']} mm, shift +{row['refractive_shift_diopters']} D).",
                   f"SANS-Fortschritt (Sehnervenscheide {row['optic_nerve_sheath_mm']} mm, +{row['refractive_shift_diopters']} dpt).")
    elif row["optic_nerve_sheath_mm"] > 5.25 or row["frisen_papilledema_grade"] == 1 or row["refractive_shift_diopters"] >= 0.45:
        set_status("sans_neuroocular", "yellow",
                   f"Early SANS fluid-shift indicators (ONSD {row['optic_nerve_sheath_mm']} mm).",
                   f"Frühe SANS-Anzeichen (Sehnervenscheide {row['optic_nerve_sheath_mm']} mm).")

    # 11. Bone Changes
    set_status("bone_changes", "green")
    if row["bmd_tibia_change_pct"] < -4.5 or row["serum_ctx_ng_mL"] > 0.85:
        set_status("bone_changes", "red",
                   f"Accelerated bone resorption (Tibia BMD {row['bmd_tibia_change_pct']}%, CTx {row['serum_ctx_ng_mL']} ng/mL).",
                   f"Beschleunigter Knochenabbau (Tibia-BMD {row['bmd_tibia_change_pct']}%, CTx {row['serum_ctx_ng_mL']} ng/mL).")
    elif row["bmd_tibia_change_pct"] < -2.3 or row["serum_ctx_ng_mL"] > 0.68:
        set_status("bone_changes", "yellow",
                   f"Elevated bone turnover imbalance (Tibia BMD {row['bmd_tibia_change_pct']}%).",
                   f"Erhöhter Knochenumbau (Tibia-BMD {row['bmd_tibia_change_pct']}%).")

    # 12. Cognitive & Behavioral
    set_status("cognitive_behavioral", "green")
    if row["pvt_speed_score"] < 4.50 or row["sleep_duration_h"] < 5.2 or row["team_cohesion_score"] < 4.0:
        set_status("cognitive_behavioral", "red",
                   f"Cognitive fatigue / sleep debt (Sleep {row['sleep_duration_h']} h, PVT {row['pvt_speed_score']}).",
                   f"Kognitive Erschöpfung / Schlafdefizit (Schlaf {row['sleep_duration_h']} h, PVT {row['pvt_speed_score']}).")
    elif row["pvt_speed_score"] < 4.82 or row["sleep_duration_h"] < 5.95 or row["team_cohesion_score"] < 4.8:
        set_status("cognitive_behavioral", "yellow",
                   f"Mild attention/sleep decline (Sleep {row['sleep_duration_h']} h, Alertness {row['alertness_rating']}/10).",
                   f"Leichte Müdigkeit / Aufmerksamkeitsabfall (Schlaf {row['sleep_duration_h']} h, Wachheit {row['alertness_rating']}/10).")

    # Compute overall readiness (100 minus penalties per yellow/red risk)
    penalty = sum(8 if s == "red" else (3 if s == "yellow" else 0) for s in statuses.values())
    readiness_score = max(15, 100 - penalty)
    return statuses, readiness_score, alerts


# ---------------------------------------------------------------------------
# Longitudinal Daily Generator
# ---------------------------------------------------------------------------

def simulate_astronaut_mission(
    profile: Dict[str, Any],
    start_date: datetime.date,
    preflight_days: int,
    flight_days: int,
    postflight_days: int,
    include_anomalies: bool,
    rng: random.Random,
) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
    """
    Simulates daily longitudinal time-series and gamification/prompt records
    for a single astronaut across pre-flight, orbital/surface flight, and recovery.
    """
    daily_records: List[Dict[str, Any]] = []
    prompt_records: List[Dict[str, Any]] = []

    aid = profile["astronaut_id"]
    streak = 0
    total_xp = 1200

    # Cumulative state trackers
    bmd_change_pct = 0.0
    imtp_change_pct = 0.0
    vo2_change_pct = 0.0
    cumulative_rad_mSv = 0.0
    gut_diversity = 3.65

    for rel_day in range(-preflight_days, flight_days + postflight_days):
        current_date = start_date + datetime.timedelta(days=rel_day)
        env, gravity_g, phase = get_environment_for_day(rel_day, flight_days)

        in_flight = 0 <= rel_day < flight_days
        post_day = rel_day - flight_days if rel_day >= flight_days else -1
        is_eva = (env == "ROVER_EVA")
        microgravity_factor = 1.0 - gravity_g  # 1.0 in 0G, 0.84 on Moon, 0.0 on Earth

        # Mid-mission "third-quarter" psychological dip curve
        mid_mission_stress = 0.0
        if in_flight:
            frac = rel_day / max(1, flight_days)
            mid_mission_stress = math.exp(-((frac - 0.55) / 0.18) ** 2)

        # Anomaly windows (realistic mission events)
        anomaly_vte = include_anomalies and profile["uses_coc"] and (32 <= rel_day <= 42)
        hypoxia_intensity = 0.0
        if include_anomalies and (55 <= rel_day <= 59):
            hypoxia_intensity = {55: 0.45, 56: 1.0, 57: 1.0, 58: 0.55, 59: 0.25}[rel_day]
        anomaly_sleep_debt = include_anomalies and (52 <= rel_day <= 61)
        anomaly_dcs = include_anomalies and is_eva and (rel_day == int(flight_days * 0.78))
        anomaly_nutri = include_anomalies and (22 <= rel_day <= 27) and aid == "AST-03"
        anomaly_sans = include_anomalies and (70 <= rel_day <= 92) and aid == "AST-01"

        # --- Exercise & Countermeasures ---
        if in_flight:
            base_ex = 105.0 if not is_eva else 45.0
            exercise_min = clamp(base_ex + noise(rng, 18.0) - (25.0 if anomaly_sleep_debt else 0.0), 0.0, 150.0)
            ared_compliance = clamp((exercise_min / 100.0) * 95.0 + noise(rng, 6.0), 25.0, 100.0)
        else:
            exercise_min = clamp(65.0 + noise(rng, 15.0), 20.0, 120.0)
            ared_compliance = 100.0

        # Compression garment worn during transitions / R+0
        compression_worn = (phase in ("LAUNCH_TRANSIT", "RETURN_TRANSIT")) or (post_day == 0 and aid != "AST-03")
        lbnp_session = in_flight and (rel_day % 3 == 0 or (anomaly_sans and rel_day >= 80))

        # --- Sleep & Cognition (Dev et al., 2024; SSM Actigraphy) ---
        sleep_target = 7.4 if not in_flight else 6.6
        sleep_h = sleep_target + noise(rng, 0.35) - (1.45 if anomaly_sleep_debt else 0.0) - (0.4 if phase == "LAUNCH_TRANSIT" else 0.0)
        sleep_h = round(clamp(sleep_h, 3.8, 9.2), 2)
        sleep_eff = round(clamp(91.0 - (6.0 if in_flight else 0.0) - (8.0 if anomaly_sleep_debt else 0.0) + noise(rng, 2.5), 62.0, 98.0), 1)
        alertness = round(clamp(8.4 - max(0.0, (7.0 - sleep_h) * 1.1) - mid_mission_stress * 1.0 + noise(rng, 0.5), 1.5, 10.0), 1)

        # PVT Speed (Baseline M=5.25, SD=0.24), DSST RT (1209±146ms), F2B Acc (0.92±0.07), BART (0.72±0.11)
        early_flight_lag = 0.25 if (0 <= rel_day <= 14) else 0.0
        sleep_penalty = max(0.0, (6.5 - sleep_h) * 0.28)
        pvt_speed = round(clamp(5.25 - early_flight_lag - sleep_penalty - (0.25 * hypoxia_intensity) + noise(rng, 0.12), 3.8, 5.85), 2)
        pvt_acc = round(clamp(0.97 - sleep_penalty * 0.04 + noise(rng, 0.015), 0.72, 1.0), 3)
        dsst_rt = round(clamp(1209.0 + early_flight_lag * 220 + sleep_penalty * 180 + noise(rng, 75.0), 880.0, 1950.0), 1)
        f2b_acc = round(clamp(0.92 - early_flight_lag * 0.08 - sleep_penalty * 0.05 + noise(rng, 0.03), 0.65, 1.0), 3)
        bart_risk = round(clamp(0.72 - (0.06 if (in_flight and rel_day > flight_days * 0.7) else 0.0) + noise(rng, 0.05), 0.35, 0.95), 3)
        team_cohesion = round(clamp(6.4 - mid_mission_stress * 1.8 - (0.7 if anomaly_sleep_debt else 0.0) + noise(rng, 0.3), 2.5, 7.0), 1)

        # --- Cardiovascular & VTE (Lee et al., 2025; Zwart et al., 2022) ---
        resting_hr = round(clamp(profile["baseline_hr"] + (3.5 if is_eva else 0.0) + (4.0 if post_day in (0, 1) else 0.0) + noise(rng, 2.5), 45.0, 95.0), 1)
        hrv_rmssd = round(clamp(48.0 - (8.0 if in_flight else 0.0) - (12.0 if anomaly_sleep_debt else 0.0) + noise(rng, 4.5), 14.0, 85.0), 1)
        sbp = round(clamp(profile["baseline_sbp"] - (3.0 if in_flight else 0.0) + noise(rng, 4.0), 90.0, 145.0), 1)
        dbp = round(clamp(profile["baseline_dbp"] - (2.0 if in_flight else 0.0) + noise(rng, 3.0), 58.0, 95.0), 1)

        # Orthostatic response on standing (Lee et al. 2025: R+0 ΔMAP -8 mmHg & ΔHR +11-22 without GCG; +1 with GCG)
        if post_day >= 0:
            rec_decay = math.exp(-post_day / 4.5)
            garment_mitigation = 0.20 if compression_worn else 1.0
            delta_hr = round(clamp(4.0 + (18.0 * rec_decay * garment_mitigation) + noise(rng, 1.5), 0.0, 32.0), 1)
            delta_map = round(clamp(1.0 - (11.5 * rec_decay * garment_mitigation) + noise(rng, 1.8), -18.0, 8.0), 1)
        elif in_flight:
            delta_hr = round(clamp(4.0 + (4.0 if gravity_g > 0 else 0.0) + noise(rng, 1.5), 0.0, 15.0), 1)
            delta_map = round(clamp(0.5 - (2.5 if gravity_g > 0 else 0.0) + noise(rng, 1.5), -8.0, 6.0), 1)
        else:
            delta_hr = round(clamp(4.5 + noise(rng, 1.2), 1.0, 10.0), 1)
            delta_map = round(clamp(1.5 + noise(rng, 1.2), -3.0, 5.0), 1)

        # Serum Albumin & Transferrin (Zwart et al. 2022)
        coc_drop = -0.52 if profile["uses_coc"] and in_flight else (-0.15 if in_flight else 0.0)
        albumin = round(clamp(profile["baseline_albumin_g_dL"] + coc_drop - (0.35 if anomaly_vte else 0.0) + noise(rng, 0.08), 3.1, 5.1), 2)
        transferrin = round(clamp((345.0 if profile["uses_coc"] else 245.0) + (25.0 if anomaly_vte else 0.0) + noise(rng, 12.0), 180.0, 420.0), 1)

        # --- Immune Response & Virology (SSM Cellular Profile; Zwart et al.) ---
        cortisol = round(clamp((28.0 if profile["uses_coc"] else 15.5) + (4.0 if in_flight else 0.0) + (6.5 if anomaly_vte else 0.0) + noise(rng, 2.2), 7.0, 44.0), 1)
        hs_crp = round(clamp(0.7 + (0.6 if in_flight else 0.0) + (3.2 if anomaly_vte else 0.0) + (1.2 if post_day in (0, 1) else 0.0) + abs(noise(rng, 0.25)), 0.1, 10.0), 2)
        t_cell_pct = round(clamp(94.0 - (14.0 if in_flight else 0.0) - (16.0 if anomaly_vte or anomaly_sleep_debt else 0.0) + noise(rng, 3.0), 45.0, 100.0), 1)
        ebv_copies = int(clamp((120.0 if in_flight else 10.0) + (1850.0 if anomaly_vte else 0.0) + (500.0 if anomaly_sleep_debt else 0.0) + abs(noise(rng, 60.0)), 0.0, 5000.0))
        wbc = round(clamp(6.2 + (0.8 if in_flight else 0.0) + (1.6 if anomaly_vte else 0.0) + noise(rng, 0.4), 3.5, 13.0), 2)

        # --- Sensorimotor & Vestibular (Clément et al. 2022) ---
        if phase == "LAUNCH_TRANSIT":
            trans_severity = math.exp(-rel_day / 1.5)
        elif env == "LUNAR_BASE" and rel_day == int(flight_days * 0.65):
            trans_severity = 0.55
        elif post_day >= 0:
            trans_severity = math.exp(-post_day / 2.8)
        else:
            trans_severity = 0.0

        sit_to_stand = round(clamp(1.65 + 3.49 * trans_severity + noise(rng, 0.15), 1.1, 7.5), 2)
        rec_from_fall = round(clamp(2.30 + 9.69 * trans_severity + noise(rng, 0.35), 1.6, 16.0), 2)
        tandem_eo = round(clamp(96.0 - 60.5 * trans_severity + noise(rng, 3.0), 10.0, 100.0), 1)
        tandem_ec = round(clamp(82.0 - 64.0 * (math.exp(-post_day / 3.8) if post_day >= 0 else trans_severity) + noise(rng, 4.0), 5.0, 100.0), 1)
        walk_turn_s = round(clamp(5.4 + 19.1 * trans_severity + noise(rng, 0.5), 4.0, 32.0), 2)
        motion_sickness = int(clamp(round(12.0 * trans_severity + noise(rng, 1.0)), 0, 20))

        # --- Hypoxia & Atmosphere ---
        if env == "ROVER_EVA":
            cabin_pressure = 56.5 if not is_eva else 29.6
            cabin_ppo2 = round(clamp(20.6 + noise(rng, 0.35) - (2.2 * hypoxia_intensity), 15.0, 30.0), 2)
        else:
            cabin_pressure = 101.3
            cabin_ppo2 = round(clamp(21.2 + noise(rng, 0.25) - (3.0 * hypoxia_intensity), 16.0, 22.5), 2)
        cabin_ppco2 = round(clamp(0.32 + (0.06 if in_flight else -0.27) + (0.48 * hypoxia_intensity) + noise(rng, 0.03), 0.04, 1.1), 3)
        spo2 = round(clamp(98.2 - (0.6 if in_flight else 0.0) - (6.8 * hypoxia_intensity) + noise(rng, 0.40), 84.0, 100.0), 1)
        resp_rate = round(clamp(14.5 + (4.2 * hypoxia_intensity) + (2.5 if is_eva else 0.0) + noise(rng, 1.0), 10.0, 28.0), 1)

        # --- Decompression Sickness (DCS) ---
        if is_eva:
            prebreathe_min = 35.0 if anomaly_dcs else round(clamp(145.0 + noise(rng, 12.0), 95.0, 180.0), 0)
            suit_pressure = 29.6
            n2_ratio = round(clamp(1.86 - (prebreathe_min / 225.0) + noise(rng, 0.04), 1.05, 1.88), 2)
            dcs_risk = int(clamp(round((n2_ratio - 1.05) * 115.0), 5, 95))
        else:
            prebreathe_min = 0.0
            suit_pressure = cabin_pressure
            n2_ratio = 1.00
            dcs_risk = 2

        # --- EVA Injury & Thermal Strain ---
        if is_eva:
            eva_dur = round(clamp(320.0 + noise(rng, 45.0), 180.0, 460.0), 0)
            grip_fatigue = round(clamp(26.0 + (18.0 if anomaly_dcs else 0.0) + noise(rng, 4.0), 8.0, 55.0), 1)
            eva_strain = round(clamp(5.2 + (2.8 if anomaly_dcs else 0.0) + noise(rng, 0.8), 1.0, 10.0), 1)
            core_temp = round(clamp(37.4 + (0.7 if anomaly_dcs else 0.0) + noise(rng, 0.15), 36.4, 39.0), 2)
        else:
            eva_dur = 0.0
            grip_fatigue = round(clamp(4.0 + noise(rng, 2.0), 0.0, 15.0), 1)
            eva_strain = round(clamp(1.2 + noise(rng, 0.5), 0.0, 3.5), 1)
            core_temp = round(clamp(36.8 + noise(rng, 0.15), 36.2, 37.5), 2)

        # --- Nutrition & Body Mass ---
        cal_target = 2700 if profile["sex"] == "M" else 2250
        if is_eva:
            cal_target += 450
        cal_pct = round(clamp(96.0 - (4.0 if in_flight else 0.0) - (22.0 if anomaly_nutri else 0.0) + noise(rng, 4.0), 55.0, 115.0), 1)
        cal_intake = int(round(cal_target * (cal_pct / 100.0)))
        hydration = round(clamp(2.45 - (0.2 if in_flight else 0.0) - (0.85 if anomaly_nutri else 0.0) + noise(rng, 0.2), 1.0, 3.8), 2)
        vit_d = round(clamp(36.0 - (0.04 * max(0, rel_day)) - (12.0 if anomaly_nutri else 0.0) + noise(rng, 1.5), 14.0, 55.0), 1)
        serum_iron = round(clamp(24.0 - (0.02 * max(0, rel_day)) - (4.0 if post_day >= 0 else 0.0) + noise(rng, 2.5), 9.0, 38.0), 1)
        body_mass = round(profile["baseline_mass_kg"] * (1.0 - (0.02 * (max(0, rel_day) / max(1, flight_days)))) + noise(rng, 0.2), 2)

        # --- Fitness (IMTP & VO2max) ---
        if in_flight:
            drift = -0.09 if ared_compliance < 75.0 else -0.025
            imtp_change_pct = clamp(imtp_change_pct + drift + noise(rng, 0.15), -22.0, 3.0)
            vo2_change_pct = clamp(vo2_change_pct + drift * 0.9 + noise(rng, 0.15), -22.0, 3.0)
        elif post_day >= 0:
            imtp_change_pct = clamp(imtp_change_pct + 0.35, -22.0, 0.0)
            vo2_change_pct = clamp(vo2_change_pct + 0.40, -22.0, 0.0)
        imtp_force = round(profile["baseline_imtp_n"] * (1.0 + imtp_change_pct / 100.0), 1)
        vo2_max = round(profile["baseline_vo2max"] * (1.0 + vo2_change_pct / 100.0), 1)

        # --- Bone Changes (Walle et al. 2024: ~3:1 resorption to formation in 0G) ---
        if in_flight:
            load_protection = ared_compliance / 100.0
            resorption_rate = round(clamp((2.6 - 0.8 * load_protection) * profile["bone_loss_rate_mult"] + noise(rng, 0.15), 0.8, 4.5), 2)
            formation_rate = round(clamp(0.65 + 0.2 * load_protection + noise(rng, 0.08), 0.3, 1.5), 2)
            bmd_change_pct = clamp(bmd_change_pct - (0.022 * microgravity_factor * profile["bone_loss_rate_mult"] * (1.25 - 0.55 * load_protection)), -9.5, 0.5)
            serum_ctx = round(clamp(0.40 + (0.24 - 0.10 * load_protection) * microgravity_factor * profile["bone_loss_rate_mult"] + noise(rng, 0.04), 0.2, 1.1), 2)
        elif post_day >= 0:
            resorption_rate = round(clamp(1.1 + noise(rng, 0.12), 0.5, 2.0), 2)
            formation_rate = round(clamp(2.2 + noise(rng, 0.15), 1.0, 3.2), 2)
            bmd_change_pct = clamp(bmd_change_pct + 0.025, -9.5, 0.0)
            serum_ctx = round(clamp(0.45 + noise(rng, 0.04), 0.2, 0.8), 2)
        else:
            resorption_rate = round(clamp(0.85 + noise(rng, 0.08), 0.5, 1.3), 2)
            formation_rate = round(clamp(0.85 + noise(rng, 0.08), 0.5, 1.3), 2)
            serum_ctx = round(clamp(0.35 + noise(rng, 0.03), 0.15, 0.6), 2)

        # --- SANS (Neuro-ocular) ---
        if in_flight:
            sans_prog = min(1.0, rel_day / max(1, flight_days * 0.75)) * profile["sans_susceptibility"]
            lbnp_relief = 0.28 if lbnp_session else 0.0
            onsd_mm = round(clamp(profile["baseline_onsd_mm"] + 0.68 * sans_prog + (0.72 if anomaly_sans else 0.0) - lbnp_relief + noise(rng, 0.07), 3.8, 6.6), 2)
            iop_mmHg = round(clamp(15.0 + 3.0 * sans_prog + noise(rng, 0.6), 11.0, 24.0), 1)
            diopter_shift = round(clamp(0.32 * sans_prog + (0.50 if anomaly_sans else 0.0) + noise(rng, 0.04), -0.1, 1.5), 2)
            frisen_grade = 2 if onsd_mm > 5.75 else (1 if onsd_mm > 5.25 else 0)
        else:
            onsd_mm = round(clamp(profile["baseline_onsd_mm"] + (0.2 if post_day in (0, 1, 2) else 0.0) + noise(rng, 0.06), 3.8, 5.5), 2)
            iop_mmHg = round(clamp(14.8 + noise(rng, 0.5), 11.0, 20.0), 1)
            diopter_shift = round(clamp((0.25 if post_day in range(0, 7) else 0.0) + noise(rng, 0.03), 0.0, 0.8), 2)
            frisen_grade = 0

        # --- Microbiome (SSM) ---
        if in_flight:
            gut_diversity = clamp(gut_diversity - 0.002 + (0.002 if cal_pct > 90 else -0.004) + noise(rng, 0.020), 2.3, 4.0)
        elif post_day >= 0:
            gut_diversity = clamp(gut_diversity + 0.025, 2.3, 3.8)
        skin_dysbiosis = round(clamp(0.22 + (0.20 if in_flight else 0.0) + (0.18 if is_eva else 0.0) + noise(rng, 0.04), 0.05, 0.90), 2)
        mrsa_risk = round(clamp(0.10 + (0.20 if in_flight else 0.0) + noise(rng, 0.04), 0.02, 0.75), 2)

        # --- Radiation ---
        daily_rad = 0.008 if not in_flight else (0.52 if env in ("SPACE_STATION", "SPACECRAFT") else 0.88)
        if is_eva:
            daily_rad += 0.28
        daily_rad = round(max(0.0, daily_rad + noise(rng, 0.04)), 3)
        cumulative_rad_mSv = round(cumulative_rad_mSv + daily_rad, 2)

        row: Dict[str, Any] = {
            "date": current_date.isoformat(),
            "mission_day": rel_day,
            "astronaut_id": aid,
            "environment": env,
            "mission_phase": phase,
            "gravity_g": gravity_g,
            # Immune
            "wbc_10e9_L": wbc,
            "t_cell_function_pct": t_cell_pct,
            "hs_crp_mg_L": hs_crp,
            "cortisol_ug_dL": cortisol,
            "ebv_viral_load_copies_mL": ebv_copies,
            # Sensorimotor
            "sit_to_stand_s": sit_to_stand,
            "recovery_from_fall_s": rec_from_fall,
            "tandem_walk_eo_pct": tandem_eo,
            "tandem_walk_ec_pct": tandem_ec,
            "walk_and_turn_s": walk_turn_s,
            "motion_sickness_score": motion_sickness,
            # Cardiovascular & VTE
            "resting_hr_bpm": resting_hr,
            "hrv_rmssd_ms": hrv_rmssd,
            "systolic_bp_mmHg": sbp,
            "diastolic_bp_mmHg": dbp,
            "orthostatic_delta_hr_bpm": delta_hr,
            "orthostatic_delta_map_mmHg": delta_map,
            "serum_albumin_g_dL": albumin,
            "transferrin_mg_dL": transferrin,
            "compression_garment_worn": compression_worn,
            # DCS
            "cabin_pressure_kPa": cabin_pressure,
            "eva_suit_pressure_kPa": suit_pressure,
            "o2_prebreathe_min": int(prebreathe_min),
            "tissue_n2_ratio": n2_ratio,
            "dcs_risk_index": dcs_risk,
            # Microbiome
            "gut_shannon_diversity": round(gut_diversity, 2),
            "skin_dysbiosis_score": skin_dysbiosis,
            "mrsa_colonization_risk": mrsa_risk,
            # Hypoxia
            "spo2_pct": spo2,
            "cabin_ppo2_kPa": cabin_ppo2,
            "cabin_ppco2_kPa": cabin_ppco2,
            "respiration_rate_bpm": resp_rate,
            # Nutrition
            "calories_intake_kcal": cal_intake,
            "calories_pct_target": cal_pct,
            "hydration_liters": hydration,
            "vitamin_d_ng_mL": vit_d,
            "serum_iron_umol_L": serum_iron,
            "body_mass_kg": body_mass,
            # EVA
            "eva_duration_min": int(eva_dur),
            "hand_grip_fatigue_pct": grip_fatigue,
            "eva_musculoskeletal_strain": eva_strain,
            "core_temp_c": core_temp,
            # Fitness
            "imtp_peak_force_n": imtp_force,
            "imtp_change_pct": round(imtp_change_pct, 2),
            "vo2_max_ml_kg_min": vo2_max,
            "vo2_max_change_pct": round(vo2_change_pct, 2),
            "daily_exercise_min": round(exercise_min, 1),
            "ared_load_compliance_pct": round(ared_compliance, 1),
            # SANS
            "optic_nerve_sheath_mm": onsd_mm,
            "intraocular_pressure_mmHg": iop_mmHg,
            "refractive_shift_diopters": diopter_shift,
            "frisen_papilledema_grade": frisen_grade,
            "lbnp_session_completed": lbnp_session,
            # Bone
            "bmd_tibia_change_pct": round(bmd_change_pct, 2),
            "bone_resorption_rate_pct": resorption_rate,
            "bone_formation_rate_pct": formation_rate,
            "serum_ctx_ng_mL": serum_ctx,
            # Cognitive & Sleep
            "sleep_duration_h": sleep_h,
            "sleep_efficiency_pct": sleep_eff,
            "alertness_rating": alertness,
            "pvt_speed_score": pvt_speed,
            "pvt_accuracy": pvt_acc,
            "dsst_rt_ms": dsst_rt,
            "f2b_accuracy": f2b_acc,
            "bart_risk_score": bart_risk,
            "team_cohesion_score": team_cohesion,
            # Radiation
            "radiation_dose_mSv_day": daily_rad,
            "radiation_cumulative_mSv": cumulative_rad_mSv,
        }

        risk_statuses, readiness, alerts = evaluate_risk_statuses(row)
        row["risk_statuses"] = risk_statuses
        row["overall_readiness_score"] = readiness
        row["active_alerts"] = alerts

        # Gamification & Routine Compliance (~87% per Hardy et al. 2025 Standard Measures compliance)
        tasks_completed = rng.random() < 0.88
        if tasks_completed:
            streak += 1
            xp_earned = 50 + (10 if is_eva else 0) + (15 if lbnp_session else 0)
        else:
            streak = 0
            xp_earned = 10
        total_xp += xp_earned
        row["gamification"] = {
            "daily_routine_completed": tasks_completed,
            "streak_days": streak,
            "xp_earned_today": xp_earned,
            "total_xp": total_xp,
            "badge_level": "Commander Gold" if total_xp > 5000 else ("Orbital Silver" if total_xp > 2500 else "Cadet Bronze"),
        }

        # Periodic Measurement Prompts (potential considerations.md)
        if rel_day % 7 == 0:
            prompt_records.append({
                "date": current_date.isoformat(),
                "mission_day": rel_day,
                "astronaut_id": aid,
                "prompt_type": "Cognition Battery + Sleep Survey",
                "estimated_duration_min": 15,
                "instruction_en": "Complete the 3-min PVT and Cognition test on your crew tablet and verify actigraphy sync.",
                "instruction_de": "Führe den 3-Minuten-PVT und die Cognition Battery auf dem Tablet aus und synchronisiere das Aktigraphie-Armband.",
                "status": "completed" if tasks_completed else "pending",
            })
        if rel_day % 14 == 0 and in_flight:
            prompt_records.append({
                "date": current_date.isoformat(),
                "mission_day": rel_day,
                "astronaut_id": aid,
                "prompt_type": "SANS Ocular Ultrasound & Visual Acuity Check",
                "estimated_duration_min": 20,
                "instruction_en": "Perform 2D ultrasound ONSD scan and near-vision chart assessment.",
                "instruction_de": "2D-Ultraschall-Messung des Sehnervs (ONSD) und Sehtest für Nahsicht durchführen.",
                "status": "completed" if tasks_completed else "overdue",
            })
        if is_eva:
            prompt_records.append({
                "date": current_date.isoformat(),
                "mission_day": rel_day,
                "astronaut_id": aid,
                "prompt_type": "EVA Pre-Breathe & Post-EVA Hydration Check",
                "estimated_duration_min": 10,
                "instruction_en": "Verify O2 pre-breathe timer and log 750 mL electrolyte intake post-egress.",
                "instruction_de": "O2-Prebreathe-Timer verifizieren und nach dem EVA 750 mL Elektrolytlösung loggen.",
                "status": "completed" if not anomaly_dcs else "warning_incomplete",
            })

        daily_records.append(row)

    return daily_records, prompt_records


# ---------------------------------------------------------------------------
# High-Frequency Intraday Telemetry Generator (for Live/Dynamic Charts)
# ---------------------------------------------------------------------------

def generate_hourly_telemetry(
    profile: Dict[str, Any],
    base_date: datetime.date,
    days_to_sample: int,
    step_minutes: int,
    include_anomalies: bool,
    rng: random.Random,
) -> List[Dict[str, Any]]:
    """
    Generates intraday circadian & activity-driven vital telemetry (e.g., every 15 or 60 min)
    including a simulated cabin hypoxia/CO2 spike and an EVA excursion.
    """
    records: List[Dict[str, Any]] = []
    aid = profile["astronaut_id"]
    steps_per_day = int((24 * 60) / step_minutes)

    for d in range(days_to_sample):
        day_date = base_date + datetime.timedelta(days=d)
        is_eva_day = (d == days_to_sample - 2)
        is_co2_event_day = include_anomalies and (d == 1)

        for s in range(steps_per_day):
            minute_of_day = s * step_minutes
            hour = minute_of_day / 60.0
            ts = datetime.datetime.combine(day_date, datetime.time(0, 0)) + datetime.timedelta(minutes=minute_of_day)

            # Circadian phase (sleep 22:30 - 06:00, exercise 10:00 - 11:30, EVA 13:00 - 17:30)
            is_sleeping = (hour >= 22.5 or hour < 6.0)
            is_exercise = (10.0 <= hour < 11.5) and not is_eva_day
            is_eva_active = is_eva_day and (13.0 <= hour < 17.5)

            circadian_hr_offset = -9.0 if is_sleeping else (4.0 * math.sin((hour - 8.0) * math.pi / 14.0))
            activity_hr = 68.0 if is_exercise else (38.0 if is_eva_active else 0.0)
            hr = round(clamp(profile["baseline_hr"] + circadian_hr_offset + activity_hr + noise(rng, 2.2), 44.0, 172.0), 1)

            # Cabin / Suit environment
            co2_spike = (0.38 if (is_co2_event_day and 14.0 <= hour <= 18.0) else 0.0)
            o2_drop = (-2.6 if (is_co2_event_day and 14.0 <= hour <= 18.0) else 0.0)
            pp_o2 = round(clamp(21.2 + o2_drop + noise(rng, 0.12), 16.5, 22.5), 2)
            pp_co2 = round(clamp(0.35 + co2_spike + noise(rng, 0.02), 0.20, 0.95), 3)
            suit_pressure = 29.6 if is_eva_active else 101.3

            spo2 = round(clamp(98.2 - (4.5 if co2_spike > 0 else 0.0) - (0.8 if is_eva_active else 0.0) + noise(rng, 0.35), 88.0, 100.0), 1)
            resp = round(clamp((12.0 if is_sleeping else 15.5) + (11.0 if is_exercise else 0.0) + (7.0 if is_eva_active else 0.0) + (3.5 if co2_spike > 0 else 0.0) + noise(rng, 0.8), 10.0, 34.0), 1)
            core_temp = round(clamp(36.6 + (0.4 * math.sin((hour - 9.0) * math.pi / 12.0)) + (0.7 if is_exercise or is_eva_active else 0.0) + noise(rng, 0.08), 36.1, 38.6), 2)
            light_lux = 0.0 if is_sleeping else (450.0 if 7.0 <= hour <= 19.0 else 120.0)
            if is_eva_active:
                light_lux = 2500.0

            records.append({
                "timestamp_utc": ts.isoformat() + "Z",
                "astronaut_id": aid,
                "environment": "ROVER_EVA" if is_eva_active else "SPACE_STATION",
                "activity_state": "EVA" if is_eva_active else ("EXERCISE" if is_exercise else ("SLEEP" if is_sleeping else "NOMINAL_OPS")),
                "heart_rate_bpm": hr,
                "spo2_pct": spo2,
                "respiration_rate_bpm": resp,
                "core_temp_c": core_temp,
                "cabin_ppo2_kPa": pp_o2,
                "cabin_ppco2_kPa": pp_co2,
                "ambient_pressure_kPa": suit_pressure,
                "actigraphy_light_lux": round(max(0.0, light_lux + noise(rng, 15.0)), 1),
            })

    return records


# ---------------------------------------------------------------------------
# Export Utilities
# ---------------------------------------------------------------------------

def flatten_daily_record_for_csv(rec: Dict[str, Any]) -> Dict[str, Any]:
    flat = {}
    for k, v in rec.items():
        if k == "risk_statuses":
            for rk, rv in v.items():
                flat[f"status_{rk}"] = rv
        elif k == "gamification":
            for gk, gv in v.items():
                flat[f"gamification_{gk}"] = gv
        elif k == "active_alerts":
            flat["active_alert_count"] = len(v)
            flat["active_alert_risks"] = ";".join(a["risk_id"] for a in v)
        else:
            flat[k] = v
    return flat


def write_csv(path: Path, rows: List[Dict[str, Any]]) -> None:
    if not rows:
        return
    fieldnames = list(rows[0].keys())
    with path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Generate realistic NASA Standard Measures & Health Monitor time-series datasets."
    )
    parser.add_argument("--out-dir", type=str, default="./generated_data", help="Output directory for JSON and CSV files.")
    parser.add_argument("--preflight-days", type=int, default=14, help="Number of pre-flight baseline days.")
    parser.add_argument("--flight-days", type=int, default=120, help="Number of in-flight mission days.")
    parser.add_argument("--postflight-days", type=int, default=14, help="Number of post-flight recovery days.")
    parser.add_argument("--telemetry-days", type=int, default=4, help="Number of days for high-frequency intraday telemetry.")
    parser.add_argument("--telemetry-step-min", type=int, default=15, help="Interval in minutes for intraday telemetry.")
    parser.add_argument("--seed", type=int, default=42, help="Random seed for reproducible generation.")
    parser.add_argument("--no-anomalies", action="store_true", help="Disable injected realistic anomaly events.")
    args = parser.parse_args()

    rng = random.Random(args.seed)
    out_dir = Path(args.out_dir).resolve()
    out_dir.mkdir(parents=True, exist_ok=True)

    mission_launch_date = datetime.date(2026, 11, 1)
    include_anomalies = not args.no_anomalies

    all_daily: List[Dict[str, Any]] = []
    all_prompts: List[Dict[str, Any]] = []
    all_intraday: List[Dict[str, Any]] = []

    for profile in ASTRONAUT_PROFILES:
        daily, prompts = simulate_astronaut_mission(
            profile=profile,
            start_date=mission_launch_date,
            preflight_days=args.preflight_days,
            flight_days=args.flight_days,
            postflight_days=args.postflight_days,
            include_anomalies=include_anomalies,
            rng=rng,
        )
        all_daily.extend(daily)
        all_prompts.extend(prompts)

        intraday = generate_hourly_telemetry(
            profile=profile,
            base_date=mission_launch_date + datetime.timedelta(days=54),
            days_to_sample=args.telemetry_days,
            step_minutes=args.telemetry_step_min,
            include_anomalies=include_anomalies,
            rng=rng,
        )
        all_intraday.extend(intraday)

    # 1. Write full JSON bundle (ideal for frontend mockups / REST API seed)
    bundle = {
        "metadata": {
            "generated_at_utc": datetime.datetime.now(datetime.timezone.utc).isoformat(),
            "seed": args.seed,
            "anomalies_included": include_anomalies,
            "mission_launch_date": mission_launch_date.isoformat(),
            "timeline": {
                "preflight_days": args.preflight_days,
                "flight_days": args.flight_days,
                "postflight_days": args.postflight_days,
            },
            "scientific_references": [
                "Hardy et al. (2025) - Spaceflight Standard Measures (npj Microgravity)",
                "Lee et al. (2025) - Cardiovascular responses & compression garments",
                "Zwart et al. (2022) - Albumin, oral contraceptives, and VTE risk",
                "Clément et al. (2022) - Sensorimotor & vestibular mission-critical tasks",
                "Dev et al. (2024) - Cognitive performance on 6-month ISS missions",
                "Walle et al. (2024) - Spaceflight-induced bone remodeling (Sci. Adv.)",
            ],
        },
        "risk_definitions": RISK_DEFINITIONS,
        "astronauts": ASTRONAUT_PROFILES,
        "daily_timeseries": all_daily,
        "measurement_prompts": all_prompts,
        "intraday_telemetry": all_intraday,
    }

    json_path = out_dir / "astronaut_health_dataset.json"
    with json_path.open("w", encoding="utf-8") as f:
        json.dump(bundle, f, indent=2, ensure_ascii=False)

    # 2. Write flattened CSVs
    daily_csv_path = out_dir / "daily_health_metrics.csv"
    write_csv(daily_csv_path, [flatten_daily_record_for_csv(r) for r in all_daily])

    intraday_csv_path = out_dir / "intraday_vitals_telemetry.csv"
    write_csv(intraday_csv_path, all_intraday)

    prompts_csv_path = out_dir / "measurement_prompts.csv"
    write_csv(prompts_csv_path, all_prompts)

    # Summary stats
    alert_counts = {"green": 0, "yellow": 0, "red": 0}
    for r in all_daily:
        for st in r["risk_statuses"].values():
            alert_counts[st] += 1

    print(f"Generated dataset successfully in: {out_dir}")
    print(f"  - Astronauts: {len(ASTRONAUT_PROFILES)}")
    print(f"  - Daily records: {len(all_daily)} -> {daily_csv_path.name}")
    print(f"  - Intraday telemetry points: {len(all_intraday)} -> {intraday_csv_path.name}")
    print(f"  - Measurement prompts: {len(all_prompts)} -> {prompts_csv_path.name}")
    print(f"  - Full JSON bundle: {json_path.name} ({json_path.stat().st_size / 1024:.1f} KB)")
    print(f"  - Risk status distribution across all days & risks: {alert_counts}")


if __name__ == "__main__":
    main()
