import ClosetCanvasLoader from '../../../components/ClosetCanvasLoader';

interface ClosetPageProps {
  params: Promise<{ username: string }>;
}

export default async function ClosetPage({ params }: ClosetPageProps) {
  const { username } = await params;
  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col gap-4 px-6 py-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold">@{username}</h1>
        <p className="text-sm opacity-70">Phase 1 placeholder closet.</p>
      </header>
      <section className="aspect-video w-full overflow-hidden rounded border">
        <ClosetCanvasLoader />
      </section>
    </main>
  );
}
