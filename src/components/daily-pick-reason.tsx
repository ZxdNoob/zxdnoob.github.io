'use client';

/**
 * 「今日精选」AI 推荐语（客户端组件）。
 *
 * ## 行为
 * - 用 `streamChat` 调一次 OpenAI 兼容接口，让模型在 50 字以内写一句「今天为什么推荐这篇」
 * - 命中 localStorage 缓存（key = `daily-pick-reason:<YMD>:<slug>`）时直接展示
 * - 未配置 LLM / 调用失败时回退到 `description`，保证视觉不塌陷
 * - 流式输出：用户在用 `localStorage.theme`、`useEffect` 这些重型组件加载完后能立即看到推荐语逐字浮出
 *
 * ## 设计权衡
 * - 不在 SSR 里调用 LLM（构建 / SSG 期间无网络 / 无 key），所有推理都在浏览器侧
 * - 调用是「opt-in」：只有 `NEXT_PUBLIC_AGENT_*` 配齐才会出口
 * - 一天一次：localStorage 当日缓存，刷新十次不会真的调十次 LLM
 */

import { useEffect, useRef, useState } from 'react';
import {
  getAgentLLMConfig,
  isAgentLLMConfigured,
  streamChat,
  type LLMChatMessage,
} from '@/lib/agent';

interface DailyPickReasonProps {
  slug: string;
  title: string;
  description: string;
  tags: string[];
  series?: string;
}

const REASON_MAX_LEN = 80;
const CACHE_PREFIX = 'daily-pick-reason';

function ymd(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function readCache(slug: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(`${CACHE_PREFIX}:${ymd()}:${slug}`);
    return raw && raw.length > 0 ? raw : null;
  } catch {
    return null;
  }
}

function writeCache(slug: string, value: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(`${CACHE_PREFIX}:${ymd()}:${slug}`, value);
    /** 顺手清掉别的日期的旧缓存（同 prefix），避免 localStorage 被慢慢撑大 */
    const today = ymd();
    for (let i = window.localStorage.length - 1; i >= 0; i -= 1) {
      const k = window.localStorage.key(i);
      if (
        k &&
        k.startsWith(`${CACHE_PREFIX}:`) &&
        !k.startsWith(`${CACHE_PREFIX}:${today}:`)
      ) {
        window.localStorage.removeItem(k);
      }
    }
  } catch {
    /* localStorage 不可用 */
  }
}

export function DailyPickReason({
  slug,
  title,
  description,
  tags,
  series,
}: DailyPickReasonProps) {
  /** 初始值在 SSR 与客户端首渲染时都是 description，避免 hydration mismatch */
  const [reason, setReason] = useState<string>(description);
  const [streaming, setStreaming] = useState(false);
  const [aiPowered, setAiPowered] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!isAgentLLMConfigured()) return;
    const cached = readCache(slug);
    if (cached) {
      setReason(cached);
      setAiPowered(true);
      return;
    }
    const config = getAgentLLMConfig();
    if (!config) return;

    const controller = new AbortController();
    abortRef.current = controller;
    setStreaming(true);
    setReason('');
    setAiPowered(true);

    const messages: LLMChatMessage[] = [
      {
        role: 'system',
        content:
          '你是博客推荐编辑。任务：用一句不超过 50 字的中文，告诉访客「今天为什么值得读这篇」。语气克制温暖，不堆砌形容词，不带「这是一篇…」「本文…」这类废话开头，直接给读者一个具体钩子。',
      },
      {
        role: 'user',
        content: [
          `文章标题：${title}`,
          series ? `系列：${series}` : '',
          tags.length > 0 ? `标签：${tags.join(' / ')}` : '',
          `原描述：${description}`,
          '',
          '请直接输出一句话推荐语，不要分多行，不要加引号。',
        ]
          .filter(Boolean)
          .join('\n'),
      },
    ];

    let acc = '';
    let cancelled = false;

    (async () => {
      try {
        for await (const ev of streamChat({
          config,
          messages,
          signal: controller.signal,
        })) {
          if (cancelled) break;
          if (ev.kind === 'delta') {
            acc += ev.text;
            /** 模型有时会带换行 / 引号 / 多余空格 — 实时归一化 */
            const cleaned = acc
              .replace(/[「」"'`]/g, '')
              .replace(/^\s+|\s+$/g, '')
              .replace(/\s*\n+\s*/g, ' ');
            const truncated =
              cleaned.length > REASON_MAX_LEN
                ? `${cleaned.slice(0, REASON_MAX_LEN)}…`
                : cleaned;
            setReason(truncated);
          } else if (ev.kind === 'error') {
            /** 静默回退：错误时直接用 description，不打扰用户 */
            if (acc.length === 0) setReason(description);
            break;
          }
        }
      } catch {
        if (acc.length === 0) setReason(description);
      } finally {
        setStreaming(false);
        if (acc.trim().length > 0) {
          writeCache(
            slug,
            acc.length > REASON_MAX_LEN
              ? `${acc.slice(0, REASON_MAX_LEN)}…`
              : acc,
          );
        }
      }
    })().catch(() => {
      setStreaming(false);
      setReason(description);
    });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [slug, title, description, series, tags]);

  return (
    <p
      className="mt-3 max-w-2xl text-base leading-relaxed text-stone-700 dark:text-stone-300 sm:text-lg"
      aria-live="polite"
    >
      {reason || description}
      {streaming ? (
        <span
          aria-hidden
          className="ml-0.5 inline-block h-3 w-1 -translate-y-0.5 animate-pulse bg-[var(--accent)] align-middle"
        />
      ) : null}
      {aiPowered && !streaming ? (
        <span className="ml-2 inline-flex translate-y-[-2px] items-center gap-1 rounded-full border border-amber-300/40 bg-amber-50/70 px-1.5 py-0 text-[10px] font-semibold tracking-wide text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300">
          <span
            aria-hidden
            className="inline-block h-1 w-1 rounded-full bg-amber-500"
          />
          AI 推荐
        </span>
      ) : null}
    </p>
  );
}
