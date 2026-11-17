import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { AppId } from "@/lib/api";
import { providerPresets } from "@/config/claudeProviderPresets";
import { codexProviderPresets } from "@/config/codexProviderPresets";
import { geminiProviderPresets } from "@/config/geminiProviderPresets";
import { claudeDesktopProviderPresets } from "@/config/claudeDesktopProviderPresets";
import {
  grokBuildOfficialPreset,
  grokBuildProviderPresets,
} from "@/config/grokBuildProviderPresets";
import {
  kimiAccountPreset,
  kimiProviderPresets,
} from "@/config/kimiProviderPresets";
import {
  copilotOfficialPreset,
  copilotProviderPresets,
} from "@/config/copilotProviderPresets";
import {
  dshAccountPreset,
  dshProviderPresets,
} from "@/config/dshProviderPresets";
import { opencodeProviderPresets } from "@/config/opencodeProviderPresets";
import { openclawProviderPresets } from "@/config/openclawProviderPresets";
import { hermesProviderPresets } from "@/config/hermesProviderPresets";
import { piProviderPresets } from "@/config/piProviderPresets";
import { ompProviderPresets } from "@/config/ompProviderPresets";
import { mcodeProviderPresets } from "@/config/mcodeProviderPresets";
import { universalProviderPresets } from "@/config/universalProviderPresets";
import {
  AddProviderPresetContext,
  getAddProviderPresetEntries,
} from "@/components/providers/forms/addProviderPresetPolicy";
import {
  ProviderPresetSelector,
  type AnyPreset,
  type PresetEntry,
} from "@/components/providers/forms/ProviderPresetSelector";
import { RoutingActivationBrand } from "@/components/proxy/RoutingActivationBrand";

const cases: [AppId, AnyPreset[], string[]][] = [
  ["claude", providerPresets, ["Claude Official"]],
  ["claude-desktop", claudeDesktopProviderPresets, ["Claude Desktop Official"]],
  [
    "codex",
    codexProviderPresets,
    ["OpenAI Official", "xAI (Grok)", "xAI (Grok) OAuth"],
  ],
  ["gemini", geminiProviderPresets, ["Google Official"]],
  [
    "grokbuild",
    [grokBuildOfficialPreset, ...grokBuildProviderPresets],
    ["Grok Official"],
  ],
  ["kimi", [kimiAccountPreset, ...kimiProviderPresets], ["Kimi Official"]],
  [
    "copilot",
    [copilotOfficialPreset, ...copilotProviderPresets],
    ["GitHub Copilot"],
  ],
  ["dsh", [dshAccountPreset, ...dshProviderPresets], ["DeepSeek"]],
  ["opencode", opencodeProviderPresets, []],
  ["openclaw", openclawProviderPresets, []],
  ["hermes", hermesProviderPresets, []],
  ["pi", piProviderPresets, []],
  ["omp", ompProviderPresets, []],
  ["mcode", mcodeProviderPresets, []],
  ["agy", [], []],
];

const entriesFor = (appId: AppId, presets: AnyPreset[]): PresetEntry[] =>
  presets.map((preset, index) => ({ id: `${appId}-${index}`, preset }));

describe("新增供应商精简策略", () => {
  it.each(cases)(
    "%s 只保留指定入口，并保持原始 ID 与配置引用",
    (appId, presets, names) => {
      const entries = entriesFor(appId, presets);
      const original = entries.slice();
      const visible = getAddProviderPresetEntries(appId, entries);
      expect(visible.map(({ preset }) => preset.name)).toEqual(names);
      for (const entry of visible) {
        expect(entry).toBe(original.find(({ id }) => id === entry.id));
        expect(entry.preset).toBe(presets[Number(entry.id.split("-").at(-1))]);
      }
      expect(entries).toEqual(original);
    },
  );

  it("Codex 点击 xAI 保留原始索引，统一供应商入口均可调用", () => {
    const onPresetChange = vi.fn();
    const onUniversalPresetSelect = vi.fn();
    const onManageUniversalProviders = vi.fn();
    render(
      <AddProviderPresetContext.Provider value="codex">
        <ProviderPresetSelector
          appId="codex"
          selectedPresetId="custom"
          presetEntries={entriesFor("codex", codexProviderPresets)}
          onPresetChange={onPresetChange}
          defaultOpen
          onUniversalPresetSelect={onUniversalPresetSelect}
          onManageUniversalProviders={onManageUniversalProviders}
        />
      </AddProviderPresetContext.Provider>,
    );
    expect(
      screen.queryByRole("button", { name: "GitHub Copilot" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Nvidia" }),
    ).not.toBeInTheDocument();
    for (const name of ["OpenAI Official", "xAI (Grok)", "xAI (Grok) OAuth"]) {
      fireEvent.click(screen.getByRole("button", { name }));
      expect(onPresetChange).toHaveBeenLastCalledWith(
        `codex-${codexProviderPresets.findIndex((p) => p.name === name)}`,
      );
    }
    for (const preset of universalProviderPresets) {
      fireEvent.click(screen.getByRole("button", { name: preset.name }));
      expect(onUniversalPresetSelect).toHaveBeenLastCalledWith(preset);
    }
    fireEvent.click(
      screen.getByRole("button", { name: /providerPreset.manageUniversal/ }),
    );
    expect(onManageUniversalProviders).toHaveBeenCalledOnce();
    fireEvent.click(
      screen.getByRole("button", { name: "providerPreset.custom" }),
    );
    expect(onPresetChange).toHaveBeenLastCalledWith("custom");
  });

  it.each(["hermes", "omp"] as const)(
    "%s 没有官方登录时仍可手动配置（含共享 Pi 表单）",
    (appId) => {
      const onPresetChange = vi.fn();
      render(
        <AddProviderPresetContext.Provider value={appId}>
          <ProviderPresetSelector
            appId={appId === "omp" ? "pi" : appId}
            selectedPresetId={null}
            presetEntries={entriesFor("hermes", hermesProviderPresets)}
            onPresetChange={onPresetChange}
            defaultOpen
          />
        </AddProviderPresetContext.Provider>,
      );
      expect(
        screen.queryByRole("button", { name: "Nous Research" }),
      ).not.toBeInTheDocument();
      fireEvent.click(
        screen.getByRole("button", { name: "providerPreset.custom" }),
      );
      expect(onPresetChange).toHaveBeenCalledWith("custom");
    },
  );

  it("首页品牌链接使用自己的仓库", () => {
    render(<RoutingActivationBrand active={false} contextKey="codex" ready />);
    expect(
      screen.getByRole("link", { name: "CC Switch Classic" }),
    ).toHaveAttribute("href", "https://github.com/yz0812/cc-switch-classic");
  });
});
