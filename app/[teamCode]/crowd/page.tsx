import { permanentRedirect } from "next/navigation";

type Params = { teamCode: string };

export default async function CrowdPage({ params }: { params: Promise<Params> }) {
  const { teamCode } = await params;
  permanentRedirect(`/community/${teamCode.toLowerCase()}`);
}
