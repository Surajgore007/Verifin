import os
import json
import hashlib
from typing import Dict, Any, Optional
from dotenv import load_dotenv

# Load environment variables
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), ".env"))

CACHE_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "seed", "llm_cache")
os.makedirs(CACHE_DIR, exist_ok=True)

class LLMProvider:
    def __init__(self, model_name: str = "openai/gpt-oss-120b"):
        self.api_key = os.getenv("GROQ_API_KEY")
        self.model_name = model_name
        self.client = None
        if self.api_key:
            try:
                from groq import Groq
                self.client = Groq(api_key=self.api_key)
            except Exception as e:
                print(f"Warning: could not initialize Groq client: {e}")

    def _get_cache_key(self, prompt: str, system_prompt: str) -> str:
        content = f"{system_prompt}\n---\n{prompt}"
        return hashlib.sha256(content.encode("utf-8")).hexdigest()

    def generate_json(
        self,
        prompt: str,
        system_prompt: str = "You are a precise financial assistant. Always respond with valid JSON.",
        fallback_data: Optional[Dict[str, Any]] = None,
        cache_key_override: Optional[str] = None
    ) -> Dict[str, Any]:
        cache_key = cache_key_override or self._get_cache_key(prompt, system_prompt)
        cache_file = os.path.join(CACHE_DIR, f"{cache_key}.json")

        # 1. Check disk cache first (offline guarantee)
        if os.path.exists(cache_file):
            try:
                with open(cache_file, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception as e:
                print(f"Error reading cache {cache_file}: {e}")

        # 2. If client available and online, call Groq API
        if self.client:
            for attempt in range(2): # Retry once on invalid output
                try:
                    response = self.client.chat.completions.create(
                        messages=[
                            {"role": "system", "content": system_prompt},
                            {"role": "user", "content": prompt}
                        ],
                        model=self.model_name,
                        response_format={"type": "json_object"},
                        temperature=0.1
                    )
                    raw_text = response.choices[0].message.content
                    parsed = json.loads(raw_text)
                    
                    # Cache successful result
                    with open(cache_file, "w", encoding="utf-8") as f:
                        json.dump(parsed, f, indent=2)
                    return parsed
                except Exception as e:
                    print(f"Groq API attempt {attempt+1} failed: {e}")
                    if attempt == 1:
                        break

        # 3. If offline or failed, use provided fallback fixture
        if fallback_data is not None:
            # Cache the fallback data so next call uses cache
            try:
                with open(cache_file, "w", encoding="utf-8") as f:
                    json.dump(fallback_data, f, indent=2)
            except Exception:
                pass
            return fallback_data

        raise RuntimeError("No cached LLM response available and online provider call failed.")

    def generate_text(
        self,
        prompt: str,
        system_prompt: str = "You are an institutional financial analyst.",
        temperature: float = 0.1
    ) -> str:
        cache_key = self._get_cache_key(prompt, system_prompt)
        cache_file = os.path.join(CACHE_DIR, f"{cache_key}.txt")

        if os.path.exists(cache_file):
            try:
                with open(cache_file, "r", encoding="utf-8") as f:
                    return f.read()
            except Exception:
                pass

        if self.client:
            try:
                response = self.client.chat.completions.create(
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": prompt}
                    ],
                    model=self.model_name,
                    temperature=temperature
                )
                text = response.choices[0].message.content
                with open(cache_file, "w", encoding="utf-8") as f:
                    f.write(text)
                return text
            except Exception as e:
                print(f"Groq text call failed: {e}")

        raise RuntimeError("LLM call failed and no cached response.")

# Singleton
global_llm = LLMProvider()

def query_llm(prompt: str, system_prompt: str = "You are an institutional financial analyst.", temperature: float = 0.1) -> str:
    return global_llm.generate_text(prompt, system_prompt, temperature)
