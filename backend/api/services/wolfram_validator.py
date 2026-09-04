import os
import xml.etree.ElementTree as ET

import requests
from sympy import sympify, simplify
import re

WOLFRAM_APP_ID = os.getenv("WOLFRAM_APP_ID")
FULL_RESULTS_URL = "https://api.wolframalpha.com/v2/query"

PRIORITY_POD_TITLES = [
    "Result",
    "Solution",
    "Solutions",
    "Value",
    "Real solution",
    "Real solutions",
    "Decimal approximation",
]

class WolframNotConfigured(Exception):
    pass

def query_wolfram_full_results(query: str, timeout: int = 12) -> dict:
    if not WOLFRAM_APP_ID:
        raise WolframNotConfigured("WOLFRAM_APP_ID env var is not set")

    params = {"input": query, "appid": WOLFRAM_APP_ID, "format": "plaintext"}
    response = requests.get(FULL_RESULTS_URL, params=params, timeout=timeout)
    response.raise_for_status()

    root = ET.fromstring(response.content)
    if root.attrib.get("success") != "true":
        return {"success": False, "pods": []}

    pods = []
    for pod in root.findall("pod"):
        title = pod.attrib.get("title", "")
        texts = [pt.text for pt in pod.findall(".//plaintext") if pt.text]
        if texts:
            pods.append({"title": title, "text": texts[0]})

    return {"success": True, "pods": pods}


def _extract_result_text(pods: list):
    for title in PRIORITY_POD_TITLES:
        for pod in pods:
            if pod["title"].lower() == title.lower():
                return pod["text"]
    for pod in pods:
        if pod["title"].lower() not in ("input", "input interpretation"):
            return pod["text"]
    return None



def verify_with_wolfram(verification_expression: str, expected_answer: str):
    try:
        result = query_wolfram_full_results(verification_expression)
    except WolframNotConfigured as e:
        return "unsupported", str(e)
    except Exception as e:
        return "unsupported", f"wolfram request failed: {e}"

    if not result["success"] or not result["pods"]:
        return "unsupported", "wolfram could not interpret the query"

    result_text = _extract_result_text(result["pods"])
    if result_text is None:
        return "unsupported", "no usable result pod from wolfram"

    from .sympy_validator import _clean_latex, _parse_answer
    try:
        wolfram_val = float(sympify(_clean_latex(result_text)))
        expected = _parse_answer(expected_answer)
        if expected is not None:
            expected_val = complex(expected.evalf()).real
            if abs(wolfram_val - expected_val) < 1e-3 or abs(wolfram_val - expected_val) / max(abs(wolfram_val), 1) < 1e-3:
                return "verified", result_text
    except Exception:
        pass 

    normalized_result = result_text.strip().lower().replace(" ", "")
    normalized_expected = (expected_answer or "").strip().lower().replace(" ", "").strip("$")
    if normalized_expected and normalized_expected in normalized_result:
        return "verified", result_text

    return "mismatch", result_text