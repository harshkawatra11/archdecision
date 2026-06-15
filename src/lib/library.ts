// Research Library catalog. Currently a "coming soon" preview: entries carry no live `url`
// yet, so nothing here links out. When the hub launches, add `url` to each entry, append the
// rest of the catalog, and flip LIBRARY_COMING_SOON to false — the component already renders
// the live (searchable, linked) state from the same shapes.
//
// Scope is the whole of computer science, not just AI/ML: networking, databases, operating
// systems, distributed systems, security, algorithms, plus agentic AI, LLMs, and SLMs.

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
  'Google',
  'NVIDIA',
  'Meta AI',
  'Mistral AI',
  'Microsoft',
  'Amazon',
  'Academic',
] as const;

// Topics the library will be filterable by, spanning core CS and modern AI. Preview chips.
export const TOPICS = [
  'Agents',
  'Reasoning',
  'LLMs',
  'SLMs',
  'Multimodal',
  'Training & Scaling',
  'Alignment & Safety',
  'Retrieval',
  'Distributed Systems',
  'Databases',
  'Networking',
  'Operating Systems',
  'Security & Cryptography',
  'Algorithms',
  'Systems & Efficiency',
] as const;

// A taste of what is coming: landmark, widely cited works across computer science. Titles only
// for now (no links), shown as preview cards so the hub reads as real, not empty.
export const PREVIEW: Paper[] = [
  // Modern AI / ML
  { title: 'Attention Is All You Need', org: 'Google', year: 2017, topics: ['LLMs', 'Systems & Efficiency'] },
  { title: 'Language Models are Few-Shot Learners', org: 'OpenAI', year: 2020, topics: ['LLMs'] },
  { title: 'Constitutional AI: Harmlessness from AI Feedback', org: 'Anthropic', year: 2022, topics: ['Alignment & Safety'] },
  { title: 'ReAct: Synergizing Reasoning and Acting', org: 'Google', year: 2022, topics: ['Agents', 'Reasoning'] },
  { title: 'Mistral 7B', org: 'Mistral AI', year: 2023, topics: ['SLMs'] },
  { title: 'Retrieval-Augmented Generation for NLP', org: 'Meta AI', year: 2020, topics: ['Retrieval'] },
  { title: 'LoRA: Low-Rank Adaptation of Large Models', org: 'Microsoft', year: 2021, topics: ['Training & Scaling'] },
  { title: 'Whisper: Robust Speech Recognition at Scale', org: 'OpenAI', year: 2022, topics: ['Multimodal'] },
  // Distributed systems
  { title: 'MapReduce: Simplified Data Processing on Large Clusters', org: 'Google', year: 2004, topics: ['Distributed Systems', 'Systems & Efficiency'] },
  { title: 'The Google File System', org: 'Google', year: 2003, topics: ['Distributed Systems'] },
  { title: 'In Search of an Understandable Consensus Algorithm (Raft)', org: 'Academic', year: 2014, topics: ['Distributed Systems', 'Algorithms'] },
  { title: 'Time, Clocks, and the Ordering of Events in a System', org: 'Academic', year: 1978, topics: ['Distributed Systems'] },
  // Databases
  { title: "Dynamo: Amazon's Highly Available Key-value Store", org: 'Amazon', year: 2007, topics: ['Databases', 'Distributed Systems'] },
  { title: 'A Relational Model of Data for Large Shared Data Banks', org: 'Academic', year: 1970, topics: ['Databases'] },
  // Networking
  { title: 'Congestion Avoidance and Control (TCP)', org: 'Academic', year: 1988, topics: ['Networking'] },
  // Operating systems
  { title: 'The UNIX Time-Sharing System', org: 'Academic', year: 1974, topics: ['Operating Systems'] },
  // Security & cryptography
  { title: 'New Directions in Cryptography (Diffie-Hellman)', org: 'Academic', year: 1976, topics: ['Security & Cryptography'] },
  { title: 'A Method for Obtaining Digital Signatures (RSA)', org: 'Academic', year: 1978, topics: ['Security & Cryptography', 'Algorithms'] },
  { title: 'Bitcoin: A Peer-to-Peer Electronic Cash System', org: 'Academic', year: 2008, topics: ['Security & Cryptography', 'Distributed Systems'] },
];
