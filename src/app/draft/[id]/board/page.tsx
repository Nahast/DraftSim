import { BoardView } from "./BoardView";

export default async function BoardPage({ params }: PageProps<"/draft/[id]/board">) {
  const { id } = await params;
  return <BoardView id={id} />;
}
