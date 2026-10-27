import { getLocale, getTranslations } from "next-intl/server";
import { AutoRefresh } from "@/components/AutoRefresh";
import { intlTag, type Locale } from "@/lib/i18n/config";
import { loadMissionData, PERSONAS } from "@/lib/mission-control/data";
import { STAGES } from "@/lib/mission-control/stages";
import "./mission-control.css";

export const dynamic = "force-dynamic";

const ICON: Record<string, string> = { idle: "○", running: "◐", success: "✓", failed: "✕" };

export default async function MissionControlPage() {
  const t = await getTranslations("missionControl");
  const locale = (await getLocale()) as Locale;
  const d = await loadMissionData();
  const time = new Intl.DateTimeFormat(intlTag(locale), { hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: "Asia/Kolkata" });
  const saving =
    d.sci && d.sci.baselinePerDeployG ? Math.round((1 - d.sci.perDeployG / d.sci.baselinePerDeployG) * 100) : null;
  const budgetPct = d.sci && d.sci.monthlyBudgetG > 0 ? Math.min(100, Math.round((d.sci.monthToDateG / d.sci.monthlyBudgetG) * 100)) : null;

  return (
    <div className="mc">
      <AutoRefresh seconds={5} />
      <h1>{t("title")}</h1>
      <p className="lead">{t("intro")}</p>
      {!d.connected && (
        <p className="notice notice-error" role="status">
          {t("notConnected")}
        </p>
      )}
      <p className="mc-updated">{t("updated", { time: time.format(new Date(d.fetchedAt)) })}</p>

      <section aria-labelledby="mc-story" className="card">
        <h2 id="mc-story">{t("story")}</h2>
        {d.story ? (
          <div className="mc-story">
            {/* Issue titles come from GitLab as written, so they are marked as English. */}
            <a href={d.story.url} className="btn btn-secondary" lang="en">
              #{d.story.iid} {d.story.title}
            </a>
            {d.story.mrUrl && (
              <a href={d.story.mrUrl} className="btn btn-secondary">
                {t("mergeRequest")}
              </a>
            )}
          </div>
        ) : (
          <p>{t("noStory")}</p>
        )}
      </section>

      <section aria-labelledby="mc-ring">
        <h2 id="mc-ring">{t("ring")}</h2>
        <ol className="mc-ring" data-testid="stage-ring">
          {STAGES.map((s) => (
            <li key={s} className="mc-stage" data-state={d.stages[s]} data-testid={`stage-${s}`}>
              <span className="mc-stage-icon" aria-hidden="true">
                {ICON[d.stages[s]]}
              </span>
              <span className="mc-stage-name">{t(`stage.${s}`)}</span>
              <span className="mc-stage-state">{t(`state.${d.stages[s]}`)}</span>
            </li>
          ))}
        </ol>
      </section>

      <div className="mc-grid">
        <section aria-labelledby="mc-personas" className="card">
          <h2 id="mc-personas">{t("personas")}</h2>
          <ul className="mc-list">
            {PERSONAS.map((p) => (
              <li key={p} data-state={d.personas[p]}>
                <span aria-hidden="true">{d.personas[p] === "pass" ? "✓" : d.personas[p] === "fail" ? "✕" : "○"} </span>
                {t(`persona.${p}`)}: <strong>{t(d.personas[p])}</strong>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="mc-sci" className="card">
          <h2 id="mc-sci">{t("sci")}</h2>
          {d.sci ? (
            <>
              <p className="big-number">{t("grams", { grams: d.sci.perDeployG.toFixed(1) })}</p>
              {d.sci.baselinePerDeployG !== null && <p>{t("baseline", { grams: d.sci.baselinePerDeployG.toFixed(1) })}</p>}
              {saving !== null && <p><strong>{t("saving", { percent: saving })}</strong></p>}
              {budgetPct !== null && (
                <>
                  <p>{t("budget")}: {budgetPct}%</p>
                  <meter min={0} max={100} value={budgetPct} aria-label={t("budget")} className="mc-meter" />
                </>
              )}
            </>
          ) : (
            <p>{t("unknown")}</p>
          )}
        </section>

        <section aria-labelledby="mc-trust" className="card">
          <h2 id="mc-trust">{t("trust")}</h2>
          {d.trust ? (
            <table>
              <thead>
                <tr>
                  <th scope="col">{t("agent")}</th>
                  {[0, 1, 2].map((tier) => (
                    <th key={tier} scope="col">{t("tier", { tier })}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Object.entries(d.trust.agents).map(([agent, tiers]) => (
                  <tr key={agent}>
                    <th scope="row">{agent}</th>
                    {[0, 1, 2].map((tier) => (
                      <td key={tier}>{tiers[String(tier)] ?? "–"}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p>{t("unknown")}</p>
          )}
        </section>

        <section aria-labelledby="mc-chaos" className="card">
          <h2 id="mc-chaos">{t("chaos")}</h2>
          {d.chaos ? (
            <dl className="mc-dl">
              <dt>{t("rounds")}</dt>
              <dd>{d.chaos.rounds}</dd>
              <dt>{t("detected")}</dt>
              <dd>{d.chaos.rounds ? Math.round((d.chaos.detected / d.chaos.rounds) * 100) : 0}%</dd>
              <dt>{t("mttd")}</dt>
              <dd>{d.chaos.mttdMinutes === null ? "–" : t("minutes", { minutes: d.chaos.mttdMinutes })}</dd>
              <dt>{t("mttr")}</dt>
              <dd>{d.chaos.mttrMinutes === null ? "–" : t("minutes", { minutes: d.chaos.mttrMinutes })}</dd>
            </dl>
          ) : (
            <p>{t("unknown")}</p>
          )}
        </section>

        <section aria-labelledby="mc-lessons" className="card">
          <h2 id="mc-lessons">{t("lessons")}</h2>
          {d.lessons.length ? (
            <>
              <p><strong>{t("lessonsCount", { count: d.lessons.length })}</strong></p>
              <p lang="en">{d.lessons.at(-1)}</p>
            </>
          ) : (
            <p>{t("noLessons")}</p>
          )}
        </section>

        <section aria-labelledby="mc-diary" className="card">
          <h2 id="mc-diary">{t("diary")}</h2>
          {d.diary?.entries.length ? (
            <p lang="en">
              <strong>{d.diary.entries.at(-1)!.date}</strong> {d.diary.entries.at(-1)!.text}
            </p>
          ) : (
            <p>{t("noDiary")}</p>
          )}
        </section>
      </div>

      <section aria-labelledby="mc-timeline" className="card">
        <h2 id="mc-timeline">{t("timeline")}</h2>
        {d.timeline.length ? (
          <ol className="mc-list" lang="en">
            {d.timeline.map((e) => (
              <li key={e.id}>
                <time dateTime={e.when}>{time.format(new Date(e.when))}</time> · <strong>{e.who}</strong> {e.what}
              </li>
            ))}
          </ol>
        ) : (
          <p>{t("noEvents")}</p>
        )}
      </section>
    </div>
  );
}
