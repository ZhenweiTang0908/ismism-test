from .azure_structured import LLMModel, call_gpt_structured
from .siliconcloud import (
    DEFAULT_SILICONCLOUD_MODEL,
    call_siliconcloud_structured,
)

call_structured = call_siliconcloud_structured

__all__ = [
    "DEFAULT_SILICONCLOUD_MODEL",
    "LLMModel",
    "call_gpt_structured",
    "call_siliconcloud_structured",
    "call_structured",
]
