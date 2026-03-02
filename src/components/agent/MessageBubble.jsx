import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import { Copy, CheckCircle2, AlertCircle, Loader2, ChevronRight, Clock } from "lucide-react";

const FunctionDisplay = ({ toolCall }) => {
  const [expanded, setExpanded] = useState(false);
  const name = toolCall?.name || "Function";
  const status = toolCall?.status || "pending";
  const results = toolCall?.results;

  const parsedResults = (() => {
    if (!results) return null;
    try {
      return typeof results === "string" ? JSON.parse(results) : results;
    } catch {
      return results;
    }
  })();

  const isError = results && (
    (typeof results === "string" && /error|failed/i.test(results)) ||
    (parsedResults?.success === false)
  );

  const statusConfig = {
    pending: { icon: Clock, color: "text-slate-400", text: "Pendiente" },
    running: { icon: Loader2, color: "text-slate-500", text: "Ejecutando...", spin: true },
    in_progress: { icon: Loader2, color: "text-slate-500", text: "Ejecutando...", spin: true },
    completed: isError 
      ? { icon: AlertCircle, color: "text-red-500", text: "Error" } 
      : { icon: CheckCircle2, color: "text-green-600", text: "Completado" },
    success: { icon: CheckCircle2, color: "text-green-600", text: "Completado" },
    failed: { icon: AlertCircle, color: "text-red-500", text: "Error" },
  }[status] || { icon: Clock, color: "text-slate-500", text: "" };

  const Icon = statusConfig.icon;

  return (
    <div className="mt-2 text-xs">
      <button
        onClick={() => setExpanded(!expanded)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all ${
          expanded ? "bg-slate-50 border-slate-300" : "bg-white border-slate-200"
        }`}
      >
        <Icon className={`h-3 w-3 ${statusConfig.color} ${statusConfig.spin && "animate-spin"}`} />
        <span className="text-slate-700">{name}</span>
        {statusConfig.text && <span className="text-slate-500">• {statusConfig.text}</span>}
      </button>

      {expanded && (
        <div className="mt-1.5 ml-3 pl-3 border-l-2 border-slate-200 space-y-2">
          {toolCall.arguments_string && (
            <div>
              <div className="text-xs text-slate-500 mb-1">Parámetros:</div>
              <pre className="bg-slate-50 rounded-md p-2 text-xs text-slate-600 whitespace-pre-wrap max-h-32 overflow-auto">
                {(() => {
                  try {
                    return JSON.stringify(JSON.parse(toolCall.arguments_string), null, 2);
                  } catch {
                    return toolCall.arguments_string;
                  }
                })()}
              </pre>
            </div>
          )}
          {parsedResults && (
            <div>
              <div className="text-xs text-slate-500 mb-1">Resultado:</div>
              <pre className="bg-slate-50 rounded-md p-2 text-xs text-slate-600 whitespace-pre-wrap max-h-32 overflow-auto">
                {typeof parsedResults === "object" 
                  ? JSON.stringify(parsedResults, null, 2) 
                  : parsedResults}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default function MessageBubble({ message }) {
  const isUser = message.role === "user";

  return (
    <div className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}>
      {!isUser && (
        <div className="h-7 w-7 rounded-lg bg-[#00ff88]/20 flex items-center justify-center flex-shrink-0 mt-0.5">
          <div className="h-1.5 w-1.5 rounded-full bg-[#00ff88]" />
        </div>
      )}
      <div className={`max-w-[80%] ${isUser && "flex flex-col items-end"}`}>
        {message.content && (
          <div
            className={`rounded-2xl px-4 py-2.5 ${
              isUser ? "bg-[#00ff88] text-[#0a0e1a]" : "bg-[#1a2240] text-slate-100"
            }`}
          >
            {isUser ? (
              <p className="text-sm leading-relaxed">{message.content}</p>
            ) : (
              <ReactMarkdown
                className="text-sm prose prose-sm prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
                components={{
                  code: ({ inline, children, ...props }) => {
                    return inline ? (
                      <code className="px-1 py-0.5 rounded bg-[#0f1629] text-[#00ff88] text-xs">
                        {children}
                      </code>
                    ) : (
                      <pre className="bg-[#0f1629] text-slate-100 rounded-lg p-3 overflow-x-auto my-2">
                        <code {...props}>{children}</code>
                      </pre>
                    );
                  },
                  p: ({ children }) => <p className="my-1 leading-relaxed">{children}</p>,
                  ul: ({ children }) => <ul className="my-1 ml-4 list-disc">{children}</ul>,
                  li: ({ children }) => <li className="my-0.5">{children}</li>,
                }}
              >
                {message.content}
              </ReactMarkdown>
            )}
          </div>
        )}

        {message.tool_calls?.length > 0 && (
          <div className="space-y-1 mt-2">
            {message.tool_calls.map((toolCall, idx) => (
              <FunctionDisplay key={idx} toolCall={toolCall} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}