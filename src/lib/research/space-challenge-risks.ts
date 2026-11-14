export interface OsdrRiskStudy {
  riskNumber: number;
  riskKey: string;
  riskNameEn: string;
  riskNameDe: string;
  osdId: string;
  studyTitle: string;
  contentAndMetrics: string;
  restApiMetaUrl: string;
  restApiFilesUrl: string;
  nlspReferenceStudy: string;
}

export interface SpaceflightRiskDefinition {
  riskNumber: number;
  key: string;
  nameEn: string;
  nameDe: string;
  category: 'eva_surface' | 'microgravity_longterm' | 'environment_immune';
  summaryEn: string;
  summaryDe: string;
  howToMeasureEn: string;
  promptTitleEn: string;
  promptInterval: string;
  countermeasureWatch: string[];
  countermeasureAct: string[];
  primaryMetrics: {
    key: string;
    label: string;
    unit: string;
    normalRange: string;
  }[];
  studies: OsdrRiskStudy[];
}

export const SIMULATED_DATASETS = [
  {
    id: 'daily_health_metrics',
    name: 'Simulated Crew Daily Health Metrics (AST-01, AST-02, AST-03 · 444 days)',
    path: '/generated_data/daily_health_metrics.csv',
    description: 'Longitudinal daily time-series across Pre-Flight, Orbital Station, Lunar Base, Rover EVA, and Post-Flight Recovery covering all 11 spaceflight risks.',
  },
  {
    id: 'intraday_vitals_telemetry',
    name: 'High-Frequency Intraday Vitals & Cabin Telemetry (15-min intervals · 1,152 records)',
    path: '/generated_data/intraday_vitals_telemetry.csv',
    description: 'Circadian heart rate, SpO₂, respiration, core temp, cabin ppO₂/ppCO₂, suit pressure, and actigraphy light lux including simulated CO₂ spike and EVA.',
  },
  {
    id: 'measurement_prompts',
    name: 'Astronaut Mission Measurement Prompts & Compliance Log (105 records)',
    path: '/generated_data/measurement_prompts.csv',
    description: 'Scheduled Cognition Battery, SANS Ocular Ultrasound, and EVA Pre-Breathe prompt records across the mission timeline.',
  },
  {
    id: 'osdr_studies_risks',
    name: 'Curated NASA OSDR Studies & 11 Risks Mapping (20 study records)',
    path: '/generated_data/osdr_studies_risks.csv',
    description: 'Reference table linking the 11 NASA Space Challenge risks to OSD-xxx study accessions, biomarkers, and NASA Standard Measures.',
  },
] as const;

export const OSDR_RISK_STUDIES: OsdrRiskStudy[] = [
  {
    riskNumber: 1,
    riskKey: 'immune_response',
    riskNameEn: 'Altered Immune System Responses',
    riskNameDe: 'Veränderte Immunantwort',
    osdId: 'OSD-569',
    studyTitle: 'Inspiration4 Crew Whole Blood RNA-Seq & CBC',
    contentAndMetrics: 'Differenzialblutbild (CBC: Leukozyten, Lymphozyten, Thrombozyten), RNA-Sequenzierung',
    restApiMetaUrl: 'https://osdr.nasa.gov/osdr/data/osd/meta/OSD-569',
    restApiFilesUrl: 'https://osdr.nasa.gov/osdr/data/osd/files/OSD-569',
    nlspReferenceStudy: 'Integrated Immune / Standard Measures (Cellular Profile)',
  },
  {
    riskNumber: 1,
    riskKey: 'immune_response',
    riskNameEn: 'Altered Immune System Responses',
    riskNameDe: 'Veränderte Immunantwort',
    osdId: 'OSD-575',
    studyTitle: 'Inspiration4 Serum Cytokine Array & Metabolomics',
    contentAndMetrics: 'Multiplex-Zytokine (IL-6, TNF-alpha, IFN-gamma), Entzündungsbiomarker',
    restApiMetaUrl: 'https://osdr.nasa.gov/osdr/data/osd/meta/OSD-575',
    restApiFilesUrl: 'https://osdr.nasa.gov/osdr/data/osd/files/OSD-575',
    nlspReferenceStudy: 'Integrated Immune / Standard Measures',
  },
  {
    riskNumber: 1,
    riskKey: 'immune_response',
    riskNameEn: 'Altered Immune System Responses',
    riskNameDe: 'Veränderte Immunantwort',
    osdId: 'OSD-687',
    studyTitle: 'Inspiration4 T-Cell Histone Modification Profiling',
    contentAndMetrics: 'T-Zell-Differenzierung, epigenetische Histonmodifikationen unter Schwerelosigkeit',
    restApiMetaUrl: 'https://osdr.nasa.gov/osdr/data/osd/meta/OSD-687',
    restApiFilesUrl: 'https://osdr.nasa.gov/osdr/data/osd/files/OSD-687',
    nlspReferenceStudy: 'Standard Measures (Cellular Profile)',
  },
  {
    riskNumber: 2,
    riskKey: 'sensorimotor_vestibular',
    riskNameEn: 'Altered Sensorimotor and Vestibular Function',
    riskNameDe: 'Sensorimotorische & Vestibuläre Störungen',
    osdId: 'OSD-473',
    studyTitle: 'Otolith and Neuromuscular Locomotor Models',
    contentAndMetrics: 'Gleichgewichtsadaption, Otolithenreizung, neuromuskuläre Bewegungskontrolle',
    restApiMetaUrl: 'https://osdr.nasa.gov/osdr/data/osd/meta/OSD-473',
    restApiFilesUrl: 'https://osdr.nasa.gov/osdr/data/osd/files/OSD-473',
    nlspReferenceStudy: 'Functional Task Test (FTT) / Field Test (Sit-to-stand, Tandem-walk)',
  },
  {
    riskNumber: 3,
    riskKey: 'cardiovascular',
    riskNameEn: 'Cardiovascular Adaptations',
    riskNameDe: 'Kardiovaskuläre Anpassung & Thromboserisiko (VTE)',
    osdId: 'OSD-575',
    studyTitle: 'Inspiration4 Serum Cardiovascular Biomarkers',
    contentAndMetrics: 'Troponin, kardiovaskuläre Proteine, Transferrin (VTE-Risikofaktor)',
    restApiMetaUrl: 'https://osdr.nasa.gov/osdr/data/osd/meta/OSD-575',
    restApiFilesUrl: 'https://osdr.nasa.gov/osdr/data/osd/files/OSD-575',
    nlspReferenceStudy: 'Integrated Cardiovascular / CCISS / Biochemical Profile',
  },
  {
    riskNumber: 3,
    riskKey: 'cardiovascular',
    riskNameEn: 'Cardiovascular Adaptations',
    riskNameDe: 'Kardiovaskuläre Anpassung & Thromboserisiko (VTE)',
    osdId: 'OSD-635',
    studyTitle: 'Human Aortic Smooth Muscle Cells in Microgravity',
    contentAndMetrics: 'Gefäßendothel-Veränderungen, arterielle Elastizität, Wandschubspannung',
    restApiMetaUrl: 'https://osdr.nasa.gov/osdr/data/osd/meta/OSD-635',
    restApiFilesUrl: 'https://osdr.nasa.gov/osdr/data/osd/files/OSD-635',
    nlspReferenceStudy: 'Biochemical Profile (Serum Albumin & Hematocrit)',
  },
  {
    riskNumber: 3,
    riskKey: 'cardiovascular',
    riskNameEn: 'Cardiovascular Adaptations',
    riskNameDe: 'Kardiovaskuläre Anpassung & Thromboserisiko (VTE)',
    osdId: 'OSD-435',
    studyTitle: 'Human Induced Pluripotent Stem Cell Cardiomyocytes',
    contentAndMetrics: 'Kontraktilität, elektrophysiologische Funktion von Kardiomyozyten auf der ISS',
    restApiMetaUrl: 'https://osdr.nasa.gov/osdr/data/osd/meta/OSD-435',
    restApiFilesUrl: 'https://osdr.nasa.gov/osdr/data/osd/files/OSD-435',
    nlspReferenceStudy: 'Integrated Cardiovascular (Holter EKG, Finapres BP)',
  },
  {
    riskNumber: 4,
    riskKey: 'decompression_sickness',
    riskNameEn: 'Decompression Sickness',
    riskNameDe: 'Dekompressionskrankheit (DCS)',
    osdId: 'OSD-684',
    studyTitle: 'Microvascular Response to Decompression Stress',
    contentAndMetrics: 'Mikrovaskuläre Endothelbelastung, Gasbläschen-induzierte vaskuläre Stressmarker',
    restApiMetaUrl: 'https://osdr.nasa.gov/osdr/data/osd/meta/OSD-684',
    restApiFilesUrl: 'https://osdr.nasa.gov/osdr/data/osd/files/OSD-684',
    nlspReferenceStudy: 'Prebreathe Reduction Program (PRP) (Doppler VGE Scores)',
  },
  {
    riskNumber: 5,
    riskKey: 'host_microorganism',
    riskNameEn: 'Host-Microorganism Interactions',
    riskNameDe: 'Wirt-Mikroorganismus-Interaktionen',
    osdId: 'OSD-630',
    studyTitle: 'Inspiration4 Stool Metagenomics',
    contentAndMetrics: 'Darmmikrobiom-Diversität (Shannon-Index), relative Häufigkeiten, Dysbiose',
    restApiMetaUrl: 'https://osdr.nasa.gov/osdr/data/osd/meta/OSD-630',
    restApiFilesUrl: 'https://osdr.nasa.gov/osdr/data/osd/files/OSD-630',
    nlspReferenceStudy: 'Microbial Tracking / Standard Measures (Microbiome)',
  },
  {
    riskNumber: 5,
    riskKey: 'host_microorganism',
    riskNameEn: 'Host-Microorganism Interactions',
    riskNameDe: 'Wirt-Mikroorganismus-Interaktionen',
    osdId: 'OSD-572',
    studyTitle: 'Inspiration4 Skin Swab Metagenomics',
    contentAndMetrics: 'Hautmikrobiom-Verschiebungen, Schutzbarriere der Epidermis',
    restApiMetaUrl: 'https://osdr.nasa.gov/osdr/data/osd/meta/OSD-572',
    restApiFilesUrl: 'https://osdr.nasa.gov/osdr/data/osd/files/OSD-572',
    nlspReferenceStudy: 'Microbial Tracking / SWAB',
  },
  {
    riskNumber: 5,
    riskKey: 'host_microorganism',
    riskNameEn: 'Host-Microorganism Interactions',
    riskNameDe: 'Wirt-Mikroorganismus-Interaktionen',
    osdId: 'OSD-574',
    studyTitle: 'Inspiration4 Nasal Swab Metagenomics',
    contentAndMetrics: 'Besiedlung der Nasenschleimhaut, Überwachung opportunistischer Pathogene (z. B. MRSA)',
    restApiMetaUrl: 'https://osdr.nasa.gov/osdr/data/osd/meta/OSD-574',
    restApiFilesUrl: 'https://osdr.nasa.gov/osdr/data/osd/files/OSD-574',
    nlspReferenceStudy: 'Microbial Tracking / Hygiene Survey',
  },
  {
    riskNumber: 6,
    riskKey: 'hypoxia',
    riskNameEn: 'Hypoxia',
    riskNameDe: 'Hypoxie & Atemgas-Belastung',
    osdId: 'OSD-254',
    studyTitle: 'Cellular Responses to Hypoxia and Altered Gas Pressure',
    contentAndMetrics: 'Zelluläre Antwort auf veränderten Sauerstoffpartialdruck (ppO2) und Hypoxie-induzierte Marker',
    restApiMetaUrl: 'https://osdr.nasa.gov/osdr/data/osd/meta/OSD-254',
    restApiFilesUrl: 'https://osdr.nasa.gov/osdr/data/osd/files/OSD-254',
    nlspReferenceStudy: 'VaPER / AGBRESA Bed Rest with elevated CO2',
  },
  {
    riskNumber: 7,
    riskKey: 'nutrition',
    riskNameEn: 'Inadequate Food and Nutrition',
    riskNameDe: 'Unzureichende Ernährung & Hydratation',
    osdId: 'OSD-575',
    studyTitle: 'Inspiration4 Serum Metabolic & Nutritional Profile',
    contentAndMetrics: 'Metabolische Panels (Glukose, Lipide, Elektrolyte, Mineralstoffe, Vitaminstatus)',
    restApiMetaUrl: 'https://osdr.nasa.gov/osdr/data/osd/meta/OSD-575',
    restApiFilesUrl: 'https://osdr.nasa.gov/osdr/data/osd/files/OSD-575',
    nlspReferenceStudy: 'Nutritional Status Assessment (Vitamin D, Ferritin, Iron)',
  },
  {
    riskNumber: 7,
    riskKey: 'nutrition',
    riskNameEn: 'Inadequate Food and Nutrition',
    riskNameDe: 'Unzureichende Ernährung & Nierensteinrisiko',
    osdId: 'OSD-656',
    studyTitle: 'Inspiration4 Urine Proteomics & Inflammation Panel',
    contentAndMetrics: 'Urin-Proteine, Entzündungsmarker, Nierensteinrisikoprofil (Oxalat, Harnsäure)',
    restApiMetaUrl: 'https://osdr.nasa.gov/osdr/data/osd/meta/OSD-656',
    restApiFilesUrl: 'https://osdr.nasa.gov/osdr/data/osd/files/OSD-656',
    nlspReferenceStudy: 'Nutritional Biochemistry (24h Urine Void Pool)',
  },
  {
    riskNumber: 8,
    riskKey: 'eva_injury_performance',
    riskNameEn: 'Injury and Compromised Performance from Spacewalks',
    riskNameDe: 'Verletzungsrisiko & Leistungseinbußen bei EVAs',
    osdId: 'OSD-474',
    studyTitle: 'Musculoskeletal Strain and Biomechanics in Extreme Environments',
    contentAndMetrics: 'Muskuläre Überlastung, Handgriff-Ermüdung, thermische Belastung',
    restApiMetaUrl: 'https://osdr.nasa.gov/osdr/data/osd/meta/OSD-474',
    restApiFilesUrl: 'https://osdr.nasa.gov/osdr/data/osd/files/OSD-474',
    nlspReferenceStudy: 'EVA Glove Study / Biomechanics of Extravehicular Activity',
  },
  {
    riskNumber: 9,
    riskKey: 'fitness_deconditioning',
    riskNameEn: 'Reduced Cardiorespiratory and Musculoskeletal Fitness',
    riskNameDe: 'Reduzierte Kardiorespiratorische & Muskuläre Fitness',
    osdId: 'OSD-608',
    studyTitle: 'ALSDA Skeletal and Muscular Unloading Study',
    contentAndMetrics: 'Muskelatrophie, Kraftverlust, funktionelle Fasertyp-Verschiebung bei Inaktivität',
    restApiMetaUrl: 'https://osdr.nasa.gov/osdr/data/osd/meta/OSD-608',
    restApiFilesUrl: 'https://osdr.nasa.gov/osdr/data/osd/files/OSD-608',
    nlspReferenceStudy: 'Sprint Study (VO2max, CEVIS Ergometer) / IMTP Force',
  },
  {
    riskNumber: 9,
    riskKey: 'fitness_deconditioning',
    riskNameEn: 'Reduced Cardiorespiratory and Musculoskeletal Fitness',
    riskNameDe: 'Reduzierte Kardiorespiratorische & Muskuläre Fitness',
    osdId: 'OSD-612',
    studyTitle: 'Skeletal Muscle Tissue Plasticity in Microgravity',
    contentAndMetrics: 'Molekulare Signalwege des Muskelabbaus und Gegenmaßnahmen-Einfluss',
    restApiMetaUrl: 'https://osdr.nasa.gov/osdr/data/osd/meta/OSD-612',
    restApiFilesUrl: 'https://osdr.nasa.gov/osdr/data/osd/files/OSD-612',
    nlspReferenceStudy: 'ZeroT2 / Advanced Resistive Exercise Device (ARED)',
  },
  {
    riskNumber: 10,
    riskKey: 'sans_neuroocular',
    riskNameEn: 'Spaceflight Associated Neuroocular Syndrome',
    riskNameDe: 'Spaceflight-Associated Neuro-ocular Syndrome (SANS)',
    osdId: 'OSD-569',
    studyTitle: 'Inspiration4 Vascular & Ocular Permeability Biomarkers',
    contentAndMetrics: 'Blut-Hirn-Schranken-Integrität, vaskuläre Biomarker, Korrelation zu Druckverschiebungen',
    restApiMetaUrl: 'https://osdr.nasa.gov/osdr/data/osd/meta/OSD-569',
    restApiFilesUrl: 'https://osdr.nasa.gov/osdr/data/osd/files/OSD-569',
    nlspReferenceStudy: 'Fluid Shifts (ONSD Ultrasound, OCT Retinal Thickness, IOP)',
  },
  {
    riskNumber: 11,
    riskKey: 'bone_changes',
    riskNameEn: 'Spaceflight-induced Bone Changes',
    riskNameDe: 'Raumflug-induzierter Knochenabbau',
    osdId: 'OSD-608',
    studyTitle: 'ALSDA Bone Unloading & Microstructural Loss',
    contentAndMetrics: 'Quantitative CT-Knochendichte (BMD), Verlust von Knochentrabekeln',
    restApiMetaUrl: 'https://osdr.nasa.gov/osdr/data/osd/meta/OSD-608',
    restApiFilesUrl: 'https://osdr.nasa.gov/osdr/data/osd/files/OSD-608',
    nlspReferenceStudy: 'Bone Densitometry (DXA) / HR-pQCT Tibia (Walle et al. 2024)',
  },
  {
    riskNumber: 11,
    riskKey: 'bone_changes',
    riskNameEn: 'Spaceflight-induced Bone Changes',
    riskNameDe: 'Raumflug-induzierter Knochenabbau',
    osdId: 'OSD-612',
    studyTitle: 'Rodent Research-10: Bone Tissue Regeneration',
    contentAndMetrics: 'Molekulare Marker für Osteoklasten-Resorption vs. Osteoblasten-Knochenbildung',
    restApiMetaUrl: 'https://osdr.nasa.gov/osdr/data/osd/meta/OSD-612',
    restApiFilesUrl: 'https://osdr.nasa.gov/osdr/data/osd/files/OSD-612',
    nlspReferenceStudy: 'Biochemical Markers (Serum CTx, BSAP, Osteocalcin)',
  },
];

export function getStudiesForRisk(riskNumberOrKey: number | string): OsdrRiskStudy[] {
  return OSDR_RISK_STUDIES.filter(s =>
    typeof riskNumberOrKey === 'number'
      ? s.riskNumber === riskNumberOrKey
      : s.riskKey === riskNumberOrKey,
  );
}

export function getUniqueCuratedAccessions(): string[] {
  return [...new Set(OSDR_RISK_STUDIES.map(s => s.osdId))];
}

export const SPACE_CHALLENGE_RISKS: SpaceflightRiskDefinition[] = [
  {
    riskNumber: 1,
    key: 'immune_response',
    nameEn: 'Altered Immune System Responses',
    nameDe: 'Veränderte Immunantwort',
    category: 'environment_immune',
    summaryEn: 'Microgravity, radiation, and operational stress dysregulate T-cell immunity, increase systemic inflammation (hs-CRP), and can reactivate latent viruses (EBV).',
    summaryDe: 'Mikrogravitation, Strahlung und Stress verändern die Immunabwehr, erhöhen Entzündungsmarker (hsCRP) und können latente Viren (EBV) reaktivieren.',
    howToMeasureEn: 'Log oral/tympanic body temperature, fatigue (1–10), skin rash or airway symptoms, and finger-stick hs-CRP / T-cell immune assay.',
    promptTitleEn: 'Immune & Symptom Biomarker Check',
    promptInterval: 'Weekly + on symptom onset',
    countermeasureWatch: [
      'Prioritize 7+ hours of circadian-aligned sleep and reduce peak workload stress.',
      'Re-measure body temperature after 2 hours and log any skin or mucosal changes.',
    ],
    countermeasureAct: [
      'Contact the flight surgeon for viral reactivation / inflammatory workup.',
      'Consider crew isolation protocol if infectious symptoms accompany fever (≥38.0 °C).',
    ],
    primaryMetrics: [
      { key: 'temp', label: 'Body temperature', unit: '°C', normalRange: '36.1–37.4 °C' },
      { key: 'hsCrp', label: 'hs-CRP inflammation', unit: 'mg/L', normalRange: '< 1.8 mg/L' },
      { key: 'tCellPct', label: 'T-cell function index', unit: '%', normalRange: '≥ 75%' },
    ],
    studies: getStudiesForRisk(1),
  },
  {
    riskNumber: 2,
    key: 'sensorimotor_vestibular',
    nameEn: 'Altered Sensorimotor and Vestibular Function',
    nameDe: 'Sensorimotorische & Vestibuläre Störungen',
    category: 'eva_surface',
    summaryEn: 'Gravity transitions (0G ↔ 0.16G Lunar / 0.38G Mars / 1G Earth) disrupt otolith signaling, eye-head coordination, postural stability, and locomotion.',
    summaryDe: 'Gravitationswechsel (0G ↔ 0.16G/1G) beeinträchtigen Gleichgewicht, räumliche Orientierung und Koordination.',
    howToMeasureEn: 'Perform the Functional Task Test (Sit-to-Stand timed test and Tandem Walk with eyes closed) and rate motion sickness (0–20).',
    promptTitleEn: 'Vestibular & Balance Field Test (Sit-to-Stand / Tandem Walk)',
    promptInterval: 'Pre/Post Gravity Transition & Weekly',
    countermeasureWatch: [
      'Use slow, controlled head movements and visual reference cues during posture changes.',
      'Complete daily balance and proprioceptive stabilization drills.',
    ],
    countermeasureAct: [
      'Delay critical surface EVA or unassisted egress until vestibular stability improves.',
      'Consult flight surgeon for anti-motion-sickness countermeasure protocol.',
    ],
    primaryMetrics: [
      { key: 'sitToStandS', label: 'Sit-to-Stand time', unit: 's', normalRange: '≤ 2.6 s' },
      { key: 'tandemWalkPct', label: 'Tandem walk (eyes closed)', unit: '%', normalRange: '≥ 65%' },
      { key: 'motionSickness', label: 'Motion sickness score', unit: '/20', normalRange: '0–3 /20' },
    ],
    studies: getStudiesForRisk(2),
  },
  {
    riskNumber: 3,
    key: 'cardiovascular',
    nameEn: 'Cardiovascular Adaptations',
    nameDe: 'Kardiovaskuläre Anpassung & Thromboserisiko (VTE)',
    category: 'microgravity_longterm',
    summaryEn: 'Cephalad fluid shift and plasma volume loss lead to orthostatic intolerance upon gravity reloading. Low serum albumin (<3.5 g/dL) increases venous thromboembolism (VTE) risk.',
    summaryDe: 'Flüssigkeitsverschiebungen verursachen orthostatische Intoleranz bei Schwerkraftwechsel. Niedriges Serum-Albumin (<3.5 g/dL) erhöht das Thromboserisiko.',
    howToMeasureEn: 'Measure resting heart rate and blood pressure after 5 min rest, orthostatic ΔHR (supine-to-stand), and biochemical serum albumin.',
    promptTitleEn: 'Orthostatic Vitals & Venous / Albumin Screening',
    promptInterval: 'Daily vitals + Bi-weekly biochemical panel',
    countermeasureWatch: [
      'Increase fluid and electrolyte loading; repeat resting BP/HR measurement after 30 minutes.',
      'Prepare Lower Body Gradient Compression Garments (GCG) before gravity transitions.',
    ],
    countermeasureAct: [
      'Contact flight surgeon immediately; pause high-strain exercise and record 12-lead ECG.',
      'Perform jugular venous ultrasound screening if serum albumin < 3.5 g/dL.',
    ],
    primaryMetrics: [
      { key: 'hr', label: 'Resting heart rate', unit: 'bpm', normalRange: '50–80 bpm' },
      { key: 'orthoDeltaHr', label: 'Orthostatic ΔHR', unit: 'bpm', normalRange: '≤ +14 bpm' },
      { key: 'albumin', label: 'Serum albumin', unit: 'g/dL', normalRange: '≥ 3.8 g/dL' },
    ],
    studies: getStudiesForRisk(3),
  },
  {
    riskNumber: 4,
    key: 'decompression_sickness',
    nameEn: 'Decompression Sickness',
    nameDe: 'Dekompressionskrankheit (DCS)',
    category: 'eva_surface',
    summaryEn: 'Transitioning from cabin pressure (101.3 kPa) to lower EVA suit pressure (~29.6 kPa) causes dissolved nitrogen to form microvascular venous gas emboli (VGE) if denitrogenation is incomplete.',
    summaryDe: 'Der Druckabfall vom Habitat zum Raumanzug (~29.6 kPa) kann bei unzureichendem O2-Prebreathe Stickstoffbläschen im Gewebe auslösen.',
    howToMeasureEn: 'Track 100% O₂ pre-breathe duration (min), EVA suit differential pressure (kPa), calculated Tissue Nitrogen Ratio, and post-EVA Doppler VGE check.',
    promptTitleEn: 'EVA O₂ Pre-Breathe & Decompression Safety Verification',
    promptInterval: 'Mandatory prior to every EVA depressurization',
    countermeasureWatch: [
      'Extend 100% O₂ pre-breathe protocol and include mild cycle-ergometer denitrogenation exercise.',
      'Monitor for joint pain ("bends"), skin mottling, or paresthesia during airlock depressurization.',
    ],
    countermeasureAct: [
      'Abort EVA depressurization immediately or re-pressurize airlock to cabin pressure.',
      'Administer 100% O₂ hyperbaric therapy and notify ground medical control.',
    ],
    primaryMetrics: [
      { key: 'o2PrebreatheMin', label: 'O₂ pre-breathe time', unit: 'min', normalRange: '≥ 120 min (for 29.6 kPa suit)' },
      { key: 'tissueN2Ratio', label: 'Tissue N₂ supersaturation ratio', unit: 'ratio', normalRange: '< 1.35' },
      { key: 'dcsRiskIndex', label: 'DCS risk index', unit: '/100', normalRange: '< 35 /100' },
    ],
    studies: getStudiesForRisk(4),
  },
  {
    riskNumber: 5,
    key: 'host_microorganism',
    nameEn: 'Host-Microorganism Interactions',
    nameDe: 'Wirt-Mikroorganismus-Interaktionen',
    category: 'environment_immune',
    summaryEn: 'Closed habitats and spaceflight diet reduce gut microbiome α-diversity (Shannon index) while shifting skin and nasal flora toward opportunistic pathogens.',
    summaryDe: 'Geschlossene Habitate und veränderte Ernährung reduzieren die Darmmikrobiom-Diversität und begünstigen Haut-/Schleimhautinfektionen.',
    howToMeasureEn: 'Complete scheduled skin/nasal microbial swabs, stool metagenomic sampling, and daily GI/skin barrier symptom checks.',
    promptTitleEn: 'Crew Microbiome Swab & Habitat Hygiene Protocol',
    promptInterval: 'Weekly skin/nasal swab & daily hygiene check',
    countermeasureWatch: [
      'Increase prebiotic dietary fiber and probiotic intake; apply barrier emollient to dry skin.',
      'Sanitize high-touch cabin surfaces, exercise handles, and personal headset equipment.',
    ],
    countermeasureAct: [
      'Collect targeted microbial swab for on-orbit PCR identification and consult flight surgeon.',
      'Initiate targeted topical or systemic antimicrobial protocol per medical kit guidance.',
    ],
    primaryMetrics: [
      { key: 'gutShannon', label: 'Gut Shannon diversity index', unit: 'H′', normalRange: '≥ 2.95' },
      { key: 'skinDysbiosis', label: 'Skin/nasal dysbiosis index', unit: '0–1', normalRange: '≤ 0.56' },
    ],
    studies: getStudiesForRisk(5),
  },
  {
    riskNumber: 6,
    key: 'hypoxia',
    nameEn: 'Hypoxia',
    nameDe: 'Hypoxie & Atemgas-Belastung',
    category: 'environment_immune',
    summaryEn: 'Reduced cabin or EVA suit oxygen partial pressure (ppO₂) or elevated carbon dioxide (ppCO₂ / ppm) impairs arterial oxygenation (SpO₂), cognition, and physical performance.',
    summaryDe: 'Abgesunkener Sauerstoffpartialdruck (ppO2) oder erhöhtes CO2 (ppCO2) führt zu Sauerstoffmangel und kognitiven Einbußen.',
    howToMeasureEn: 'Measure pulse oximetry (SpO₂ %) via finger clip and verify habitat/suit ECLSS sensors for ppO₂ (kPa) and CO₂ (ppm / kPa).',
    promptTitleEn: 'SpO₂ Oximetry & ECLSS Atmospheric Gas Check',
    promptInterval: 'Daily + continuous during EVA / low-pressure ops',
    countermeasureWatch: [
      'Inspect ECLSS air ventilation fans, LiOH / CDRA CO₂ scrubbers, and O₂ supply valves.',
      'Avoid stagnant air pockets in crew quarters and reduce physical exertion.',
    ],
    countermeasureAct: [
      'Switch to emergency breathing O₂ loop immediately if SpO₂ < 92% or ppO₂ < 18.4 kPa.',
      'Alert crew and mission control; verify cabin pressure integrity.',
    ],
    primaryMetrics: [
      { key: 'spo2', label: 'Arterial oxygen saturation (SpO₂)', unit: '%', normalRange: '95–100%' },
      { key: 'cabinPpo2', label: 'Cabin / suit ppO₂', unit: 'kPa', normalRange: '19.7–22.5 kPa' },
      { key: 'co2', label: 'Cabin CO₂', unit: 'ppm', normalRange: '≤ 3500 ppm (≤ 0.50 kPa)' },
    ],
    studies: getStudiesForRisk(6),
  },
  {
    riskNumber: 7,
    key: 'nutrition',
    nameEn: 'Inadequate Food and Nutrition',
    nameDe: 'Unzureichende Ernährung & Hydratation',
    category: 'microgravity_longterm',
    summaryEn: 'Spaceflight appetite suppression and menu fatigue cause caloric deficits, dehydration, Vitamin D depletion, and elevated renal stone risk (oxalate/uric acid).',
    summaryDe: 'Appetitverlust und Lagerungslimits begünstigen Kaloriendefizite, Dehydrierung sowie Vitamin-D- und Eisenmangel.',
    howToMeasureEn: 'Log daily meal completion (1–10 / % kcal target), fluid intake (L), fasting blood glucose (mg/dL), and Vitamin D status.',
    promptTitleEn: 'Nutritional Intake, Hydration & Glucose Assessment',
    promptInterval: 'Daily meal/fluid log + morning fasting glucose',
    countermeasureWatch: [
      'Increase water intake to ≥ 2.2 L/day to dilute urinary stone-forming salts.',
      'Take daily 800–1000 IU Vitamin D3 supplement and complete planned caloric rations.',
    ],
    countermeasureAct: [
      'Coordinate high-density nutritional supplementation and renal stone prophylaxis with ground medical.',
      'If fasting blood glucose < 70 mg/dL, consume fast-acting carbohydrates immediately.',
    ],
    primaryMetrics: [
      { key: 'caloriesPct', label: 'Caloric intake vs. target', unit: '%', normalRange: '≥ 85%' },
      { key: 'hydrationL', label: 'Daily hydration', unit: 'L', normalRange: '≥ 1.9 L' },
      { key: 'vitaminD', label: 'Serum Vitamin D (25-OH)', unit: 'ng/mL', normalRange: '≥ 27 ng/mL' },
    ],
    studies: getStudiesForRisk(7),
  },
  {
    riskNumber: 8,
    key: 'eva_injury_performance',
    nameEn: 'Injury and Compromised Performance from Spacewalks',
    nameDe: 'Verletzungsrisiko & Leistungseinbußen bei EVAs',
    category: 'eva_surface',
    summaryEn: 'Working in pressurized EVA gloves and suits produces high forearm/hand-grip fatigue, shoulder joint strain, fingernail delamination, and metabolic heat buildup.',
    summaryDe: 'Druckanzüge und steife Handschuhe verursachen starke Unterarm-Ermüdung, Schulterbelastung und Hitzestress.',
    howToMeasureEn: 'Assess hand-grip dynamometer fatigue (% drop), subjective EVA musculoskeletal strain (1–10), and core body temperature (°C).',
    promptTitleEn: 'EVA Ergonomics, Hand-Grip & Thermal Strain Check',
    promptInterval: 'Pre-EVA baseline, mid-EVA check & Post-EVA recovery',
    countermeasureWatch: [
      'Schedule micro-rests during high-torque tool operations and increase Liquid Cooling & Ventilation Garment (LCVG) flow.',
      'Perform post-EVA forearm, shoulder, and spinal decompression stretches.',
    ],
    countermeasureAct: [
      'Halt high-load EVA translation/tool tasks if core temp > 38.3 °C or grip fatigue > 38%.',
      'Return to airlock for thermal cool-down, hydration, and medical evaluation of joint/hand injury.',
    ],
    primaryMetrics: [
      { key: 'gripFatiguePct', label: 'Hand-grip fatigue drop', unit: '%', normalRange: '≤ 24%' },
      { key: 'evaStrain', label: 'EVA musculoskeletal strain', unit: '/10', normalRange: '< 5.2 /10' },
      { key: 'coreTempC', label: 'Core / suit temperature', unit: '°C', normalRange: '36.2–37.7 °C' },
    ],
    studies: getStudiesForRisk(8),
  },
  {
    riskNumber: 9,
    key: 'fitness_deconditioning',
    nameEn: 'Reduced Cardiorespiratory and Musculoskeletal Fitness',
    nameDe: 'Reduzierte Kardiorespiratorische & Muskuläre Fitness',
    category: 'microgravity_longterm',
    summaryEn: 'Unloading rapidly degrades lower-limb muscle force (Isometric Mid-Thigh Pull) and peak aerobic capacity (VO₂max), threatening physically demanding surface or emergency tasks.',
    summaryDe: 'Fehlende Schwerkraft baut Muskelkraft (IMTP-Test) und Ausdauerleistungsfähigkeit (VO2max) ohne Gegenmaßnahmen schnell ab.',
    howToMeasureEn: 'Log daily exercise minutes (ARED resistive + T2/CEVIS aerobic), ARED load compliance (%), and monthly IMTP / VO₂max performance.',
    promptTitleEn: 'Countermeasure Exercise & Isometric Force (IMTP) Log',
    promptInterval: 'Daily exercise log + monthly IMTP / VO₂max check',
    countermeasureWatch: [
      'Complete full daily countermeasure block (target ~120 min in 0G, adjusted for partial gravity).',
      'Ensure high-intensity interval aerobic protocol (Sprint) and adequate post-workout protein.',
    ],
    countermeasureAct: [
      'Revise resistive loading prescription with ground exercise physiologist and flight surgeon.',
      'Restrict high-exertion surface EVA timelines until strength/aerobic thresholds recover.',
    ],
    primaryMetrics: [
      { key: 'ex', label: 'Daily exercise duration', unit: 'min', normalRange: '≥ 60–120 min (mission-scaled)' },
      { key: 'imtpChangePct', label: 'IMTP peak force vs. baseline', unit: '%', normalRange: '≥ -8%' },
      { key: 'vo2ChangePct', label: 'VO₂max vs. baseline', unit: '%', normalRange: '≥ -8%' },
    ],
    studies: getStudiesForRisk(9),
  },
  {
    riskNumber: 10,
    key: 'sans_neuroocular',
    nameEn: 'Spaceflight Associated Neuroocular Syndrome',
    nameDe: 'Spaceflight-Associated Neuro-ocular Syndrome (SANS)',
    category: 'microgravity_longterm',
    summaryEn: 'Chronic headward fluid shift elevates intracranial and orbital pressure, causing optic nerve sheath distension (ONSD), optic disc edema, globe flattening, and hyperopic vision shifts.',
    summaryDe: 'Kopf-wärts verlagerte Körperflüssigkeiten erhöhen den Druck auf den Sehnerv (ONSD) und verändern die Sehschärfe.',
    howToMeasureEn: 'Perform Amsler grid / near-vision acuity test, log head pressure or vision symptoms, and record 2D ocular ultrasound ONSD (mm).',
    promptTitleEn: 'SANS Ocular Ultrasound (ONSD) & Visual Acuity Check',
    promptInterval: 'Weekly near-vision check + Bi-weekly ocular ultrasound',
    countermeasureWatch: [
      'Schedule Lower Body Negative Pressure (LBNP) or venoconstrictive thigh-cuff sessions.',
      'Verify cabin CO₂ stays low and check B-complex vitamin status (folate/B12/B6).',
    ],
    countermeasureAct: [
      'Perform same-day ocular ultrasound / tonometry and transmit images to ground medical.',
      'Adjust corrective lens prescription and evaluate intracranial pressure countermeasures.',
    ],
    primaryMetrics: [
      { key: 'onsdMm', label: 'Optic Nerve Sheath Diameter (ONSD)', unit: 'mm', normalRange: '≤ 5.25 mm' },
      { key: 'refractiveShift', label: 'Hyperopic refractive shift', unit: 'D', normalRange: '< +0.45 D' },
    ],
    studies: getStudiesForRisk(10),
  },
  {
    riskNumber: 11,
    key: 'bone_changes',
    nameEn: 'Spaceflight-induced Bone Changes',
    nameDe: 'Raumflug-induzierter Knochenabbau',
    category: 'microgravity_longterm',
    summaryEn: 'Osteoclast bone resorption outpaces osteoblast formation ~3:1 in microgravity, depleting trabecular and cortical bone mineral density (BMD) in the tibia, hip, and lumbar spine.',
    summaryDe: 'In Schwerelosigkeit übersteigt der Knochenabbau den Aufbau um ca. 3:1, mit kritischem Zeitfenster für Erholung.',
    howToMeasureEn: 'Track high-load ARED resistive exercise compliance, back/skeletal pain (1–10), serum CTx resorption biomarker (ng/mL), and tibial BMD change (%).',
    promptTitleEn: 'Bone Turnover Biomarker (CTx) & High-Load ARED Check',
    promptInterval: 'Daily ARED load tracking + Monthly biochemical CTx check',
    countermeasureWatch: [
      'Prioritize heavy axial ARED loading (squats, deadlifts, heel raises) and Vitamin D3 + Calcium intake.',
      'Monitor back pain and avoid abrupt spinal flexion after prolonged unloading.',
    ],
    countermeasureAct: [
      'Consult flight surgeon to evaluate antiresorptive countermeasure therapy and modify spinal loading.',
      'Implement protective post-landing impact restrictions during skeletal remodeling recovery.',
    ],
    primaryMetrics: [
      { key: 'bmdChangePct', label: 'Tibial BMD change', unit: '%', normalRange: '≥ -2.3%' },
      { key: 'serumCtx', label: 'Serum CTx bone resorption', unit: 'ng/mL', normalRange: '≤ 0.68 ng/mL' },
    ],
    studies: getStudiesForRisk(11),
  },
];
