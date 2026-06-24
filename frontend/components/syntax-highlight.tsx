"use client";

import { useState } from "react";

// ── Token types ────────────────────────────────────────────────────────────────

type TType =
  | "comment" | "string" | "keyword" | "type" | "fn" | "prop"
  | "jsx-tag" | "jsx-component" | "number" | "operator"
  | "punctuation" | "whitespace" | "plain";

interface Token { type: TType; value: string }

// ── Color map ─────────────────────────────────────────────────────────────────

const COLOR: Record<TType, string> = {
  comment:       "text-white/25",
  string:        "text-emerald-400",
  keyword:       "text-violet-400",
  type:          "text-cyan-300",
  fn:            "text-yellow-300",
  prop:          "text-amber-300",
  "jsx-tag":     "text-blue-400/80",
  "jsx-component": "text-blue-400",
  number:        "text-orange-300",
  operator:      "text-violet-300/70",
  punctuation:   "text-white/40",
  whitespace:    "",
  plain:         "text-white/70",
};

// ── Tokeniser ─────────────────────────────────────────────────────────────────

const TS_KEYWORDS = new Set([
  "import","export","from","const","let","var","function","async","await",
  "return","default","type","interface","extends","class","if","else","true",
  "false","null","undefined","void","new","typeof","as","in","of","throw",
  "try","catch","finally","switch","case","break","continue","for","while",
  "do","declare","enum","abstract","implements","static","public","private",
  "protected","readonly","override","satisfies","keyof","infer","never",
  "require","module","namespace",
]);

const PATTERNS: [RegExp, TType][] = [
  [/^\/\/[^\n]*/,           "comment"],
  [/^\/\*[\s\S]*?\*\//,     "comment"],
  [/^#[^\n]*/,              "comment"],
  [/^`(?:[^`\\]|\\.)*`/,    "string"],
  [/^"(?:[^"\\]|\\.)*"/,    "string"],
  [/^'(?:[^'\\]|\\.)*'/,    "string"],
  [/^\b\d+(\.\d+)?\b/,      "number"],
  [/^[A-Z][a-zA-Z0-9_]*(?=\s*[<({])/,  "type"],
  [/^[A-Z][a-zA-Z0-9_]*/,   "type"],
  [/^[a-z_][a-zA-Z0-9_]*(?=\s*\()/,    "fn"],
  [/^[=><!&|?:+\-*/%^~]+/,  "operator"],
  [/^[{}[\]();,.]/,          "punctuation"],
  [/^\s+/,                   "whitespace"],
  [/^[a-zA-Z_$][a-zA-Z0-9_$]*/,        "plain"],
  [/^./,                     "plain"],
];

function tokenizeTS(src: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < src.length) {
    const rest = src.slice(i);
    let matched = false;
    for (const [re, type] of PATTERNS) {
      const m = rest.match(re);
      if (m) {
        const value = m[0];
        let resolved: TType = type;
        if (type === "plain" && TS_KEYWORDS.has(value)) resolved = "keyword";
        tokens.push({ type: resolved, value });
        i += value.length;
        matched = true;
        break;
      }
    }
    if (!matched) { tokens.push({ type: "plain", value: src[i] }); i++; }
  }
  return tokens;
}

// ── JSX post-process: handle <Tag and </Tag ───────────────────────────────────

function tokenizeTSX(src: string): Token[] {
  const tokens = tokenizeTS(src);
  const result: Token[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    // Detect '<' followed by identifier → JSX tag
    if (t.type === "punctuation" && (t.value === "<" || t.value === ">")) {
      result.push({ type: "punctuation", value: t.value });
    } else {
      result.push(t);
    }
  }
  return result;
}

// ── Bash tokenizer ────────────────────────────────────────────────────────────

const BASH_CMDS = new Set(["npm","npx","pnpm","yarn","git","cd","ls","mkdir","rm","cp","mv","touch","echo","cat","export","source","node","tsx","tsc"]);

function tokenizeBash(src: string): Token[] {
  const tokens: Token[] = [];
  for (const line of src.split("\n")) {
    if (line.trimStart().startsWith("#")) {
      tokens.push({ type: "comment", value: line }, { type: "whitespace", value: "\n" });
      continue;
    }
    const words = line.split(/(\s+|["'].*?["']|[|&;><])/);
    let firstWord = true;
    for (const w of words) {
      if (!w) continue;
      if (/^\s+$/.test(w)) { tokens.push({ type: "whitespace", value: w }); continue; }
      if (/^["']/.test(w)) { tokens.push({ type: "string", value: w }); continue; }
      if (/^[|&;><]/.test(w)) { tokens.push({ type: "operator", value: w }); continue; }
      if (firstWord && BASH_CMDS.has(w)) { tokens.push({ type: "fn", value: w }); firstWord = false; continue; }
      if (/^--?[a-z]/.test(w)) { tokens.push({ type: "prop", value: w }); firstWord = false; continue; }
      if (/^[A-Z_]+=$/.test(w)) { tokens.push({ type: "keyword", value: w }); firstWord = false; continue; }
      if (/^\$/.test(w)) { tokens.push({ type: "type", value: w }); firstWord = false; continue; }
      tokens.push({ type: "plain", value: w });
      firstWord = false;
    }
    tokens.push({ type: "whitespace", value: "\n" });
  }
  return tokens;
}

// ── JSON tokenizer ────────────────────────────────────────────────────────────

function tokenizeJSON(src: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < src.length) {
    const rest = src.slice(i);
    if (/^\s/.test(rest[0])) {
      const m = rest.match(/^\s+/)!;
      tokens.push({ type: "whitespace", value: m[0] }); i += m[0].length; continue;
    }
    if (rest[0] === '"') {
      const m = rest.match(/^"(?:[^"\\]|\\.)*"/)!;
      if (m) {
        // Check if next non-whitespace is ':'
        const after = src.slice(i + m[0].length).trimStart();
        tokens.push({ type: after.startsWith(":") ? "prop" : "string", value: m[0] });
        i += m[0].length; continue;
      }
    }
    const numM = rest.match(/^\d+(\.\d+)?/);
    if (numM) { tokens.push({ type: "number", value: numM[0] }); i += numM[0].length; continue; }
    if (rest.startsWith("true") || rest.startsWith("false") || rest.startsWith("null")) {
      const kw = rest.match(/^(true|false|null)/)![0];
      tokens.push({ type: "keyword", value: kw }); i += kw.length; continue;
    }
    tokens.push({ type: "punctuation", value: rest[0] }); i++;
  }
  return tokens;
}

// ── Main renderer ─────────────────────────────────────────────────────────────

function tokenize(code: string, lang: string): Token[] {
  const c = code.trim();
  if (lang === "bash" || lang === "sh") return tokenizeBash(c);
  if (lang === "json") return tokenizeJSON(c);
  return tokenizeTSX(c);
}

// ── Code block component ──────────────────────────────────────────────────────

interface Props {
  children: string;
  lang?: string;
}

export function CodeBlock({ children, lang = "tsx" }: Props) {
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(children.trim());
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const tokens = tokenize(children, lang);

  return (
    <div className="relative rounded-xl border border-white/[0.07] bg-[#0d0d0d] overflow-hidden my-4 group">
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/[0.05] bg-white/[0.015]">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-white/10" />
          <span className="w-2.5 h-2.5 rounded-full bg-white/10" />
          <span className="w-2.5 h-2.5 rounded-full bg-white/10" />
          <span className="ml-2 text-[10px] text-white/20 font-mono uppercase tracking-widest">{lang}</span>
        </div>
        <button
          onClick={copy}
          className="text-[10px] text-white/25 hover:text-white/60 transition-colors flex items-center gap-1"
        >
          {copied ? (
            <>
              <svg className="w-3 h-3 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-emerald-400">Copied</span>
            </>
          ) : (
            <>
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Copy
            </>
          )}
        </button>
      </div>
      <pre className="p-5 text-[13px] font-mono leading-6 overflow-x-auto">
        {tokens.map((tok, i) => (
          tok.type === "whitespace"
            ? tok.value
            : <span key={i} className={COLOR[tok.type]}>{tok.value}</span>
        ))}
      </pre>
    </div>
  );
}
