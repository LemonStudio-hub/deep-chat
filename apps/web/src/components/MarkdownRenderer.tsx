import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import { useState } from 'react'
import { Check, Copy } from 'lucide-react'

interface Props {
  content: string
}

function CodeBlock({ children, ...props }: { children?: React.ReactNode; className?: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    const text = String(children).replace(/\n$/, '')
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const isInline = !props.className

  if (isInline) {
    return (
      <code className="bg-white/10 rounded px-1.5 py-0.5 text-sm font-mono text-accent" {...props}>
        {children}
      </code>
    )
  }

  return (
    <div className="relative group my-3">
      <div className="flex items-center justify-between bg-surface-3 rounded-t-lg px-4 py-2 text-xs text-gray-400">
        <span>{props.className?.replace('language-', '') || 'code'}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 px-2 py-1 rounded hover:bg-white/10 transition-colors"
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <pre className="bg-[#0d1117] rounded-b-lg p-4 overflow-x-auto">
        <code className={props.className} {...props}>
          {children}
        </code>
      </pre>
    </div>
  )
}

export default function MarkdownRenderer({ content }: Props) {
  return (
    <ReactMarkdown
      className="prose prose-invert prose-sm max-w-none prose-p:leading-relaxed prose-pre:p-0 prose-pre:bg-transparent"
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeHighlight]}
      components={{
        code: CodeBlock,
        a: ({ children, ...props }) => (
          <a
            className="text-accent hover:text-accent/80 underline underline-offset-2"
            target="_blank"
            rel="noopener noreferrer"
            {...props}
          >
            {children}
          </a>
        ),
        table: ({ children, ...props }) => (
          <div className="overflow-x-auto my-3">
            <table className="border-collapse text-sm" {...props}>
              {children}
            </table>
          </div>
        ),
        th: ({ children, ...props }) => (
          <th className="border border-white/10 bg-surface-3 px-3 py-2 text-left font-medium" {...props}>
            {children}
          </th>
        ),
        td: ({ children, ...props }) => (
          <td className="border border-white/10 px-3 py-2" {...props}>
            {children}
          </td>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  )
}
