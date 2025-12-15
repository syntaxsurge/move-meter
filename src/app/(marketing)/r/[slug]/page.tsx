import { ReportViewer } from "./ReportViewer";

export default async function ReportSharePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <ReportViewer slug={slug} />;
}
