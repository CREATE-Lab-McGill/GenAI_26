import os
from services.llm import generate_math_problem


problem = generate_math_problem(
    "Ratios",
    "Medium",
    "Sec III"
)

print(problem)