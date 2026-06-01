export interface Provider {
  url: string
  env: string // env var name with api key
  models: {
    [key: string]: string|{
      model: string
      prefix?: string
      wait?: number
      postParams: {
        [key: string]: string|number|null|any
      }
      headers?:{
        [key:string]: string
      }
    }
  }
}

export interface ModelConfig {
  providerName: string
  provider: Provider
  model: string
  prefix?: string
  wait: number
  postParams: {
    [key: string]: string|number|null
  }
  headers:{
    [key:string]: string
  }
}

export let providers: {
  [key: string]: Provider
} = {
  openai: {
    url: 'https://api.openai.com/v1/chat/completions',
    env: 'OPENAI_API_KEY',
    models: {
      "o3-mini": {model:"o3-mini-2025-01-31",
        postParams: {
          max_tokens: null, temperature: null,
          max_completion_tokens:16384,
        }
      },
      "o3": {model:"o3-2025-04-16",
        postParams: {
          max_tokens: null, temperature: null,
          max_completion_tokens:50000,
        }
      },
      "gpt-4.1-nano": {model:"gpt-4.1-nano-2025-04-14",
        postParams: {
          max_tokens: null, temperature: null,
          max_completion_tokens:16384,
        }
      },
      "gpt-4.1-mini": {model:"gpt-4.1-mini-2025-04-14",
        postParams: {
          max_tokens: null, temperature: null,
          max_completion_tokens:16384,
        }
      },
      "gpt-4.1": {model:"gpt-4.1-2025-04-14",
        postParams: {
          max_tokens: null, temperature: null,
          max_completion_tokens:16384,
        }
      },
      "o4-mini":{"model":"o4-mini-2025-04-16",
        postParams: {
          max_tokens: null, temperature: null,
          max_completion_tokens:16384,
        }
      },
      "o1-mini": {model:"o1-mini-2024-09-12",
        postParams: {
          max_tokens: null, temperature: null,
          max_completion_tokens:16384,
        }
      },
      "o1": {
        model: "o1-2024-12-17",
        postParams: {
          max_tokens: null, temperature: null,
          max_completion_tokens:16384,
        }
      },
      "o1-preview": {
        model: "o1-preview-2024-09-12",
        postParams: {
          max_tokens: null, temperature: null,
          max_completion_tokens:16384,
        }
      },
      "gpt-4o": "gpt-4o-2024-11-20",
      "gpt-4o-mini": "gpt-4o-mini-2024-07-18",
      "gpt-4-turbo-2024-04-09":"gpt-4-turbo-2024-04-09",
      "gpt-4-0125-preview":"gpt-4-0125-preview",
      "gpt-4.5-preview":"gpt-4.5-preview-2025-02-27"
    }
  },

  openai2: {
    url: 'https://api.openai.com/v1/responses',
    env: 'OPENAI_API_KEY',
    models: {
      "o1-pro": {
        model: "o1-pro-2025-03-19",
        postParams: {
          max_tokens: null, temperature: null,
          max_output_tokens: 16384,
        }
      },
      "o3-responses": {
        model: "o3-2025-04-16",
        postParams: {
          max_tokens: null, temperature: null,
          max_output_tokens: 50000,
        }
      },
      "gpt-4o-responses": {
        model: "gpt-4o-2024-08-06",
        postParams: {
          max_tokens: null, temperature: null,
          max_output_tokens: 16384,
        }
      },
      "gpt-5-nano-2025-08-07":{
        model: "gpt-5-nano-2025-08-07",
        postParams: {
          max_tokens: null, temperature: null,
          max_output_tokens: 16384,
          stream: true,
        }
      },
      "gpt-5-nano-2025-08-07-high":{
        model: "gpt-5-nano-2025-08-07",
        postParams: {
          max_tokens: null, temperature: null,
          max_output_tokens: 200000,
          stream: true,
          reasoning: {effort:"high"}
        }
      },
      "gpt-5-mini-2025-08-07":{
        model: "gpt-5-mini-2025-08-07",
        postParams: {
          max_tokens: null, temperature: null,
          max_output_tokens: 16384,
          stream: true,
        }
      },
      "gpt-5-mini-2025-08-07-high":{
        model: "gpt-5-mini-2025-08-07",
        postParams: {
          max_tokens: null, temperature: null,
          max_output_tokens: 200000,
          stream: true,
          reasoning: {effort:"high"}
        }
      },
      "gpt-5-2025-08-07":{
        model: "gpt-5-2025-08-07",
        postParams: {
          max_tokens: null, temperature: null,
          max_output_tokens: 16384,
          stream: true,
        }
      },
      "gpt-5-2025-08-07-high":{
        model: "gpt-5-2025-08-07",
        postParams: {
          max_tokens: null, temperature: null,
          max_output_tokens: 200000,
          stream: true,
          reasoning: {effort:"high"}
        }
      },
      "gpt-5-codex":{
        model: "gpt-5-codex",
        postParams: {
          max_tokens: null, temperature: null,
          max_output_tokens: 200000,
          stream: true,
        }
      },
      "gpt-5-codex-high":{
        model: "gpt-5-codex",
        postParams: {
          max_tokens: null, temperature: null,
          max_output_tokens: 200000,
          stream: true,
          reasoning: {effort:"high"}
        }
      },
      "gpt-5.2-nr":{
        model: "gpt-5.2-2025-12-11",
        postParams: {
          max_tokens: null, temperature: null,
          max_output_tokens: 200000,
          stream: true,
          reasoning: {effort:"none"}
        }
      },
      "gpt-5.2-pro-medium":{
        model: "gpt-5.2-pro-2025-12-11",
        postParams: {
          max_tokens: null, temperature: null,
          max_output_tokens: 200000,
          stream: true,
          reasoning: {effort:"medium"}
        }
      },
      "gpt-5.2-low":{
        model: "gpt-5.2-2025-12-11",
        postParams: {
          max_tokens: null, temperature: null,
          max_output_tokens: 200000,
          stream: true,
          reasoning: {effort:"low"}
        }
      },
      "o3-pro":{
        model: "o3-pro",
        postParams: {
          max_tokens: null, temperature: null,
          max_output_tokens: 16384,
          stream: true,
        }
      }
    }
    },
  xai: {
    url: 'https://api.x.ai/v1/chat/completions',
    env: 'XAI_API_KEY',
    models: {
      "grok-3-beta": "grok-3-beta",
      "grok-3-mini-beta": "grok-3-mini-beta",
      "grok-2": "grok-2-1212",
      "grok-2-vision": "grok-2-vision-1212",
    }
  },
  anthropic: {
    url: 'https://api.anthropic.com/v1/messages',
    env: 'ANTHROPIC_API_KEY',
    models:
      {
        "sonnet-3-7-0219-32k":{
          "model":"claude-3-7-sonnet-20250219",
          postParams:{
            "max_tokens": 128000,
            "temperature":1,
            "thinking": {
              "type": "enabled",
              "budget_tokens": 32000,
            },
          },
          headers:{
            "anthropic-version":"2023-06-01",
            "anthropic-beta": "output-128k-2025-02-19",
          }
        },
        "opus-4-5-32k-stream":{
          "model":"claude-opus-4-5",//-20251101
          postParams:{
            "max_tokens": 64000,
            "temperature":1,
            "thinking": {
              "type": "enabled",
              "budget_tokens": 32000,
            },
            "stream": true,
          },
          headers:{
            "anthropic-version":"2023-06-01",
            // "anthropic-beta": "output-128k-2025-02-19",
          }
        },
        "opus-3":{
          "model":"claude-3-opus-20240229",
          postParams:{
            "max_tokens": 4096,
            "temperature":1,
            "stream": true,
          },
          headers:{
            "anthropic-version":"2023-06-01",
            // "anthropic-beta": "output-128k-2025-02-19",
          }
        },
        "sonnet-4-5-32k-stream":{
          "model":"claude-sonnet-4-5",//-20251101
          postParams:{
            "max_tokens": 64000,
            "temperature":1,
            "thinking": {
              "type": "enabled",
              "budget_tokens": 32000,
            },
            "stream": true,
          },
          headers:{
            "anthropic-version":"2023-06-01",
          }
        },
        "haiku-4-5-32k-stream":{
          "model":"claude-haiku-4-5",//-20251101
          postParams:{
            "max_tokens": 64000,
            "temperature":1,
            "thinking": {
              "type": "enabled",
              "budget_tokens": 32000,
            },
            "stream": true,
          },
          headers:{
            "anthropic-version":"2023-06-01",
          }
        },
        "sonnet-3-7-0219-32k-stream":{
          "model":"claude-3-7-sonnet-20250219",
          postParams:{
            "max_tokens": 128000,
            "temperature":1,
            "thinking": {
              "type": "enabled",
              "budget_tokens": 32000,
            },
            "stream": true,
          },
          headers:{
            "anthropic-version":"2023-06-01",
            "anthropic-beta": "output-128k-2025-02-19",
          }
        },
      "sonnet-3-7-0219":"claude-3-7-sonnet-20250219",
      "sonnet-3-5-1022": "claude-3-5-sonnet-20241022",
      "sonnet-3-5": "claude-3-5-sonnet-20241022",
      "sonnet-3-5-0620":"claude-3-5-sonnet-20240620",
      "haiku-3-5-1022":"claude-3-5-haiku-20241022",
      "opus-3-5":"claude-3-opus-20240229",
    }
  },
  deepseek:{
    url: 'https://api.deepseek.com/chat/completions',
    env: 'DEEPSEEK_API_KEY',
    models: {
      "deepseek-v3-cn":"deepseek-chat",
      "deepseek-r1-cn":{
        model:"deepseek-reasoner",
        postParams: {
          max_tokens: 8192,
        },
      }
    }
  },
  mymac:{
    "url":"http://localhost:8531/v1/chat/completions",
    "env":"MYMAC_API_KEY",
    "models":{
      "--deepscaler-1.5b-preview":"agentica-org/DeepScaleR-1.5B-Preview",
    }
  },
  openrouter:{
    url: 'https://openrouter.ai/api/v1/chat/completions',
    env: 'OPENROUTER_API_KEY',
    models: {
      "cogito-v2.1-671b":{
        "model":"deepcogito/cogito-v2.1-671b",
        postParams:{
          stream:true,
          max_tokens:64000,
          streamOptions: {
            includeUsage: true
          }
        }
      },
      "prime-intellect-3":{
        "model":"prime-intellect/intellect-3",
        postParams:{
          stream:true,
          max_tokens:64000,
          streamOptions: {
            includeUsage: true
          }
        }
      },
      "glm-4.5-air":{
        "model":"z-ai/glm-4.5-air",
        postParams:{
          stream:true,
          max_tokens:64000,
          streamOptions: {
            includeUsage: true
          },
          reasoning:{
            effort:'high'
          }
        }
      },
      "glm-4.7":{
        "model":"z-ai/glm-4.7",
        postParams:{
          stream:true,
          max_tokens:128000,
          streamOptions: {
            includeUsage: true
          },
          reasoning:{
            effort:'high'
          },   provider:{
            order:["z-ai"]
          }
        }
      },
      "gpt-oss-120b-or":{
        "model":"openai/gpt-oss-120b",
        postParams:{
          stream:true,
          max_tokens:64000,
          streamOptions: {
            includeUsage: true
          },
          reasoning:{
            effort:'high'
          },
          // provider:{
          //   order:["Groq",""]
          // }
        }
      },
      "minimax-m2":{
        "model":"minimax/minimax-m2",
        postParams:{
          stream:true,
          max_tokens:64000,
          streamOptions: {
            includeUsage: true
          },
          reasoning:{
            effort:'high'
          }
        }
      },
      "hermes-4-70b":{
        "model":"nousresearch/hermes-4-70b",
        postParams:{
          stream:true,
          max_tokens:64000,
          streamOptions: {
            includeUsage: true
          },
          reasoning:{
            effort:'high'
          }
        }
      },
      "cogito-v2.1-671b-high":{
        "model":"deepcogito/cogito-v2.1-671b",
        postParams:{
          stream:true,
          max_tokens:64000,
          streamOptions: {
            includeUsage: true
          },
          reasoning:{
            effort:'high'
          }
        }
      },
      "olmo-3-32b-think":{ // SLOW
        "model":"allenai/olmo-3-32b-think",
        postParams:{
          stream:true,
          max_tokens:64000,
          streamOptions: {
            includeUsage: true
          }
        }
      },
      "gemini3-flash-preview":{
        "model":"google/gemini-3-flash-preview",
        postParams:{
          stream:true,
          max_tokens:128000,
          streamOptions: {
            includeUsage: true
          }
        }
      },
      "gemini3-flash-preview-n":{
        "model":"google/gemini-3-flash-preview",
        prefix:"Draw nodes as single letters. No boxes or brackets. ",
        postParams:{
          stream:true,
          max_tokens:128000,
          streamOptions: {
            includeUsage: true
          }
        }
      },
      "grok-4-1-fast":{
        "model":"x-ai/grok-4.1-fast:free",
        postParams:{
          stream:true,
          max_tokens:32000,
          streamOptions: {
            includeUsage: true
          }
        }
      },
      "k2-0905-fp8-fw":{
        "model":"moonshotai/kimi-k2-0905",
        postParams:{
          stream:true,
          max_tokens:2048,
          provider:{
            order:["Fireworks"]
          }
        }
      },
      "k2-thinking":{
        "model":"moonshotai/kimi-k2-thinking",
        postParams:{
          stream:true,
          max_tokens:64000,
        }
      },
      "k2-0905-fp8-fw-32k":{
        "model":"moonshotai/kimi-k2-0905",
        postParams:{
          stream:true,
          max_tokens:32768,
          provider:{
            order:["Fireworks"]
          }
        }
      },
      "k2-0905-fp8-fw-prompt":{
        "model":"moonshotai/kimi-k2-0905",
        prefix: "", // whatever, it doesnt change a lot
        postParams:{
          stream:true,
          max_tokens:32768,
          provider:{
            order:["Fireworks"]
          }
        }
      },
      "deepseek-r1": {
        model:"deepseek/deepseek-r1",
        postParams: {
          max_tokens: 16384,
          "provider":{
            "order":["Friendli","DeepInfra"],
          }
        }
      }, // todo limit 8b separately here
      "deepseek-prover-v2":"deepseek/deepseek-prover-v2",
      "glm-z1-rumination-32b":"thudm/glm-z1-rumination-32b",
      "perplexity-r1-1776":"perplexity/r1-1776", // bad
      "aion-1.0":"aion-labs/aion-1.0",
      "deepseek-v3":"deepseek/deepseek-chat",
      "phi-4":"microsoft/phi-4",
      "phi-4-rp":"microsoft/phi-4-reasoning-plus",
      "deepcoder-14b":"agentica-org/deepcoder-14b-preview:free",
      "qwen-max":"qwen/qwen-max",
      "r1-llama-8b":"deepseek/deepseek-r1-distill-llama-8b",
      "r1-qwen-14b":{model:"deepseek/deepseek-r1-distill-qwen-14b",
        postParams: {
          "provider":{
            "order":["Together"]
          }
        }
      },"gemini-2.5-pro-preview-05-06":{
//openrouter + g remapping is shit
          model:  "google/gemini-2.5-pro-preview",
        postParams:{
          max_tokens: 32768,
        }
    },
      "qwen3-235b":{
        model:"qwen/qwen3-235b-a22b",
        postParams:{
          max_tokens: 16384,
        }
      },
      "qwen3-32b":{
        model:"qwen/qwen3-32b",
        postParams:{
          max_tokens: 16384,
        }
      },
      "qwen3-14b":{
        model:"qwen/qwen3-14b",
        postParams:{
          max_tokens: 16384,
        }
      },
      "qwen3-8b":{
        model:"qwen/qwen3-8b",
        postParams:{
          max_tokens: 16384,
        }
      },
      "qwen3-4b":{
        model:"qwen/qwen3-4b:free",
        postParams:{
          max_tokens: 16384,
        }
      },
      "qwen3-1.7b":{
        model:"qwen/qwen3-1.7b:free",
        postParams:{
          max_tokens: 16384,
        }
      },
      "qwen3-0.6b":{
        model:"qwen/qwen3-0.6b-04-28:free",
        postParams:{
          max_tokens: 16384,
        }
      },
      "qwen3-30b-a3b":{
        model:"qwen/qwen3-30b-a3b",
        postParams:{
          max_tokens: 16384,
        }
      },
      "mercury-coder-small-beta":{
        model:"inception/mercury-coder-small-beta",
        postParams:{
          max_tokens: 16384,
        }
      },
      "qwen3-coder-480b-ov":{
        model: "qwen/qwen3-coder",
        postParams:{
          "provider":{
            "order":["google-vertex"],
            "only":["google-vertex"],
          },
          max_tokens: 64000,
        }
      },
      "qwen3-next-80b-a3b-instruct":{
        model: "qwen/qwen3-next-80b-a3b-instruct",
        postParams:{
          "provider":{
            "order":["google-vertex"],
            "only":["google-vertex"],
          },
          max_tokens: 64000,
        }
      },
      "qwen3-next-80b-a3b-thinking":{
        model: "qwen/qwen3-next-80b-a3b-thinking",
        postParams:{
          "provider":{
            "order":["google-vertex"],
            "only":["google-vertex"],
          },
          max_tokens: 64000,
        }
      },
      "llama4-maverick":"meta-llama/llama-4-maverick",
      "codestral-2501":"mistralai/codestral-2501",
      "mistral-large-2411":"mistralai/mistral-large-2411",
      "qwen-2.5-72b-instruct": {
        model: "qwen/qwen-2.5-72b-instruct",
        postParams: {
          "provider":{
            "sort":"throughput",
            "order":["SambaNova","Hyperbolic","Nebius"]
          }
        }
      },
      "llama-3.1-tulu-3-405b":"allenai/llama-3.1-tulu-3-405b",
      "llama-3.1-405b":{
        "model":"meta-llama/llama-3.1-405b-instruct",
        "postParams": {
//          "max_tokens": 4096,
          "provider":{
            "order":["SambaNova"],
          }
        }
      },
      "llama-3.3-70b":{
        "model":"meta-llama/llama-3.3-70b-instruct",
        "postParams": {
          "provider":{
            "order":["SambaNova"],
          }
        }
      },
      "lfm-40b":{
        "model":"liquid/lfm-40b",
        "postParams": {
        }
      },
      "lfm-7b":{
        "model":"liquid/lfm-7b",
        "postParams": {
        }
      },
      "minimax-01":{
        "model":"minimax/minimax-01",
        "postParams": {
        }
      },
      "gemma3":{
        "model":"google/gemma-3-27b-it",
        "postParams": {
        }
      },
      "mistral-small-3.1-24b":{
        "model":"mistralai/mistral-small-3.1-24b-instruct-2503",
        "postParams": {
        }
      },
      "quasar":{
        "model":"openrouter/quasar-alpha",
        "postParams": {}
      },
      "deepseek-v3-0324":{
        "model":"deepseek/deepseek-chat-v3-0324",
        "postParams": {}
      },
      "olmo-2":{
        "model":"allenai/olmo-2-0325-32b-instruct",
        "postParams": {}
      },
      "jamba-1.6-large":{
        "model":"ai21/jamba-1.6-large",
        "postParams": {}
      },
      "qwerky-72b":{
        "model":"featherless/qwerky-72b:free",
        "postParams": {}
      },
      "reka-flash-3-21b-or":{
        "model":"rekaai/reka-flash-3:free",
        "postParams": {}
      }
    }
  },
  google:{
    url: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
    env: 'GEMINI_API_KEY',
    models: {
      'gemini-2.0-flash': 'gemini-2.0-flash-001',
      'gemini-2.0-pro-exp-02-05': {
        model:'gemini-2.0-pro-exp-02-05',
        wait: 15, // 5 RPM. requires backoff
        postParams:{},
      },
      'gemini-2.0-flash-thinking-exp-01-21':{
        model:'gemini-2.0-flash-thinking-exp-01-21',
        wait: 7, // 10 RPM. requires backoff
        postParams:{},
      },
      "gemini-2.5-pro-preview-03-25":{
        model: "models/gemini-2.5-pro-preview-03-25",
        wait: 1, // 10 RPM. requires backoff
        postParams:{
          max_tokens:16384,
        },
      }
    }
  },
  lmstudio:{
    url:'http://localhost:11234/v1/chat/completions',
    env:'HOME', // nop
    models:{
      "reka-flash-3-21b":{
        "model":"reka-flash-3-21b-reasoning-uncensored-max-neo-imatrix",
        postParams:{
          stream:false
        }
      },
      "gpt-oss-20b-mxfp4-mlx":{
        "model":"gpt-oss-20b",
        postParams:{
          stream:true,
          max_tokens:32768,
        }
      },
      "gpt-oss-120b-mxfp4-mlx":{
        "model":"openai/gpt-oss-120b",
        postParams:{
          stream:true
        }
      },
    },
  },
  ollama:{
    url:'http://localhost:11434/api/chat',
    env:'OLLAMA_API_KEY', // nop
    models:{
      // default is q4_k_m
      "qwen-2.5-coder-32b":{model:"qwen2.5-coder:32b",
        postParams:{
          stream:false,
        }
      },
      "deepscaler-1.5b-preview":{
        "model":"hf.co/bartowski/agentica-org_DeepScaleR-1.5B-Preview-GGUF:latest",
        postParams:{
          stream:false,
        }
      },
      "qwen-2.5-coder-14b-q8":{model:"qwen2.5-coder:14b-instruct-q8_0",
        postParams:{
          stream:false,
        }
      },
      "qwen-2.5-coder-14b":{model:"qwen2.5-coder:14b",
        postParams:{
          stream:false,
        }
      },
      "qwen-2.5-coder-7b":{model:"qwen2.5-coder:7b",
        postParams:{
          stream:false,
        }
      },
      "steiner-preview":{model:"hf.co/peakji/steiner-32b-preview-gguf",
        postParams:{
          stream:false,
        }
      },
    }
  },
  groq: {
    url: "https://api.groq.com/openai/v1/chat/completions",
    env: 'GROQ_API_KEY',
    models: {
      "r1-70b": {
        model: "deepseek-r1-distill-llama-70b-specdec",
        postParams: {
          max_tokens: 16384//, temperature: 0.7,
        },
      },
      "r1-32b":{model: "deepseek-r1-distill-qwen-32b",
        postParams: {
          max_tokens: 8192//, temperature: 0.07,
        },
      },
      "qwq-32b": {model:
        "qwen-qwq-32b",
        postParams: {
          max_tokens: 32768
        },
      },
      "llama4-scout":"meta-llama/llama-4-scout-17b-16e-instruct",
      "llama-3.3-70b": "llama-3.3-70b-specdec",
      "qwen-2.5-coder-32b": "qwen-2.5-coder-32b",
      "llama-3.2-1b": "llama-3.2-1b-preview",
      "llama-3.2-3b": "llama-3.2-3b-preview",
      "llama-3.2-90b-vision": "llama-3.2-90b-vision-preview",
      "llama-3.2-11b-vision": "llama-3.2-11b-vision-preview",
      "gemma2-9b-it": "gemma2-9b-it",
      "llama-3.1-8b": "llama-3.1-8b-instant",
      "mixtral-8x7b": "mixtral-8x7b-32768",
      "qwen-2.5-32b": "qwen-2.5-32b",
    }
  },
  huggingface: {
    url:"http://hf.space",
    env:"HUGGINGFACE_TOKEN",
    models:{
      "hunyuan-t1":"tencent/Hunyuan-T1",
    }
  },
  nous_k3:{
    url: 'https://rescue-complimentary-oxygen-fine.trycloudflare.com/v1/chat/completions',
    env: 'HOME',
    models:{
      "k3-k2-fm-fp8-251006":{
        model:"/home/ggb/sglang-work/K2-FM-FP8",
        postParams:{
          stream:true,
          max_tokens:2048,

        }
      }
    }
  }
}

export function findModelConfig(model: string): ModelConfig {
  for (let providerName in providers) {
    let provider = providers[providerName]
    if (model in provider.models) {
      let details = provider.models[model]
      return {
        providerName,
        provider,
        prefix: typeof details === 'string' ? undefined : details.prefix,
        wait: typeof details === 'string' ? 0 : (details.wait||0),
        model: typeof details === 'string' ? details : details.model,
        postParams: typeof details === 'string' ? {} : details.postParams,
        headers: typeof details === 'string' ? {} : (details.headers||{})
      }
    }
  }
  throw new Error(`model ${model} not found`)
}
