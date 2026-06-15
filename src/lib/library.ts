// Research Library catalog. Currently a "coming soon" preview: entries carry no live `url`
// yet, so nothing here links out. When the hub launches, add `url` to each entry, append the
// rest of the catalog, and flip LIBRARY_COMING_SOON to false — the component already renders
// the live (searchable, linked) state from the same shapes.

export interface Paper {
  title: string;
  org: string;
  year: number;
  topics: string[];
  url?: string; // added when the library goes live
}

export const LIBRARY_COMING_SOON = true;

// Sources the library will cover. Used as preview chips.
export const ORGS = [
  'OpenAI',
  'Anthropic',
  'Google DeepMind',
  'NVIDIA',
  'Meta AI',
  'Mistral AI',
  'Microsoft',
  'Hugging Face',
  'Academic',
] as const;

// Topics the library will be filterable by. Used as preview chips.
export const TOPICS = [
  'Agents',
  'Reasoning',
  'LLMs',
  'SLMs',
  'Multimodal',
  'Training & Scaling',
  'Alignment & Safety',
  'Retrieval',
  'Systems & Efficiency',
] as const;

// A taste of what is coming: landmark, widely cited works. Titles only for now (no links),
// shown as preview cards so the hub reads as real, not empty.
export const PREVIEW: Paper[] = [
  { title: 'Attention Is All You Need', org: 'Google DeepMind', year: 2017, topics: ['LLMs', 'Systems & Efficiency'] },
  { title: 'Language Models are Few-Shot Learners', org: 'OpenAI', year: 2020, topics: ['LLMs'] },
  { title: 'Constitutional AI: Harmlessness from AI Feedback', org: 'Anthropic', year: 2022, topics: ['Alignment & Safety'] },
  { title: 'Chain-of-Thought Prompting Elicits Reasoning', org: 'Google DeepMind', year: 2022, topics: ['Reasoning'] },
  { title: 'ReAct: Synergizing Reasoning and Acting', org: 'Google DeepMind', year: 2022, topics: ['Agents', 'Reasoning'] },
  { title: 'LLaMA: Open and Efficient Foundation Models', org: 'Meta AI', year: 2023, topics: ['LLMs'] },
  { title: 'Mistral 7B', org: 'Mistral AI', year: 2023, topics: ['SLMs'] },
  { title: 'Retrieval-Augmented Generation for NLP', org: 'Meta AI', year: 2020, topics: ['Retrieval'] },
  { title: 'LoRA: Low-Rank Adaptation of Large Models', org: 'Microsoft', year: 2021, topics: ['Training & Scaling'] },
  { title: 'FlashAttention: Fast and Memory-Efficient Attention', org: 'Academic', year: 2022, topics: ['Systems & Efficiency'] },
  { title: 'Direct Preference Optimization', org: 'Academic', year: 2023, topics: ['Alignment & Safety'] },
  { title: 'Whisper: Robust Speech Recognition at Scale', org: 'OpenAI', year: 2022, topics: ['Multimodal'] },
  { title: 'Megatron-LM: Training Multi-Billion Parameter Models', org: 'NVIDIA', year: 2019, topics: ['Systems & Efficiency', 'Training & Scaling'] },
  { title: 'DistilBERT, a Distilled Version of BERT', org: 'Hugging Face', year: 2019, topics: ['SLMs'] },
];
