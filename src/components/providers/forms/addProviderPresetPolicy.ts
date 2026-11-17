import { createContext } from "react";
import type { AppId } from "@/lib/api";
import type { PresetEntry } from "./ProviderPresetSelector";

/** 仅新增页启用精简策略，完整模板仍可用于已有配置的兼容和编辑。 */
export const AddProviderPresetContext = createContext<AppId | null>(null);

// 明确指定各应用自己的登录入口，不能把跨应用 OAuth 或厂商 API 当成官方登录。
const LOGIN_PRESETS: Partial<Record<AppId, readonly string[]>> = {
  claude: ["Claude Official"],
  "claude-desktop": ["Claude Desktop Official"],
  codex: ["OpenAI Official"],
  gemini: ["Google Official"],
  grokbuild: ["Grok Official"],
  kimi: ["Kimi Official"],
  copilot: ["GitHub Copilot"],
  dsh: ["DeepSeek"],
};

export function getAddProviderPresetEntries(
  appId: AppId,
  entries: PresetEntry[],
): PresetEntry[] {
  return entries.filter(({ preset }) => {
    if (
      preset.category === "official" &&
      LOGIN_PRESETS[appId]?.includes(preset.name)
    ) {
      return true;
    }
    return (
      appId === "codex" &&
      (preset.name === "xAI (Grok)" || preset.name === "xAI (Grok) OAuth")
    );
  });
}
