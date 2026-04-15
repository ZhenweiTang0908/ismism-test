import logging
import os
from functools import lru_cache
from typing import Optional, Type, TypeVar

from openai import OpenAI
from pydantic import BaseModel

try:
    from dotenv import load_dotenv
except ImportError:  # pragma: no cover
    load_dotenv = None


logger = logging.getLogger(__name__)

T = TypeVar("T", bound=BaseModel)

DEFAULT_SILICONCLOUD_MODEL = "Pro/MiniMaxAI/MiniMax-M2.5"


def _load_env() -> None:
    if load_dotenv is not None:
        load_dotenv()


@lru_cache(maxsize=1)
def _get_siliconcloud_client() -> OpenAI:
    _load_env()

    api_key = os.getenv("SILICONCLOUD_API_KEY")
    base_url = os.getenv("SILICONCLOUD_BASE_URL", "https://api.siliconflow.cn/v1")

    if not api_key:
        raise ValueError("Missing SILICONCLOUD_API_KEY")

    return OpenAI(api_key=api_key, base_url=base_url)


def _get_model_name(model: Optional[str] = None) -> str:
    _load_env()
    return model or os.getenv("SILICONCLOUD_MODEL", DEFAULT_SILICONCLOUD_MODEL)


def _log_usage(model: str, usage: object, mode: str) -> None:
    if usage is None:
        return

    prompt_tokens = getattr(usage, "prompt_tokens", None)
    completion_tokens = getattr(usage, "completion_tokens", None)
    total_tokens = getattr(usage, "total_tokens", None)

    logger.info(
        "llm usage provider=siliconcloud model=%s mode=%s prompt_tokens=%s completion_tokens=%s total_tokens=%s",
        model,
        mode,
        prompt_tokens,
        completion_tokens,
        total_tokens,
    )


def _call_siliconcloud_structured(
    system_prompt: str,
    user_input: str,
    response_class: Type[T],
    temperature: float,
    model: Optional[str] = None,
) -> Optional[T]:
    client = _get_siliconcloud_client()
    model_name = _get_model_name(model)
    completion = client.beta.chat.completions.parse(
        model=model_name,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_input},
        ],
        response_format=response_class,
        temperature=temperature,
    )
    _log_usage(model_name, completion.usage, "structured")
    return completion.choices[0].message.parsed


def call_siliconcloud_structured(
    system_prompt: str,
    user_input: str,
    response_class: Type[T],
    temperature: float = 0.0,
    model: Optional[str] = None,
) -> Optional[T]:
    return _call_siliconcloud_structured(
        system_prompt=system_prompt,
        user_input=user_input,
        response_class=response_class,
        temperature=temperature,
        model=model,
    )
