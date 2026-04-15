import logging
import os
from enum import Enum
from functools import lru_cache
from typing import Optional, Type, TypeVar

from openai import AzureOpenAI
from pydantic import BaseModel

try:
    from dotenv import load_dotenv
except ImportError:  # pragma: no cover
    load_dotenv = None


logger = logging.getLogger(__name__)

T = TypeVar("T", bound=BaseModel)


class LLMModel(str, Enum):
    GPT = "gpt"


def _load_env() -> None:
    if load_dotenv is not None:
        load_dotenv()


@lru_cache(maxsize=1)
def _get_azure_client() -> AzureOpenAI:
    _load_env()

    endpoint = os.getenv("AZURE_OPENAI_ENDPOINT")
    api_key = os.getenv("AZURE_OPENAI_API_KEY")
    api_version = os.getenv("AZURE_OPENAI_API_VERSION", "2024-12-01-preview")

    if not endpoint:
        raise ValueError("Missing AZURE_OPENAI_ENDPOINT")
    if not api_key:
        raise ValueError("Missing AZURE_OPENAI_API_KEY")

    return AzureOpenAI(
        azure_endpoint=endpoint,
        api_key=api_key,
        api_version=api_version,
    )


def _get_model_name(model: LLMModel) -> str:
    _load_env()

    if model is LLMModel.GPT:
        deployment = os.getenv("AZURE_OPENAI_DEPLOYMENT")
        if not deployment:
            raise ValueError("Missing AZURE_OPENAI_DEPLOYMENT")
        return deployment

    raise ValueError(f"Unsupported model: {model}")


def _log_usage(model: LLMModel, usage: object, mode: str) -> None:
    if usage is None:
        return

    prompt_tokens = getattr(usage, "prompt_tokens", None)
    completion_tokens = getattr(usage, "completion_tokens", None)
    total_tokens = getattr(usage, "total_tokens", None)

    logger.info(
        "llm usage model=%s mode=%s prompt_tokens=%s completion_tokens=%s total_tokens=%s",
        model.value,
        mode,
        prompt_tokens,
        completion_tokens,
        total_tokens,
    )


def _call_gpt_structured(
    system_prompt: str,
    user_input: str,
    response_class: Type[T],
    temperature: float,
) -> Optional[T]:
    client = _get_azure_client()
    completion = client.beta.chat.completions.parse(
        model=_get_model_name(LLMModel.GPT),
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_input},
        ],
        response_format=response_class,
        temperature=temperature,
    )
    _log_usage(LLMModel.GPT, completion.usage, "structured")
    return completion.choices[0].message.parsed


def call_gpt_structured(
    system_prompt: str,
    user_input: str,
    response_class: Type[T],
    temperature: float = 0.0,
) -> Optional[T]:
    return _call_gpt_structured(
        system_prompt=system_prompt,
        user_input=user_input,
        response_class=response_class,
        temperature=temperature,
    )
