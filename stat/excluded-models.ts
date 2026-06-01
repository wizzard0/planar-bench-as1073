// Models excluded from aggregate counts because they are duplicate runs
// of the same underlying model under different inference configurations.
export const EXCLUDED_MODELS: Record<string, string> = {
  "k2-0905-fp8-fw-32k":    "duplicate of k2-0905-fp8-fw; debugging inference connection",
  "k2-0905-fp8-fw-prompt":  "duplicate of k2-0905-fp8-fw; debugging inference connection",
  "k2-0905-fp8-fw-prompt2": "duplicate of k2-0905-fp8-fw; debugging inference connection",
  "k3-k2-fm-fp8-251006":    "duplicate of k2-0905-fp8-fw; debugging inference connection",
  "gemini3-flash-preview-n": "same as gemini3-flash-preview",
  "qwen-max":                "alibaba updated the model behind the API multiple times; not a stable snapshot",
};

export const EXCLUDED_SET = new Set(Object.keys(EXCLUDED_MODELS));
