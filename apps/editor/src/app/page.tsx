import Link from 'next/link';

export default function Index() {
  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-4 p-6">
      <h1 className="text-3xl font-bold tracking-tight">Graphics i18n</h1>
      <p className="text-muted-foreground">Author and localize .lpkg graphics.</p>
      <Link href="/editor" className="text-primary underline underline-offset-4">
        Open the editor →
      </Link>
      <Link href="/example" className="text-primary underline underline-offset-4">
        LocalizedGraphic web renderer example →
      </Link>
    </main>
  );
}
