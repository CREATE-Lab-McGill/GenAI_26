import os
import re
import json
from dotenv import load_dotenv
from google import genai
from google.genai import types
from pydantic import BaseModel
from typing import List

load_dotenv()

client = genai.Client(
    api_key=os.getenv("GEMINI_API_KEY")
)


class MathQuestion(BaseModel):
    prompt: str
    answer: str
    solution: str
    hint: str
    format: str
    topic: str
    subtopic: str
    prepLevel: str
    difficulty: str


class MathProblemSet(BaseModel):
    questions: List[MathQuestion]


class EditedQuestion(BaseModel):
    prompt: str
    answer: str
    solution: str
    hint: str


class EditedQuestionWithId(BaseModel):
    id: str
    prompt: str
    answer: str
    solution: str
    hint: str


class EditedQuestionSet(BaseModel):
    questions: List[EditedQuestionWithId]

class ResyncedQuestion(BaseModel):
    answer: str
    solution: str
    hint: str

class AlternativeQuestion(BaseModel):
    prompt: str
    answer: str
    solution: str
    hint: str

LATEX_INSTRUCTIONS = """
CRITICAL INSTRUCTIONS FOR FORMATTING AND LATEX (APPLIES TO ALL JSON FIELDS: prompt, answer, solution, hint):
1. LATEX COMMANDS ONLY — DOUBLE-ESCAPE BACKSLASHES: For LaTeX commands 
   specifically (\\\\frac, \\\\le, \\\\times, \\\\cdot, etc.) you MUST double-escape 
   the backslash EXACTLY ONCE (e.g. write \\\\frac, \\\\times — never \\\\\\\\frac 
   or \\\\\\\\times with extra backslashes). Each LaTeX command must decode to 
   exactly ONE backslash followed by the command name. This rule does NOT 
   apply to newlines — never write the literal two-character sequence 
   backslash+n ("\\\\n") as visible text anywhere in a field. If you need to 
   separate steps, start a new numbered item directly (e.g. "1. ... 2. ... 
   3. ...") within the same continuous line — never insert the escaped 
   string "\\\\n" or "\\\\t".
2. ALWAYS WRAP MATH IN $: You MUST wrap all math, fractions, numbers, and variables in dollar signs. NEVER leave a raw latex command outside of $. (Correct: $\\\\frac{4}{5}$. Incorrect: \\\\frac{4}{5}).
3. NO REDUNDANT DECIMALS: NEVER write exponents with an unnecessary `.0` (e.g., write $1.5^2$).
4. MULTIPLE CHOICE FORMATTING: For multiple choice questions, the "prompt" field 
   must include exactly 4 options as a vertical Markdown bullet list, each one 
   starting with its letter followed by a closing parenthesis: "A) ", "B) ", 
   "C) ", "D) ". Example:
   - A) $\\frac{1}{2}$
   - B) $\\frac{2}{3}$
   - C) $\\frac{3}{4}$
   - D) $\\frac{4}{5}$
5. DISPLAY MATH FOR FRACTIONS: You MUST use \\\\frac{a}{b} for fractions. If an equation contains a \\\\frac, you MUST wrap the ENTIRE equation in double dollar signs (e.g., $$ G(x) = \\\\frac{0.4x+0.2}{0.8} $$) so it renders centered and prevents overlapping. Use single $ ONLY for flat variables or numbers without fractions.
6. NO SELF-CORRECTION: The "solution" field must contain ONLY the final, 
   already-verified steps. Do NOT show any internal reasoning, doubt, or 
   recalculation. 
   BAD EXAMPLE (never do this): "First: 6/12x^2. Wait, let me recalculate..."
   GOOD EXAMPLE (always do this): "First: 6/12x^2 = 1/2x^2. Outer: -4/15x..."
   If you find an error while computing, silently redo the math and only 
   output the corrected final version — never mention the correction happened.
7. NO LINE BREAKS MID-SENTENCE: Never insert literal newlines or the escaped 
   string "\\\\n" in the middle of a sentence or list item. Each bullet point, 
   question part, or sentence must be written as ONE continuous line of text, 
   even if it's long. Only start a new numbered item when starting a truly 
   separate part/step (e.g. "1. ...", "2. ...", "- A) ...").
8. NEVER LEAVE PLAIN ENGLISH INSIDE $ DELIMITERS: Close every $ or $$ 
   IMMEDIATELY after the math expression ends — before continuing with 
   English words, numbered items, or punctuation like ").". 
   WRONG: "the rate is $-\\frac{3}{4} per month). 2. The domain is $0 \\le m \\le 30$"
   RIGHT: "the rate is $-\\frac{3}{4}$ per month). 2. The domain is $0 \\le m \\le 30$"
   Every single $ you open MUST have a matching closing $ before the next 
   English word begins. Double-check that each field has an EVEN number of $ symbols.
9. NTH ROOTS — CONSISTENT NOTATION, NO REDUNDANT REWRITES: Always write an 
   nth root as \\\\sqrt[n]{...} with the FULL radicand inside the braces every 
   single time you write it — never split a root across a bare number and a 
   fraction (e.g. NEVER write "3\\\\sqrt{8}/343"). If applying the quotient 
   rule \\\\sqrt[n]{a/b} = \\\\sqrt[n]{a}/\\\\sqrt[n]{b}, the index n MUST appear on 
   BOTH resulting radicals: \\\\sqrt[3]{8}/\\\\sqrt[3]{343}, not \\\\sqrt[3]{8}/343.
   Also: do NOT restate the same intermediate value in two different LaTeX 
   notations back to back (e.g. showing $\\\\sqrt[3]{8/343}$ and then 
   immediately rewriting it a second way before simplifying) — compute 
   internally, then write EACH intermediate quantity in your final chosen 
   notation exactly ONCE.
"""

MAX_REGENERATION_ATTEMPTS = 2


SELF_CORRECTION_PATTERNS = [
    r"\bwait\b",
    r"let'?s recalculate",
    r"let me re-?verify",
    r"let me re-?calculate",
    r"let'?s re-?verify",
    r"let me use simpler",
    r"let'?s follow the verified answer",
    r"actually,? let me",
    r"hold on",
    r"let me double-?check",
    r"i made an error",
    r"correction:",
]

_COMBINED_PATTERN = re.compile("|".join(SELF_CORRECTION_PATTERNS), re.IGNORECASE)

_MC_OPTION_PATTERN = re.compile(
    r"(?:^|\n|\s)-?\s*A\)\s.*(?:^|\n|\s)-?\s*B\)\s.*(?:^|\n|\s)-?\s*C\)\s.*(?:^|\n|\s)-?\s*D\)\s",
    re.DOTALL,
)

_INLINE_FRAC_PATTERN = re.compile(r'(?<!\$)\$(?!\$)([^$]*\\frac[^$]*)\$(?!\$)')

def fix_over_escaped_backslashes(text: str) -> str:
    if not text:
        return text
    return re.sub(r'\\{2,}', r'\\', text)


def convert_literal_escapes(text: str) -> str:
    if not text:
        return text
    text = re.sub(r'\\n(?![a-zA-Z])', '\n', text)
    text = re.sub(r'\\t(?![a-zA-Z])', ' ', text)
    return text


def strip_self_correction(text: str) -> str:
    if not text:
        return text
    match = _COMBINED_PATTERN.search(text)
    if match:
        cleaned = text[:match.start()].rstrip()
        if cleaned.count("$") % 2 != 0:
            cleaned += "$"
        return cleaned
    return text


def normalize_whitespace(text: str) -> str:
    if not text:
        return text
    text = re.sub(r'\n{2,}(?!\s*(-\s|\d+\.\s))', ' ', text)
    text = re.sub(r'(?<!\n)\n(?!\s*(-\s|\d+\.\s))', ' ', text)
    text = re.sub(r' {2,}', ' ', text)
    return text.strip()


def has_balanced_dollars(text: str) -> bool:
    if not text:
        return True
    return text.count('$') % 2 == 0

def enforce_display_fractions(text: str) -> str:
    if not text or '\\frac' not in text:
        return text
    return _INLINE_FRAC_PATTERN.sub(lambda m: f'$${m.group(1)}$$', text)


def sanitize_question_fields(question: dict) -> dict:
    for field in ("prompt", "answer", "solution", "hint"):
        if field in question and isinstance(question[field], str):
            question[field] = fix_over_escaped_backslashes(question[field])
            question[field] = convert_literal_escapes(question[field])
            question[field] = strip_self_correction(question[field])
            question[field] = enforce_display_fractions(question[field]) 
            question[field] = normalize_whitespace(question[field])
    return question


def is_valid_multiple_choice(question: dict) -> bool:
    fmt = (question.get("format") or "").strip().lower()
    if fmt != "multiple choice":
        return True
    return bool(_MC_OPTION_PATTERN.search(question.get("prompt", "")))


def needs_regeneration(question: dict) -> bool:
    for field in ("prompt", "answer", "solution", "hint"):
        text = question.get(field, "")
        if isinstance(text, str) and not has_balanced_dollars(text):
            return True
    if not is_valid_multiple_choice(question):
        return True
    return False


def sanitize_and_flag(questions: list) -> tuple[list, list]:
    to_regenerate = []
    for i, q in enumerate(questions):
        sanitize_question_fields(q)
        if needs_regeneration(q):
            to_regenerate.append(i)
    return questions, to_regenerate


def _regenerate_single_question(topic, prep_level, group_format, group_difficulty, form_data) -> dict:
    context = form_data.get("realWorldContext", "None")
    rules = form_data.get("customRules", "None")
    scaffolding = ", ".join(form_data.get("scaffolding", []))

    prompt = f"""
Generate exactly 1 unique math problem.

PARAMETERS:
- Topic: {topic}
- Preparation level: {prep_level}
- Real-world context: {context}
- Custom rules: {rules}
- Scaffolding/Support level: {scaffolding} (adjust your hints and solutions accordingly)
- Format: '{group_format}'
- Difficulty: '{group_difficulty}'

{LATEX_INSTRUCTIONS}
"""

    response = client.models.generate_content(
        model="gemini-3.5-flash",
        contents=prompt,
        config=types.GenerateContentConfig(
            temperature=0.3,
            response_mime_type="application/json",
            response_schema=MathQuestion,
        )
    )

    result: MathQuestion = response.parsed
    return sanitize_question_fields(result.model_dump())


def _regenerate_flagged_questions(questions: list, topic, prep_level, form_data) -> list:
    attempts = 0
    to_regenerate = [i for i, q in enumerate(questions) if needs_regeneration(q)]

    while to_regenerate and attempts < MAX_REGENERATION_ATTEMPTS:
        for i in to_regenerate:
            old_q = questions[i]
            new_q = _regenerate_single_question(
                topic, prep_level,
                old_q.get("format", "Word Problem"),
                old_q.get("difficulty", "Medium"),
                form_data,
            )
            new_q["topic"] = old_q.get("topic", topic)
            new_q["subtopic"] = old_q.get("subtopic", "")
            new_q["prepLevel"] = old_q.get("prepLevel", prep_level)
            new_q["format"] = old_q.get("format", "Word Problem")
            new_q["difficulty"] = old_q.get("difficulty", "Medium")
            questions[i] = new_q

        to_regenerate = [i for i, q in enumerate(questions) if needs_regeneration(q)]
        attempts += 1

    return questions


def generate_math_problems(topic, prep_level, form_data):
    groups = form_data.get("questionGroups", [])
    total = sum(g.get("count", 0) for g in groups)

    instructions = []
    for g in groups:
        instructions.append(f"- {g['count']} questions of format '{g['format']}' at '{g['difficulty']}' difficulty.")
    group_instructions = "\n".join(instructions)

    context = form_data.get("realWorldContext", "None")
    rules = form_data.get("customRules", "None")
    scaffolding = ", ".join(form_data.get("scaffolding", []))

    prompt = f"""
Generate exactly {total} unique math problems.

PARAMETERS:
- Topic: {topic}
- Preparation level: {prep_level}
- Real-world context: {context}
- Custom rules: {rules}
- Scaffolding/Support level: {scaffolding} (adjust your hints and solutions accordingly)

REQUIRED QUESTION DISTRIBUTION:
You must strictly match the following quantities, formats, and difficulties:
{group_instructions}

{LATEX_INSTRUCTIONS}
"""

    response = client.models.generate_content(
        model="gemini-3.5-flash",
        contents=prompt,
        config=types.GenerateContentConfig(
            temperature=0.3,
            response_mime_type="application/json",
            response_schema=MathProblemSet,
        )
    )

    result: MathProblemSet = response.parsed
    data = result.model_dump()

    data["questions"], _ = sanitize_and_flag(data["questions"])
    data["questions"] = _regenerate_flagged_questions(data["questions"], topic, prep_level, form_data)

    return data


def edit_single_math_problem(question_data, edit_instruction):
    prompt = f"""
    Edit the following math question strictly based on this instruction: "{edit_instruction}"

    ORIGINAL QUESTION:
    Prompt: {question_data.get('prompt')}
    Answer: {question_data.get('answer')}
    Solution: {question_data.get('solution')}
    Hint: {question_data.get('hint')}

    {LATEX_INSTRUCTIONS}
    """

    response = client.models.generate_content(
        model="gemini-3.5-flash",
        contents=prompt,
        config=types.GenerateContentConfig(
            temperature=0.3,
            response_mime_type="application/json",
            response_schema=EditedQuestion,
        )
    )

    result: EditedQuestion = response.parsed
    edited = sanitize_question_fields(result.model_dump())
    return edited


def edit_full_math_set(questions_list, edit_instruction):
    prompt = f"""
    Edit ALL of the following math questions strictly based on this instruction: "{edit_instruction}"

    ORIGINAL QUESTIONS (JSON Format):
    {json.dumps(questions_list)}

    {LATEX_INSTRUCTIONS}

    Keep the exact same "id" for each question as in the original list above.
    """

    response = client.models.generate_content(
        model="gemini-3.5-flash",
        contents=prompt,
        config=types.GenerateContentConfig(
            temperature=0.3,
            response_mime_type="application/json",
            response_schema=EditedQuestionSet,
        )
    )

    result: EditedQuestionSet = response.parsed
    data = result.model_dump()
    data["questions"] = [sanitize_question_fields(q) for q in data["questions"]]
    return data


def resync_answer_to_prompt(question_data: dict) -> dict:
    prompt = f"""
    A teacher manually edited the prompt of this math question. The prompt below
    is now the SOURCE OF TRUTH and must NOT be changed. Recalculate the answer,
    solution, and hint so they are mathematically correct for this exact prompt.

    FINAL PROMPT (do not modify): {question_data.get('prompt')}

    OLD ANSWER (may now be wrong, for reference only): {question_data.get('answer')}
    OLD SOLUTION (may now be wrong, for reference only): {question_data.get('solution')}

    {LATEX_INSTRUCTIONS}
    """

    response = client.models.generate_content(
        model="gemini-3.5-flash",
        contents=prompt,
        config=types.GenerateContentConfig(
            temperature=0.2,
            response_mime_type="application/json",
            response_schema=ResyncedQuestion,
        )
    )
    result: ResyncedQuestion = response.parsed
    return sanitize_question_fields(result.model_dump())

def generate_alternative_question(question_data: dict) -> dict:
    prompt = f"""
    Generate a NEW, DIFFERENT math problem that practices the SAME skill as the
    question below. Do NOT reuse the same numbers, names, or context — write a
    substantially different problem, not a reworded copy.

    ORIGINAL QUESTION (for reference only, do not repeat or lightly rephrase it):
    Prompt: {question_data.get('prompt')}

    PARAMETERS TO MATCH:
    - Topic: {question_data.get('topic')}
    - Subtopic: {question_data.get('subtopic')}
    - Format: {question_data.get('format')}
    - Difficulty: {question_data.get('difficulty')}
    - Preparation level: {question_data.get('prepLevel')}

    {LATEX_INSTRUCTIONS}
    """

    response = client.models.generate_content(
        model="gemini-3.5-flash",
        contents=prompt,
        config=types.GenerateContentConfig(
            temperature=0.6,
            response_mime_type="application/json",
            response_schema=AlternativeQuestion,
        )
    )

    result: AlternativeQuestion = response.parsed
    alt = sanitize_question_fields(result.model_dump())

    alt_as_question = {**alt, "format": question_data.get("format", "Word Problem")}
    attempts = 0
    while needs_regeneration(alt_as_question) and attempts < MAX_REGENERATION_ATTEMPTS:
        response = client.models.generate_content(
            model="gemini-3.5-flash",
            contents=prompt,
            config=types.GenerateContentConfig(
                temperature=0.6,
                response_mime_type="application/json",
                response_schema=AlternativeQuestion,
            )
        )
        result = response.parsed
        alt = sanitize_question_fields(result.model_dump())
        alt_as_question = {**alt, "format": question_data.get("format", "Word Problem")}
        attempts += 1

    return alt