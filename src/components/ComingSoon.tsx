import { PageHeader } from "@/components/PageHeader";

export default function ComingSoon({
  title,
  blurb,
}: {
  title: string;
  blurb?: string;
}) {
  return (
    <div>
      <PageHeader title={title} subtitle="Migration in progress" />
      <div className="card">
        <p className="text-sm text-[#4a5678]">
          This module is being ported from the previous Streamlit app. Existing data
          in <code>barroquillo.db</code> is intact and will light up here once the UI
          is ready.
        </p>
        {blurb && <p className="text-sm text-[#4a5678] mt-3">{blurb}</p>}
      </div>
    </div>
  );
}
