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
      <code
        className="bg-accent/[0.08] text-accent rounded-md px-1.5 py-0.5 text-[13px] font-mono ring-1 ring-white/[0.06]"
        {...props}
      >
        {children}
      </code>
    )
  }

  return (
    <div className="relative group my-4 rounded-xl overflow-hidden ring-1 ring-white/[0.06]">
      <div className="flex items-center justify-between bg-surface-3/80 px-4 py-2 text-[11px] text-zinc-500 font-mono">
        <span className="uppercase tracking-wider">{props.className?.replace('language-', '') || 'code'}</span>
        <button
          onClick={handleCopy}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-all duration-200 text-[11px] ${
            copied
              ? 'bg-emerald-500/10 text-emerald-400'
              : 'hover:bg-white/[0.06] text-zinc-500 hover:text-zinc-300'
          }`}
        >
          {copied ? <Check size={12} /> : <Copy size={12} />}
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <pre className="bg-[#0d1117] p-4 overflow-x-auto">
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
      className="prose prose-invert prose-sm max-w-none prose-p:leading-[1.7] prose-pre:p-0 prose-pre:bg-transparent prose-headings:scroll-mt-4"
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeHighlight]}
      components={{
        code: CodeBlock,
        a: ({ children, ...props }) => (
          <a
            className="text-accent hover:text-accent/80 no-underline font-medium border-b border-accent/30 hover:border-accent/60 transition-colors"
            target="_blank"
            rel="noopener noreferrer"
            {...props}
          >
            {children}
          </a>
        ),
        table: ({ children, ...props }) => (
          <div className="overflow-x-auto my-4 rounded-xl ring-1 ring-white/[0.06]">
            <table className="border-collapse text-sm w-full" {...props}>
              {children}
            </table>
          </div>
        ),
        th: ({ children, ...props }) => (
          <th className="border-b border-white/[0.06] bg-surface-3/50 px-4 py-2.5 text-left font-medium text-zinc-300" {...props}>
            {children}
          </th>
        ),
        td: ({ children, ...props }) => (
          <td className="border-b border-white/[0.03] px-4 py-2.5 text-zinc-400" {...props}>
            {children}
          </td>
        ),
        blockquote: ({ children, ...props }) => (
          <blockquote
            className="border-l-[3px] border-accent/30 pl-4 py-0.5 my-4 text-zinc-400 italic bg-accent/[0.02] rounded-r-lg"
            {...props}
          >
            {children}
          </blockquote>
        ),
        hr: ({ ...props }) => (
          <hr className="my-6 border-white/[0.06]" {...props} />
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  )
}
