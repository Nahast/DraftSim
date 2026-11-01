export default async function DraftPage({ params }: PageProps<"/draft/[id]">) {
  const { id } = await params;
  return <main className="p-4">Draft {id}</main>;
}
