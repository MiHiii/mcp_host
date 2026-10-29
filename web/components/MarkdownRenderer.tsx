import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function MarkdownRenderer({ content }: { content: string }) {
  return (
    <div className="markdown-content text-neutral-800 text-sm leading-relaxed">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="text-xl font-bold text-neutral-900 mt-4 mb-2 pb-1 border-b border-neutral-300">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-lg font-bold text-neutral-900 mt-3 mb-2 pb-1 border-b border-neutral-300">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-base font-semibold text-neutral-900 mt-3 mb-1.5">
              {children}
            </h3>
          ),
          p: ({ children }) => <p className="mb-2 leading-relaxed text-neutral-800 last:mb-0">{children}</p>,
          ul: ({ children }) => (
            <ul className="list-disc list-inside space-y-1 my-2 pl-1 text-neutral-800">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal list-inside space-y-1 my-2 pl-1 text-neutral-800">
              {children}
            </ol>
          ),
          li: ({ children }) => <li className="text-neutral-800 leading-relaxed">{children}</li>,
          strong: ({ children }) => (
            <strong className="font-semibold text-neutral-900">{children}</strong>
          ),
          em: ({ children }) => <em className="italic text-neutral-700">{children}</em>,
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-neutral-400 pl-3 my-2 text-neutral-600 italic bg-neutral-100 py-1 rounded-r">
              {children}
            </blockquote>
          ),
          code({ className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || "");
            const isInline = !match && !String(children).includes("\n");
            if (isInline) {
              return (
                <code
                  className="bg-neutral-100 text-neutral-900 font-mono text-[0.85em] px-1.5 py-0.5 rounded border border-neutral-300"
                  {...props}
                >
                  {children}
                </code>
              );
            }
            return (
              <div className="my-3 rounded-lg overflow-hidden border border-neutral-300 bg-neutral-100 font-mono text-xs">
                {match && (
                  <div className="bg-neutral-200 px-3 py-1 text-[11px] font-sans font-medium text-neutral-600 border-b border-neutral-300 flex items-center justify-between">
                    <span>{match[1]}</span>
                  </div>
                )}
                <pre className="p-3 overflow-x-auto text-neutral-900 bg-white leading-relaxed">
                  <code>{children}</code>
                </pre>
              </div>
            );
          },
          table: ({ children }) => (
            <div className="my-3 overflow-x-auto rounded-lg border border-neutral-300">
              <table className="min-w-full divide-y divide-neutral-300 text-left text-xs">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => <thead className="bg-neutral-200 text-neutral-900">{children}</thead>,
          tbody: ({ children }) => <tbody className="divide-y divide-neutral-200 bg-white">{children}</tbody>,
          tr: ({ children }) => <tr>{children}</tr>,
          th: ({ children }) => <th className="px-3 py-2 font-semibold">{children}</th>,
          td: ({ children }) => <td className="px-3 py-2 text-neutral-800">{children}</td>,
          hr: () => <hr className="my-4 border-neutral-300" />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
