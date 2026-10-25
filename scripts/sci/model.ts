// SCI = ((E × I) + M) per R. Pure.
export interface Coefficients {
  compute: Record<"gcp_min_watts_per_vcpu" | "gcp_max_watts_per_vcpu" | "avg_cpu_utilisation" | "memory_kwh_per_gb_hour" | "pue_gcp", { value: number }>;
  grid_g_per_kwh: Record<string, { value: number }>;
  runner_region: { value: string };
  runner_types: Record<string, { vcpu: number; memory_gb: number }>;
  embodied: Record<"server_kgco2e" | "server_vcpus" | "lifespan_years", { value: number }>;
  cloud_run: { vcpu: number; memory_gb: number; region: string };
  llm: Record<"kwh_per_session_low" | "kwh_per_session_high", { value: number }>;
}

export interface JobUsage {
  name: string;
  durationS: number;
  runnerType: string;
}

export interface Breakdown {
  energyKwh: number;
  operationalG: number;
  embodiedG: number;
  totalG: number;
}

const HOURS_PER_YEAR = 24 * 365;

function wattsPerVcpu(c: Coefficients): number {
  const { gcp_min_watts_per_vcpu: min, gcp_max_watts_per_vcpu: max, avg_cpu_utilisation: u } = c.compute;
  return min.value + u.value * (max.value - min.value);
}

/** Energy (kWh) and emissions (g) for `vcpu`/`memGb` running `hours` in `region`. */
export function footprint(c: Coefficients, vcpu: number, memGb: number, hours: number, region: string): Breakdown {
  const cpuKwh = (vcpu * wattsPerVcpu(c) * hours) / 1000;
  const memKwh = memGb * c.compute.memory_kwh_per_gb_hour.value * hours;
  const energyKwh = (cpuKwh + memKwh) * c.compute.pue_gcp.value;
  const intensity = c.grid_g_per_kwh[region]?.value;
  if (intensity === undefined) throw new Error(`No grid intensity for region ${region}`);
  const operationalG = energyKwh * intensity;
  const e = c.embodied;
  const embodiedG = e.server_kgco2e.value * 1000 * (hours / (e.lifespan_years.value * HOURS_PER_YEAR)) * (vcpu / e.server_vcpus.value);
  return { energyKwh, operationalG, embodiedG, totalG: operationalG + embodiedG };
}

export function add(a: Breakdown, b: Breakdown): Breakdown {
  return { energyKwh: a.energyKwh + b.energyKwh, operationalG: a.operationalG + b.operationalG, embodiedG: a.embodiedG + b.embodiedG, totalG: a.totalG + b.totalG };
}

export const ZERO: Breakdown = { energyKwh: 0, operationalG: 0, embodiedG: 0, totalG: 0 };

export function jobsFootprint(c: Coefficients, jobs: JobUsage[]): Breakdown {
  return jobs.reduce((acc, j) => {
    const rt = c.runner_types[j.runnerType] ?? c.runner_types.default!;
    return add(acc, footprint(c, rt.vcpu, rt.memory_gb, j.durationS / 3600, c.runner_region.value));
  }, ZERO);
}

export function cloudRunFootprint(c: Coefficients, instanceSeconds: number): Breakdown {
  return footprint(c, c.cloud_run.vcpu, c.cloud_run.memory_gb, instanceSeconds / 3600, c.cloud_run.region);
}

export function llmRangeG(c: Coefficients, sessions: number, region: string): { lowG: number; highG: number } {
  const i = c.grid_g_per_kwh[region]?.value ?? 0;
  return { lowG: sessions * c.llm.kwh_per_session_low.value * i, highG: sessions * c.llm.kwh_per_session_high.value * i };
}

export function percentLess(value: number, baseline: number): number | null {
  if (baseline <= 0) return null;
  return Math.round((1 - value / baseline) * 100);
}
