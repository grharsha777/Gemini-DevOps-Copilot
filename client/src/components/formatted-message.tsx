import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CodeBlockProps {
    code: string;
    language?: string;
}

const CodeBlock = ({ code, language }: CodeBlockProps) => {
    const [copied, setCopied] = useState(false);

    const copyToClipboard = () => {
        navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="relative group my-4 rounded-lg overflow-hidden border border-border bg-slate-950/50">
            <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-border">
                <span className="text-xs font-mono text-muted-foreground uppercase">{language || "code"}</span>
                <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={copyToClipboard}
                >
                    {copied ? (
                        <Check className="h-3 w-3 text-green-500" />
                    ) : (
                        <Copy className="h-3 w-3" />
                    )}
                </Button>
            </div>
            <pre className="p-4 overflow-x-auto font-mono text-sm leading-relaxed text-slate-300">
                <code>{code}</code>
            </pre>
        </div>
    );
};

export const FormattedMessage = ({ content }: { content: string }) => {
    // Simple regex to split content into text and code blocks
    const parts = content.split(/(```[\s\S]*?```)/g);

    return (
        <div className="space-y-2">
            {parts.map((part, index) => {
                if (part.startsWith("```")) {
                    // Extract language and code
                    const match = part.match(/```(\w+)?\n?([\s\S]*?)```/);
                    if (match) {
                        const [, language, code] = match;
                        return <CodeBlock key={index} code={code.trim()} language={language} />;
                    }
                }

                // Handle normal text segments
                return (
                    <div key={index} className="whitespace-pre-wrap leading-relaxed text-sm">
                        {part}
                    </div>
                );
            })}
        </div>
    );
};
