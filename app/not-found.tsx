import Link from "next/link";
import { getTranslations } from "next-intl/server";

export default async function NotFound() {
  const t = await getTranslations();
  return (
    <>
      <h1>{t("errors.notFound")}</h1>
      <Link className="btn btn-secondary" href="/">
        {t("report.back")}
      </Link>
    </>
  );
}
