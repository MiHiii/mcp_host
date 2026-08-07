import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function MarkdownRenderer({ content }: { content: string }) {
  return (
    <div className="markdown-content text-slate-200 text-sm leading-relaxed">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="text-xl font-bold text-slate-100 mt-4 mb-2 pb-1 border-b border-slate-700/60">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-lg font-bold text-slate-100 mt-3 mb-2 pb-1 border-b border-slate-800">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-base font-semibold text-slate-200 mt-3 mb-1.5">
              {children}
            </h3>
          ),
          p: ({ children }) => <p className="mb-2 leading-relaxed text-slate-200 last:mb-0">{children}</p>,
          ul: ({ children }) => (
            <ul className="list-disc list-inside space-y-1 my-2 pl-1 text-slate-200">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal list-inside space-y-1 my-2 pl-1 text-slate-200">
              {children}
            </ol>
          ),
          li: ({ children }) => <li className="text-slate-200 leading-relaxed">{children}</li>,
          strong: ({ children }) => (
            <strong className="font-semibold text-indigo-300">{children}</strong>
          ),
          em: ({ children }) => <em className="italic text-slate-300">{children}</em>,
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-indigo-500/60 pl-3 my-2 text-slate-400 italic bg-slate-900/40 py-1 rounded-r">
              {children}
            </blockquote>
          ),
          code({ className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || "");
            const isInline = !match && !String(children).includes("\n");
            if (isInline) {
              return (
                <code
                  className="bg-slate-800/80 text-cyan-300 font-mono text-[0.85em] px-1.5 py-0.5 rounded border border-slate-700/50"
                  {...props}
                >
                  {children}
                </code>
              );
            }
            return (
              <div className="my-3 rounded-lg overflow-hidden border border-slate-800 bg-slate-950 font-mono text-xs">
                {match && (
                  <div className="bg-slate-900/90 px-3 py-1 text-[11px] font-sans font-medium text-slate-400 border-b border-slate-800/80 flex items-center justify-between">
                    <span>{match[1]}</span>
                  </div>
                )}
                <pre className="p-3 overflow-x-auto text-slate-200 bg-slate-950/90 leading-relaxed">
                  <code>{children}</code>
                </pre>
              </div>
            );
          },
          table: ({ children }) => (
            <div className="my-3 overflow-x-auto rounded-lg border border-slate-800">
              <table className="min-w-full divide-y divide-slate-800 text-left text-xs">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => <thead className="bg-slate-900/80 text-slate-300">{children}</thead>,
          tbody: ({ children }) => <tbody className="divide-y divide-slate-800/60 bg-slate-950/40">{children}</tbody>,
          tr: ({ children }) => <tr>{children}</tr>,
          th: ({ children }) => <th className="px-3 py-2 font-semibold">{children}</th>,
          td: ({ children }) => <td className="px-3 py-2 text-slate-300">{children}</td>,
          hr: () => <hr className="my-4 border-slate-800" />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
