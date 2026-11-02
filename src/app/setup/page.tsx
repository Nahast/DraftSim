import { SetupWizard } from "./SetupWizard";

export default async function SetupPage({ searchParams }: PageProps<"/setup">) {
  const { mode } = await searchParams;
  return <SetupWizard practiceOnly={mode === "mock"} />;
}
