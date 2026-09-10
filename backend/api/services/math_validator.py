from .sympy_validator import verify_with_sympy
from .wolfram_validator import verify_with_wolfram

VERIFIABLE_FORMATS = {"word problem", "short answer", "situational (sit)"}


def verify_question(question: dict) -> dict:
    """
    Attaches a `verification` dict to the question in place and returns it:
      {"status": "verified" | "mismatch" | "unsupported" | "skipped",
       "engine": "sympy" | "wolfram" | None,
       "detail": str | None}

    Does NOT mutate answer/solution/hint — the caller decides what to do
    on a mismatch (regenerate, retry, or just flag for review).
    """
    fmt = (question.get("format") or "").strip().lower()
    verification_expression = question.get("verification_expression")
    answer = question.get("answer", "")

    if fmt not in VERIFIABLE_FORMATS or not verification_expression:
        question["verification"] = {"status": "skipped", "engine": None, "detail": None}
        return question

    status, detail = verify_with_sympy(verification_expression, answer)
    engine = "sympy"

    if status == "unsupported":
        status, detail = verify_with_wolfram(verification_expression, answer)
        engine = "wolfram"

    question["verification"] = {"status": status, "engine": engine, "detail": detail}
    return question


def verify_questions(questions: list) -> list:
    return [verify_question(q) for q in questions]


def needs_math_regeneration(question: dict) -> bool:
    return question.get("verification", {}).get("status") == "mismatch"