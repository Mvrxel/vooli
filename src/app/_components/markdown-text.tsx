import { marked } from "marked";
import { memo, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import { cn } from "@/lib/utils";
import type { Components } from "react-markdown";

function parseMarkdownIntoBlocks(markdown: string): string[] {
  const tokens = marked.lexer(markdown);
  return tokens.map((token) => token.raw);
}

// Define a type for the code component props
interface CodeComponentProps {
  children?: React.ReactNode;
  className?: string;
  inline?: boolean;
  [key: string]: unknown;
}

const MemoizedMarkdownBlock = memo(
  ({ content, className }: { content: string; className?: string }) => {
    // Define custom components with proper typing
    const components: Components = {
      h1: ({ children, ...props }) => (
        <h1 {...props} className="mb-4 mt-6 text-2xl font-bold text-gray-900">
          {children}
        </h1>
      ),
      h2: ({ children, ...props }) => (
        <h2
          {...props}
          className="mb-3 mt-5 text-xl font-semibold text-gray-900"
        >
          {children}
        </h2>
      ),
      h3: ({ children, ...props }) => (
        <h3 {...props} className="mb-2 mt-4 text-lg font-medium text-gray-900">
          {children}
        </h3>
      ),
      p: ({ children, ...props }) => (
        <p {...props} className="mb-4 leading-relaxed text-gray-700">
          {children}
        </p>
      ),
      ul: ({ children, ...props }) => (
        <ul {...props} className="mb-4 ml-6 list-disc space-y-2 text-gray-700">
          {children}
        </ul>
      ),
      ol: ({ children, ...props }) => (
        <ol
          {...props}
          className="mb-4 ml-6 list-decimal space-y-2 text-gray-700"
        >
          {children}
        </ol>
      ),
      li: ({ children, ...props }) => (
        <li {...props} className="leading-relaxed">
          {children}
        </li>
      ),
      a: ({ children, ...props }) => (
        <a
          {...props}
          className="font-medium text-emerald-600 transition-colors hover:text-emerald-700 hover:underline"
          target="_blank"
          rel="noopener noreferrer"
        >
          {children}
        </a>
      ),
      blockquote: ({ children, ...props }) => (
        <blockquote
          {...props}
          className="mb-4 border-l-4 border-emerald-200 bg-gray-50 p-3 pl-4 italic text-gray-700"
        >
          {children}
        </blockquote>
      ),

      hr: (props) => (
        <hr {...props} className="my-6 border-t border-gray-200" />
      ),
      strong: ({ children, ...props }) => (
        <strong {...props} className="font-semibold text-gray-900">
          {children}
        </strong>
      ),
      em: ({ children, ...props }) => (
        <em {...props} className="italic">
          {children}
        </em>
      ),
      table: ({ children, ...props }) => (
        <div className="mb-4 overflow-x-auto">
          <table
            {...props}
            className="min-w-full divide-y divide-gray-200 rounded-lg border border-gray-200"
          >
            {children}
          </table>
        </div>
      ),
      thead: ({ children, ...props }) => (
        <thead {...props} className="bg-gray-50">
          {children}
        </thead>
      ),
      tbody: ({ children, ...props }) => (
        <tbody {...props} className="divide-y divide-gray-200 bg-white">
          {children}
        </tbody>
      ),
      tr: ({ children, ...props }) => (
        <tr {...props} className="hover:bg-gray-50">
          {children}
        </tr>
      ),
      th: ({ children, ...props }) => (
        <th
          {...props}
          className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
        >
          {children}
        </th>
      ),
      td: ({ children, ...props }) => (
        <td {...props} className="px-4 py-3 text-sm text-gray-700">
          {children}
        </td>
      ),
    };

    return (
      <div className={cn("markdown-content", className)}>
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeRaw]}
          components={components}
        >
          {content}
        </ReactMarkdown>
      </div>
    );
  },
  (prevProps, nextProps) => {
    if (prevProps.content !== nextProps.content) return false;
    return true;
  },
);

MemoizedMarkdownBlock.displayName = "MemoizedMarkdownBlock";

export const MemoizedMarkdown = memo(
  ({
    content,
    id,
    className,
  }: {
    content: string;
    id: string;
    className?: string;
  }) => {
    const blocks = useMemo(() => parseMarkdownIntoBlocks(content), [content]);

    return (
      <div className={cn("markdown-wrapper", className)}>
        {blocks.map((block, index) => (
          <MemoizedMarkdownBlock
            content={block}
            key={`${id}-block_${index}`}
            className={className}
          />
        ))}
      </div>
    );
  },
);

MemoizedMarkdown.displayName = "MemoizedMarkdown";
