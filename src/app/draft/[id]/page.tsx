import { DraftRoom } from "@/components/draft/DraftRoom";

export default async function DraftPage({ params }: PageProps<"/draft/[id]">) {
  const { id } = await params;
  return <DraftRoom id={id} />;
}
