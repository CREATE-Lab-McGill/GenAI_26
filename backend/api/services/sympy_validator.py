import re
from sympy import symbols, Eq, solve, simplify, sympify, latex
from sympy.parsing.sympy_parser import (
    parse_expr,
    standard_transformations,
    implicit_multiplication_application,
)

TRANSFORMATIONS = standard_transformations + (implicit_multiplication_application,)


def _clean_latex(expr_str: str) -> str:
    """Strip $ / LaTeX artifacts so SymPy's parser can read it."""
    if not expr_str:
        return expr_str
    text = expr_str.strip().strip("$")
    text = text.replace("\\left", "").replace("\\right", "")
    text = text.replace("\\cdot", "*").replace("\\times", "*")
    text = re.sub(r"\\frac\{([^{}]+)\}\{([^{}]+)\}", r"(\1)/(\2)", text)
    text = re.sub(r"\\sqrt\[(\d+)\]\{([^{}]+)\}", r"(\2)**(1/\1)", text)
    text = re.sub(r"\\sqrt\{([^{}]+)\}", r"sqrt(\1)", text)
    text = text.replace("^", "**")
    text = re.sub(r"(?<=\d),(?=\d{3}(\D|$))", "", text)
    return text


def _parse_answer(answer_str: str):
    """Multiple-choice / narrative answers won't sympify — that's expected."""
    cleaned = _clean_latex(answer_str)
    try:
        return sympify(cleaned, evaluate=True)
    except Exception:
        return None


def verify_with_sympy(verification_expression: str, expected_answer: str, variable: str = "x"):
    """
    Returns (status, detail):
      "verified"    -> SymPy's result matches the stated answer
      "mismatch"    -> SymPy computed something different
      "unsupported" -> could not parse/solve locally; caller should try Wolfram
    """
    if not verification_expression:
        return "unsupported", "no verification_expression provided"

    expr_str = _clean_latex(verification_expression)
    var = symbols(variable)

    try:
        if "=" in expr_str and "==" not in expr_str:
            lhs, rhs = expr_str.split("=", 1)
            expr = Eq(
                parse_expr(lhs, transformations=TRANSFORMATIONS),
                parse_expr(rhs, transformations=TRANSFORMATIONS),
            )
        else:
            expr = parse_expr(expr_str, transformations=TRANSFORMATIONS)
    except Exception as e:
        return "unsupported", f"parse error: {e}"

    try:
        free_vars = expr.free_symbols if hasattr(expr, "free_symbols") else set()
        if free_vars:
            target = list(free_vars)[0] if len(free_vars) == 1 else var
            solutions = solve(expr, target)
        else:
            solutions = [simplify(expr)]
    except Exception as e:
        return "unsupported", f"solve error: {e}"

    if not solutions:
        return "unsupported", "sympy returned no solutions"

    expected = _parse_answer(expected_answer)
    if expected is None:
        return "unsupported", "answer is not a parseable numeric/symbolic value"

    for sol in solutions:
        try:
            diff = simplify(sol - expected)
            if diff == 0:
                return "verified", str(sol)
            diff_val = complex(diff.evalf())
            if abs(diff_val.imag) < 1e-6:
                diff_real = diff_val.real
                magnitude = max(abs(complex(sympify(sol).evalf()).real), 1)
                if abs(diff_real) < 1e-3 or abs(diff_real) / magnitude < 1e-3:
                    return "verified", str(sol)
        except Exception:
            continue

    correct_val = solutions[0] if isinstance(solutions, list) and solutions else solutions
    return "mismatch", f"${latex(correct_val)}$"