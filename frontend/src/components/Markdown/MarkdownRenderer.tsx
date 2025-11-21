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

interface AdmonitionProps {
    node: DirectiveNode;
    children: ReactNode;
}

// Define the styles for different admonition types
const admonitionStyles: Record<string, string> = {
    note: 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200',
    warning: 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200',
    danger: 'border-red-500 bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200',
};

export const Admonition: FC<AdmonitionProps> = ({ node, children }) => {
    const { name: type, attributes } = node;
    const title = attributes?.title || type.charAt(0).toUpperCase() + type.slice(1);
    const styleClass = admonitionStyles[type] || admonitionStyles.note;

    return (
        <div className={`my-4 border-l-4 p-4 rounded-r-md ${styleClass}`}>
            <p className="font-bold">{title}</p>
            <div>{children}</div>
        </div>
    );
};

const CodeBlock: FC<PreProps> = ({ children, ...props }) => {
    const [isCopied, setIsCopied] = useState(false);
    const { resolvedTheme } = useTheme();
    const child = React.Children.toArray(children)[0];

    // The rest of your logic from the 'pre' function goes here...
    // I'm just copying and pasting your masterpiece.

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
    containerDirective: (props) => {
        if (!props.node) {
            return null;
        }

        const node = props.node;

        if (['note', 'warning', 'danger'].includes(node.name)) {
            return <Admonition node={node}>{props.children}</Admonition>;
        }

        return <div>{props.children}</div>;
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