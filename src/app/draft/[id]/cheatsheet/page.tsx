import { CheatSheetView } from "./CheatSheetView";

export default async function CheatSheetPage({ params }: PageProps<"/draft/[id]/cheatsheet">) {
  const { id } = await params;
  return <CheatSheetView id={id} />;
}
