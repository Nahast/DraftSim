import { ResultsView } from "./ResultsView";

export default async function ResultsPage({ params }: PageProps<"/draft/[id]/results">) {
  const { id } = await params;
  return <ResultsView id={id} />;
}
