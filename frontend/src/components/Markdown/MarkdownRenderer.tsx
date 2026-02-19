"use client";

import 'katex/dist/katex.min.css';

import React, { FC, ReactNode, useState } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { ClipboardDocumentIcon, CheckIcon } from '@heroicons/react/24/outline';
import { vscDarkPlus, oneLight } from "react-syntax-highlighter/dist/cjs/styles/prism";
import { useTheme } from "next-themes";
import { Element, ElementContent } from 'hast';

import ReactMarkdown, {Components} from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import remarkBreaks from "remark-breaks";
import rehypeKatex from "rehype-katex";
import rehypeSlug from 'rehype-slug';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import remarkDirective from 'remark-directive';
import rehypeExternalLinks from 'rehype-external-links';
import rehypeRaw from 'rehype-raw';
import { Linguist } from "@/lib/linguist";

interface PreProps {
    node?: Element;
    className?: string;
    children?: ReactNode;
}

export interface DirectiveNode extends Element {
    name: 'note' | 'warning' | 'danger' | string;
    attributes?: Record<string, string>;
    children: ElementContent[];
}

const CodeBlock: FC<PreProps> = ({ children, ...props }) => {
    const [isCopied, setIsCopied] = useState(false);
    const { resolvedTheme } = useTheme();
    const child = React.Children.toArray(children)[0];

    if (
        React.isValidElement(child) &&
        typeof child.props === 'object' &&
        child.props !== null &&
        'children' in child.props
    ) {
        let match;
        if ('className' in child.props && typeof child.props.className === 'string') {
            match = /language-(\w+)/.exec(child.props.className);
        }
        const language = match ? match[1] : 'plaintext';
        const code = child.props.children;
        const languageName = Linguist.get(language);

        const handleCopy = async () => {
            if (!code) return;
            try {
                await navigator.clipboard.writeText(String(code ?? ""));
                setIsCopied(true);
                setTimeout(() => setIsCopied(false), 2000);
            } catch (err) {
                console.error("Failed to copy code: ", err);
            }
        };

        return (
            <div className="relative group bg-[#fafafa] dark:bg-neutral-900 p-1 px-3 my-2 rounded-xl border">
                <p>{languageName ?? "Plaintext"}</p>
                <button
                    onClick={handleCopy}
                    aria-label="Copy code"
                    type="button"
                    className="absolute top-1 right-1 p-1 bg-neutral-200 dark:bg-neutral-800 rounded-md text-neutral-600 dark:text-neutral-400 dark:hover:text-white hover:bg-neutral-300 dark:hover:bg-neutral-700 transition-opacity opacity-0 group-hover:opacity-100"
                >
                    {isCopied ? <CheckIcon className="h-4 w-4" /> : <ClipboardDocumentIcon className="h-4 w-4" />}
                </button>
                <SyntaxHighlighter
                    codeTagProps={{ style: { fontFamily: 'var(--font-jetbrains-mono)' } }}
                    style={resolvedTheme === 'dark' ? vscDarkPlus : oneLight}
                    language={language}
                    wrapLines={true}
                    wrapLongLines={true}
                    customStyle={{ padding: ".4rem", margin: ".3rem 0", background: resolvedTheme === 'dark' ? "#111": "#eee" }}
                    {...props}
                >
                    {String(code ?? '').replace(/\n$/, '')}
                </SyntaxHighlighter>
            </div>
        );
    }

    return <pre {...props}>{children}</pre>;
};

const markdownComponents: Components & { [key: string]: React.ElementType } = {
    p({ children }) {
        const containsBlockElement = React.Children.toArray(children).some(child =>
            React.isValidElement(child) &&
            (child.type === SyntaxHighlighter)
        );

        if (containsBlockElement) {
            return <>{children}</>;
        }
        return <p>{children}</p>;
    },
    code({ className, children, ...props }) {
        return (
            <code
                className={`${className ?? ""} bg-[#fafafa] dark:bg-[#111] px-1 py-0.5 rounded-sm`}
                style={{ fontFamily: 'var(--font-jetbrains-mono)' }}
                {...props}
            >
                {children}
            </code>
        )
    },
    pre: (props: PreProps) => <CodeBlock {...props} />,
    input({ type, checked }) {
        return (
            <input type={type} checked={checked} readOnly className="mr-2" />
        )
    },
};

export const MarkdownRenderer = React.memo(({content, className}: { content?: string, className?: string }) => {
    return (
        <div className={`${className ? className : ''} prose dark:prose-invert w-full text-black dark:text-white`}>
            <ReactMarkdown
                remarkPlugins={[remarkGfm, remarkMath, remarkBreaks, remarkDirective]}
                rehypePlugins={[
                    rehypeRaw,
                    rehypeKatex, rehypeSlug,
                    [rehypeAutolinkHeadings],
                    [rehypeExternalLinks, { target: '_blank', rel: ['noopener', 'noreferrer'] }]
                ]}
                components={markdownComponents}
            >
                {content}
            </ReactMarkdown>
        </div>
    );
});
MarkdownRenderer.displayName = "MarkdownRenderer";