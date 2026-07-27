import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

export function DocsPage({
  title,
  description,
  children,
}: {
  title: string;
  description: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-10">
      <h1 className="font-mono text-2xl font-bold tracking-tight">{title}</h1>
      <p className="text-muted-foreground mt-3 leading-relaxed">
        {description}
      </p>
      <div className="mt-10 flex flex-col gap-10">{children}</div>
    </main>
  );
}

export function DocsSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="border-b pb-2 text-xl font-semibold tracking-tight">
        {title}
      </h2>
      {children}
    </section>
  );
}

export function P({ children }: { children: React.ReactNode }) {
  return <p className="leading-relaxed">{children}</p>;
}

export function DocsList({ children }: { children: React.ReactNode }) {
  return (
    <ul className="flex list-disc flex-col gap-2 pl-5 leading-relaxed marker:text-muted-foreground">
      {children}
    </ul>
  );
}

export function Code({ children }: { children: React.ReactNode }) {
  return (
    <code className="bg-muted rounded px-1.5 py-0.5 font-mono text-[0.85em]">
      {children}
    </code>
  );
}

export function CodeBlock({
  children,
  className,
}: {
  children: string;
  className?: string;
}) {
  return (
    <pre
      className={cn(
        'bg-muted/50 overflow-x-auto rounded-lg border p-4 font-mono text-sm leading-relaxed',
        className,
      )}
    >
      <code>{children.trim()}</code>
    </pre>
  );
}

export function InstallTabs({ packages }: { packages: string }) {
  const commands = {
    pnpm: `pnpm add ${packages}`,
    npm: `npm install ${packages}`,
    yarn: `yarn add ${packages}`,
  };
  return (
    <Tabs defaultValue="pnpm">
      <TabsList>
        {Object.keys(commands).map((pm) => (
          <TabsTrigger key={pm} value={pm}>
            {pm}
          </TabsTrigger>
        ))}
      </TabsList>
      {Object.entries(commands).map(([pm, command]) => (
        <TabsContent key={pm} value={pm}>
          <CodeBlock>{command}</CodeBlock>
        </TabsContent>
      ))}
    </Tabs>
  );
}
