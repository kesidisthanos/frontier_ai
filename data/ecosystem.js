/*
 * frontier_ai: single source of truth for the dashboard.
 *
 * To keep the dashboard current, edit ONLY this array, then commit. See REFRESH.md.
 * The whole UI (categories, counts, filters) is rendered from these objects.
 *
 * Schema per entry:
 *   name          display name
 *   org           parent company or owner
 *   category      frontier | search | coding | image | video | audio | agents | infra | open
 *   region        us | china | europe        (primary base / origin)
 *   access        closed | open | mixed       (model/product availability)
 *   flagship      current headline product or model
 *   blurb         one neutral sentence (also searched)
 *   url           official site, opened in a new tab on click
 *   lastVerified  YYYY-MM-DD (entries older than 90 days are flagged stale)
 */
window.ECOSYSTEM = [
  // ── frontier ──────────────────────────────────────────────────────────────
  {
    name: "Anthropic",
    org: "Anthropic",
    category: "frontier",
    region: "us",
    access: "closed",
    flagship: "Claude Opus 4.8",
    blurb: "Safety-focused US lab that builds the Claude family of assistants and APIs.",
    url: "https://www.anthropic.com",
    lastVerified: "2026-06-05"
  },
  {
    name: "OpenAI",
    org: "OpenAI",
    category: "frontier",
    region: "us",
    access: "mixed",
    flagship: "GPT-5.5",
    blurb: "US lab behind the GPT family, spanning proprietary and open-weight releases.",
    url: "https://openai.com",
    lastVerified: "2026-06-05"
  },
  {
    name: "Google DeepMind",
    org: "Google",
    category: "frontier",
    region: "us",
    access: "mixed",
    flagship: "Gemini 3.5",
    blurb: "Google's AI lab, developer of the Gemini multimodal model family.",
    url: "https://deepmind.google",
    lastVerified: "2026-06-05"
  },
  {
    name: "xAI",
    org: "xAI",
    category: "frontier",
    region: "us",
    access: "mixed",
    flagship: "Grok 4.3",
    blurb: "Elon Musk's lab, developer of the Grok model series.",
    url: "https://x.ai",
    lastVerified: "2026-06-05"
  },
  {
    name: "Meta AI",
    org: "Meta",
    category: "frontier",
    region: "us",
    access: "open",
    flagship: "Llama 4 Maverick",
    blurb: "Meta's AI division, releasing open-weight multimodal models in the Llama family.",
    url: "https://ai.meta.com",
    lastVerified: "2026-06-05"
  },
  {
    name: "DeepSeek",
    org: "DeepSeek",
    category: "frontier",
    region: "china",
    access: "open",
    flagship: "DeepSeek-V4",
    blurb: "Chinese lab releasing open-weight models with strong reasoning at low cost.",
    url: "https://www.deepseek.com",
    lastVerified: "2026-06-05"
  },
  {
    name: "Mistral AI",
    org: "Mistral",
    category: "frontier",
    region: "europe",
    access: "mixed",
    flagship: "Mistral Medium 3.5",
    blurb: "Paris-based lab offering open-weight and commercial models for reasoning and coding.",
    url: "https://mistral.ai",
    lastVerified: "2026-06-05"
  },

  // ── search ────────────────────────────────────────────────────────────────
  {
    name: "Perplexity",
    org: "Perplexity",
    category: "search",
    region: "us",
    access: "closed",
    flagship: "Answer Engine (Sonar)",
    blurb: "AI answer engine that retrieves and synthesizes real-time web results.",
    url: "https://www.perplexity.ai",
    lastVerified: "2026-06-05"
  },
  {
    name: "Comet",
    org: "Perplexity",
    category: "search",
    region: "us",
    access: "closed",
    flagship: "Comet browser",
    blurb: "Perplexity's AI-native web browser with built-in agentic browsing.",
    url: "https://www.perplexity.ai/comet",
    lastVerified: "2026-06-05"
  },
  {
    name: "ChatGPT Atlas",
    org: "OpenAI",
    category: "search",
    region: "us",
    access: "closed",
    flagship: "Atlas browser",
    blurb: "OpenAI's Chromium-based browser with ChatGPT built in as an assistant.",
    url: "https://chatgpt.com/atlas",
    lastVerified: "2026-06-05"
  },
  {
    name: "Google AI Mode",
    org: "Google",
    category: "search",
    region: "us",
    access: "closed",
    flagship: "AI Mode (Gemini)",
    blurb: "Google Search's conversational AI answer layer, powered by Gemini.",
    url: "https://www.google.com/search",
    lastVerified: "2026-06-05"
  },
  {
    name: "Microsoft Copilot",
    org: "Microsoft",
    category: "search",
    region: "us",
    access: "closed",
    flagship: "Copilot (GPT-5.5)",
    blurb: "Microsoft's AI assistant across Windows, Bing, Edge, and Microsoft 365.",
    url: "https://copilot.microsoft.com",
    lastVerified: "2026-06-05"
  },
  {
    name: "You.com",
    org: "You.com",
    category: "search",
    region: "us",
    access: "closed",
    flagship: "AI Search and Agents",
    blurb: "Model-agnostic AI search and agent platform aimed at enterprise users.",
    url: "https://you.com",
    lastVerified: "2026-06-05"
  },

  // ── coding ────────────────────────────────────────────────────────────────
  {
    name: "Claude Code",
    org: "Anthropic",
    category: "coding",
    region: "us",
    access: "closed",
    flagship: "Claude Opus 4.8",
    blurb: "Anthropic's terminal and IDE coding agent, powered by Claude.",
    url: "https://www.anthropic.com/claude-code",
    lastVerified: "2026-06-05"
  },
  {
    name: "OpenAI Codex",
    org: "OpenAI",
    category: "coding",
    region: "us",
    access: "mixed",
    flagship: "GPT-5.3-Codex",
    blurb: "OpenAI's agentic coding platform with an open-source command-line interface.",
    url: "https://openai.com/codex",
    lastVerified: "2026-06-05"
  },
  {
    name: "Cursor",
    org: "Anysphere",
    category: "coding",
    region: "us",
    access: "closed",
    flagship: "Cursor 3",
    blurb: "Anysphere's AI code editor built around parallel coding agents.",
    url: "https://cursor.com",
    lastVerified: "2026-06-05"
  },
  {
    name: "GitHub Copilot",
    org: "Microsoft",
    category: "coding",
    region: "us",
    access: "closed",
    flagship: "Copilot (multi-model)",
    blurb: "GitHub and Microsoft's AI pair programmer for completions, chat, and agents.",
    url: "https://github.com/features/copilot",
    lastVerified: "2026-06-05"
  },
  {
    name: "Devin (Cognition)",
    org: "Cognition",
    category: "coding",
    region: "us",
    access: "closed",
    flagship: "Devin 2.2",
    blurb: "Cognition's autonomous AI software engineer for end-to-end coding tasks.",
    url: "https://devin.ai",
    lastVerified: "2026-06-05"
  },
  {
    name: "Windsurf",
    org: "Cognition",
    category: "coding",
    region: "us",
    access: "closed",
    flagship: "Windsurf Editor",
    blurb: "Agentic AI code editor, now part of Cognition, with multi-file editing agents.",
    url: "https://windsurf.com",
    lastVerified: "2026-06-05"
  },
  {
    name: "Replit Agent",
    org: "Replit",
    category: "coding",
    region: "us",
    access: "closed",
    flagship: "Agent 4",
    blurb: "Replit's agent that designs, builds, and deploys apps from prompts.",
    url: "https://replit.com",
    lastVerified: "2026-06-05"
  },
  {
    name: "Grok Build",
    org: "xAI",
    category: "coding",
    region: "us",
    access: "closed",
    flagship: "Grok Build (beta)",
    blurb: "xAI's coding agent for working across codebases from the terminal.",
    url: "https://x.ai",
    lastVerified: "2026-06-05"
  },
  {
    name: "Devstral",
    org: "Mistral",
    category: "coding",
    region: "europe",
    access: "open",
    flagship: "Devstral 2",
    blurb: "Mistral's open-weight coding model for software engineering tasks.",
    url: "https://mistral.ai",
    lastVerified: "2026-06-05"
  },

  // ── image ─────────────────────────────────────────────────────────────────
  {
    name: "Midjourney",
    org: "Midjourney",
    category: "image",
    region: "us",
    access: "closed",
    flagship: "Midjourney V8.1",
    blurb: "Subscription text-to-image service known for stylized, high-quality output.",
    url: "https://www.midjourney.com",
    lastVerified: "2026-06-05"
  },
  {
    name: "FLUX (Black Forest Labs)",
    org: "Black Forest Labs",
    category: "image",
    region: "europe",
    access: "mixed",
    flagship: "FLUX.2",
    blurb: "German lab with open-weight FLUX models and a commercial FLUX Pro tier.",
    url: "https://bfl.ai",
    lastVerified: "2026-06-05"
  },
  {
    name: "Imagen/Nano Banana",
    org: "Google",
    category: "image",
    region: "us",
    access: "closed",
    flagship: "Imagen 4 / Nano Banana",
    blurb: "Google's image generation, via Imagen and the Gemini-based Nano Banana model.",
    url: "https://deepmind.google/models/imagen/",
    lastVerified: "2026-06-05"
  },
  {
    name: "GPT Image",
    org: "OpenAI",
    category: "image",
    region: "us",
    access: "closed",
    flagship: "gpt-image-2",
    blurb: "OpenAI's native image model, built into ChatGPT and the API.",
    url: "https://openai.com",
    lastVerified: "2026-06-05"
  },
  {
    name: "Adobe Firefly",
    org: "Adobe",
    category: "image",
    region: "us",
    access: "closed",
    flagship: "Firefly Image 4",
    blurb: "Adobe's commercially safe generative imaging, integrated into Creative Cloud.",
    url: "https://firefly.adobe.com",
    lastVerified: "2026-06-05"
  },
  {
    name: "Stable Diffusion",
    org: "Stability AI",
    category: "image",
    region: "europe",
    access: "open",
    flagship: "Stable Diffusion 3.5",
    blurb: "Stability AI's open-weight diffusion models for image generation.",
    url: "https://stability.ai",
    lastVerified: "2026-06-05"
  },

  // ── video ─────────────────────────────────────────────────────────────────
  {
    name: "Veo",
    org: "Google",
    category: "video",
    region: "us",
    access: "closed",
    flagship: "Veo 3.1",
    blurb: "Google DeepMind's video model with synchronized audio and dialogue.",
    url: "https://deepmind.google/models/veo/",
    lastVerified: "2026-06-05"
  },
  {
    name: "Sora",
    org: "OpenAI",
    category: "video",
    region: "us",
    access: "closed",
    flagship: "Sora 2",
    blurb: "OpenAI's text-to-video model focused on physically accurate motion.",
    url: "https://openai.com/sora",
    lastVerified: "2026-06-05"
  },
  {
    name: "Runway",
    org: "Runway",
    category: "video",
    region: "us",
    access: "closed",
    flagship: "Gen-4.5",
    blurb: "Runway's video model with high-definition, multi-shot generation and audio.",
    url: "https://runwayml.com",
    lastVerified: "2026-06-05"
  },
  {
    name: "Kling (Kuaishou)",
    org: "Kuaishou",
    category: "video",
    region: "china",
    access: "closed",
    flagship: "Kling 3.0",
    blurb: "Kuaishou's video model generating high-resolution clips with audio.",
    url: "https://kling.ai",
    lastVerified: "2026-06-05"
  },
  {
    name: "Luma Dream Machine",
    org: "Luma",
    category: "video",
    region: "us",
    access: "closed",
    flagship: "Ray3",
    blurb: "Luma AI's video model for fast, high-definition generation.",
    url: "https://lumalabs.ai/dream-machine",
    lastVerified: "2026-06-05"
  },
  {
    name: "Pika",
    org: "Pika",
    category: "video",
    region: "us",
    access: "closed",
    flagship: "Pika 2.5",
    blurb: "Pika's video model with physics-aware motion and sound effects.",
    url: "https://pika.art",
    lastVerified: "2026-06-05"
  },
  {
    name: "Grok Imagine",
    org: "xAI",
    category: "video",
    region: "us",
    access: "closed",
    flagship: "Grok Imagine",
    blurb: "xAI's image and short-form video generation, with native audio.",
    url: "https://grok.com/imagine",
    lastVerified: "2026-06-05"
  },
  {
    name: "Seedance (ByteDance)",
    org: "ByteDance",
    category: "video",
    region: "china",
    access: "closed",
    flagship: "Seedance 2.0",
    blurb: "ByteDance's video model with multi-shot, joint audio and video generation.",
    url: "https://seed.bytedance.com",
    lastVerified: "2026-06-05"
  },

  // ── audio ─────────────────────────────────────────────────────────────────
  {
    name: "ElevenLabs",
    org: "ElevenLabs",
    category: "audio",
    region: "us",
    access: "closed",
    flagship: "Eleven v3",
    blurb: "Voice synthesis and text-to-speech across many languages.",
    url: "https://elevenlabs.io",
    lastVerified: "2026-06-05"
  },
  {
    name: "Suno",
    org: "Suno",
    category: "audio",
    region: "us",
    access: "closed",
    flagship: "Suno v5",
    blurb: "Generates full songs with vocals and instruments from text prompts.",
    url: "https://suno.com",
    lastVerified: "2026-06-05"
  },
  {
    name: "Udio",
    org: "Udio",
    category: "audio",
    region: "us",
    access: "closed",
    flagship: "Udio v1.5",
    blurb: "Generates and edits AI music with fine-grained timeline controls.",
    url: "https://www.udio.com",
    lastVerified: "2026-06-05"
  },
  {
    name: "Cartesia",
    org: "Cartesia",
    category: "audio",
    region: "us",
    access: "mixed",
    flagship: "Sonic 3",
    blurb: "Real-time text-to-speech with very low latency via its Sonic models.",
    url: "https://cartesia.ai",
    lastVerified: "2026-06-05"
  },
  {
    name: "Voxtral (Mistral)",
    org: "Mistral",
    category: "audio",
    region: "europe",
    access: "open",
    flagship: "Voxtral",
    blurb: "Mistral's open-weight speech model with voice cloning and streaming.",
    url: "https://mistral.ai",
    lastVerified: "2026-06-05"
  },

  // ── agents ────────────────────────────────────────────────────────────────
  {
    name: "Sierra",
    org: "Sierra",
    category: "agents",
    region: "us",
    access: "closed",
    flagship: "Sierra Agent Platform",
    blurb: "Conversational AI agent platform for enterprise customer experience.",
    url: "https://sierra.ai",
    lastVerified: "2026-06-05"
  },
  {
    name: "Glean",
    org: "Glean",
    category: "agents",
    region: "us",
    access: "closed",
    flagship: "Glean Work AI",
    blurb: "Enterprise AI assistant and search across a company's connected data.",
    url: "https://www.glean.com",
    lastVerified: "2026-06-05"
  },
  {
    name: "Lindy",
    org: "Lindy",
    category: "agents",
    region: "us",
    access: "closed",
    flagship: "Lindy Agent Builder",
    blurb: "No-code platform for building AI agents that automate workflows.",
    url: "https://www.lindy.ai",
    lastVerified: "2026-06-05"
  },
  {
    name: "Harvey",
    org: "Harvey",
    category: "agents",
    region: "us",
    access: "closed",
    flagship: "Harvey",
    blurb: "AI platform for legal and professional-services work.",
    url: "https://www.harvey.ai",
    lastVerified: "2026-06-05"
  },
  {
    name: "NotebookLM",
    org: "Google",
    category: "agents",
    region: "us",
    access: "closed",
    flagship: "NotebookLM (Gemini)",
    blurb: "Google's source-grounded research assistant with summaries and audio overviews.",
    url: "https://notebooklm.google",
    lastVerified: "2026-06-05"
  },
  {
    name: "Perplexity Computer",
    org: "Perplexity",
    category: "agents",
    region: "us",
    access: "closed",
    flagship: "Perplexity Computer",
    blurb: "Perplexity's agentic product that runs multi-step tasks across apps and the web.",
    url: "https://www.perplexity.ai",
    lastVerified: "2026-06-05"
  },
  {
    name: "Manus",
    org: "Manus",
    category: "agents",
    region: "china",
    access: "closed",
    flagship: "Manus Agent",
    blurb: "General-purpose autonomous agent that plans and executes complex tasks.",
    url: "https://manus.im",
    lastVerified: "2026-06-05"
  },

  // ── infra ─────────────────────────────────────────────────────────────────
  {
    name: "NVIDIA",
    org: "NVIDIA",
    category: "infra",
    region: "us",
    access: "closed",
    flagship: "Blackwell (GB200)",
    blurb: "Designs the dominant AI accelerator GPUs and the CUDA software stack.",
    url: "https://www.nvidia.com",
    lastVerified: "2026-06-05"
  },
  {
    name: "Groq",
    org: "Groq",
    category: "infra",
    region: "us",
    access: "closed",
    flagship: "GroqCloud (LPU)",
    blurb: "Builds Language Processing Units and a low-latency inference cloud.",
    url: "https://groq.com",
    lastVerified: "2026-06-05"
  },
  {
    name: "Cerebras",
    org: "Cerebras",
    category: "infra",
    region: "us",
    access: "mixed",
    flagship: "Wafer-Scale Engine 3",
    blurb: "Makes the largest AI chip and a very fast cloud inference service.",
    url: "https://www.cerebras.ai",
    lastVerified: "2026-06-05"
  },
  {
    name: "Together AI",
    org: "Together AI",
    category: "infra",
    region: "us",
    access: "mixed",
    flagship: "Together Cloud",
    blurb: "Cloud platform for training, fine-tuning, and serving open models.",
    url: "https://www.together.ai",
    lastVerified: "2026-06-05"
  },
  {
    name: "Fireworks AI",
    org: "Fireworks AI",
    category: "infra",
    region: "us",
    access: "mixed",
    flagship: "Fireworks Inference",
    blurb: "High-throughput inference service for open models.",
    url: "https://fireworks.ai",
    lastVerified: "2026-06-05"
  },
  {
    name: "Hugging Face",
    org: "Hugging Face",
    category: "infra",
    region: "us",
    access: "open",
    flagship: "The Hub",
    blurb: "Hosts the largest open repository of AI models, datasets, and demos.",
    url: "https://huggingface.co",
    lastVerified: "2026-06-05"
  },

  // ── open ──────────────────────────────────────────────────────────────────
  {
    name: "Llama (Meta)",
    org: "Meta",
    category: "open",
    region: "us",
    access: "open",
    flagship: "Llama 4 Maverick",
    blurb: "Meta's open-weight multimodal family using a mixture-of-experts design.",
    url: "https://www.llama.com",
    lastVerified: "2026-06-05"
  },
  {
    name: "DeepSeek",
    org: "DeepSeek",
    category: "open",
    region: "china",
    access: "open",
    flagship: "DeepSeek-V4",
    blurb: "Chinese lab's open-weight models with strong reasoning at low cost.",
    url: "https://www.deepseek.com",
    lastVerified: "2026-06-05"
  },
  {
    name: "Qwen (Alibaba)",
    org: "Alibaba",
    category: "open",
    region: "china",
    access: "open",
    flagship: "Qwen3",
    blurb: "Alibaba's open-weight model family, widely available on Hugging Face.",
    url: "https://qwenlm.github.io",
    lastVerified: "2026-06-05"
  },
  {
    name: "Mistral",
    org: "Mistral",
    category: "open",
    region: "europe",
    access: "open",
    flagship: "Mistral Small 3",
    blurb: "Paris-based lab's open-weight models for reasoning and coding.",
    url: "https://mistral.ai",
    lastVerified: "2026-06-05"
  },
  {
    name: "GLM (Z.ai)",
    org: "Zhipu",
    category: "open",
    region: "china",
    access: "open",
    flagship: "GLM-5",
    blurb: "Zhipu / Z.ai's open-weight models focused on agentic and coding tasks.",
    url: "https://z.ai",
    lastVerified: "2026-06-05"
  },
  {
    name: "Kimi (Moonshot)",
    org: "Moonshot",
    category: "open",
    region: "china",
    access: "open",
    flagship: "Kimi K2",
    blurb: "Moonshot AI's open-weight models with very long context windows.",
    url: "https://www.moonshot.ai",
    lastVerified: "2026-06-05"
  },
  {
    name: "Gemma (Google)",
    org: "Google",
    category: "open",
    region: "us",
    access: "open",
    flagship: "Gemma 4",
    blurb: "Google's open-weight models designed to run on consumer hardware.",
    url: "https://deepmind.google/models/gemma/",
    lastVerified: "2026-06-05"
  }
];
