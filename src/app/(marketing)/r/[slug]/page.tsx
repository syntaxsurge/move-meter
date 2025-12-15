import { ReportViewer } from "./ReportViewer";

export default function ReportSharePage({ params }: { params: { slug: string } }) {
  return <ReportViewer slug={params.slug} />;
}

