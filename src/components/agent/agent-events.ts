/**
 * Agent 抽屉相关的自定义事件常量。
 *
 * 单独文件以避免 `use-agent ↔ agent-launcher` 循环依赖。
 */

export const AGENT_PANEL_TOGGLE = 'agent-panel:toggle';
export const AGENT_PANEL_OPEN = 'agent-panel:open';
export const AGENT_PANEL_CLOSE = 'agent-panel:close';
/** `new CustomEvent(AGENT_PANEL_SEND, { detail: { prompt } })` */
export const AGENT_PANEL_SEND = 'agent-panel:send';

export interface AgentPanelSendDetail {
  prompt: string;
}
