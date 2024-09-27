'use client'
import { useState } from "react";
import { Button } from "./ui/button";
import { Check, Copy } from "lucide-react";

interface ButtonCopyCodeProps {
    code?: string;
}

export default function ButtonCopyCode({code = ''} : ButtonCopyCodeProps) {
    const [copied, setCopied] = useState(false)

    const handleCopy = () => {
        navigator.clipboard.writeText(code)
        setCopied(true)
        setTimeout(() => {
            setCopied(false)
        }, 1000)
    }

    return <>
        <Button
            variant="outline"
            size="icon"
            className="absolute top-4 right-4 z-10"
            onClick={handleCopy}
        >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        </Button>
    </>
}