import { notFound, redirect } from "next/navigation";
import { getTeamByCode } from "@/lib/db/queries";

type Params = { teamCode: string };

export default async function TeamIndex({ params }: { params: Promise<Params> }) {
  const { teamCode } = await params;
  const team = await getTeamByCode(teamCode.toUpperCase());
  if (!team) notFound();
  redirect(`/${team.code}/build`);
}
