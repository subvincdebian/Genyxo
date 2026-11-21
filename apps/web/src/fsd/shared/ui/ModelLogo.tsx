import styles from "./ModelLogo.module.css";
export function ModelLogo({ model }: { model: string }) {
  const name = model.toLowerCase();
  const provider = /gemini|google/.test(name)
    ? "gemini"
    : /claude|anthropic/.test(name)
      ? "claude-ai"
      : /gpt|openai|o[134]-/.test(name)
        ? "openai"
        : /deepseek/.test(name)
          ? "deepseek"
          : /mistral|mixtral/.test(name)
            ? "mistral"
            : /grok|xai/.test(name)
              ? "grok"
              : /qwen|alibaba/.test(name)
                ? "qwen"
                : /llama|meta/.test(name)
                  ? "meta"
                  : /nemotron|nvidia/.test(name)
                    ? "nvidia-nemotron"
                    : null;
  return provider ? (
    <img
      className={`${styles.logo} ${["openai", "grok", "qwen"].includes(provider) ? styles.mono : ""}`}
      src={`/images/models/${provider}.svg`}
      alt=""
      width="22"
      height="22"
    />
  ) : (
    <span className={styles.fallback} aria-hidden="true">
      {model
        .replace(/^AI:\s*/i, "")
        .slice(0, 1)
        .toUpperCase()}
    </span>
  );
}
