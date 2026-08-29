import Image from "next/image";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";
import { getTranslations } from "next-intl/server";

const markdownComponents: Components = {
  h1: ({ children }) => (
    <h1 className="font-heading mb-2 text-3xl font-semibold text-primary">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className="font-heading mt-8 mb-3 text-xl font-semibold">{children}</h2>
  ),
  h3: ({ children }) => <h3 className="mt-6 mb-2 text-base font-semibold">{children}</h3>,
  p: ({ children }) => (
    <p className="mb-4 text-sm leading-relaxed text-foreground/90">{children}</p>
  ),
  ul: ({ children }) => (
    <ul className="mb-4 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-foreground/90">
      {children}
    </ul>
  ),
  li: ({ children }) => <li>{children}</li>,
  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
  a: ({ children, href }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-primary underline underline-offset-2 hover:no-underline"
    >
      {children}
    </a>
  ),
  hr: () => <hr className="my-6 border-border" />,
  blockquote: ({ children }) => (
    <blockquote className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
      {children}
    </blockquote>
  ),
  table: ({ children }) => (
    <div className="mb-4 overflow-x-auto rounded-md border border-border">
      <table className="w-full text-left text-sm">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-accent">{children}</thead>,
  th: ({ children }) => (
    <th className="border-b border-border px-3 py-2 font-medium">{children}</th>
  ),
  td: ({ children }) => (
    <td className="border-b border-border px-3 py-2 align-top text-foreground/90">
      {children}
    </td>
  ),
};

export async function LegalPage({ markdown }: { markdown: string }) {
  const t = await getTranslations("legal");

  return (
    <div className="min-h-screen bg-background">
      <header className="flex items-center gap-2 border-b border-border bg-card px-4 py-3 sm:px-6">
        <Image src="/logo.png" alt="Belrion" width={28} height={28} className="rounded-full" />
        <span className="font-heading text-base font-semibold text-primary">Belrion</span>
      </header>
      <main className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6">
        <Link
          href="/"
          className="mb-6 flex w-fit items-center gap-1 text-sm text-muted-foreground hover:underline"
        >
          {t("back")}
        </Link>
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
          {markdown}
        </ReactMarkdown>
      </main>
    </div>
  );
}
