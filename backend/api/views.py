import uuid
from django.utils import timezone
from rest_framework.decorators import api_view
from rest_framework.response import Response
from .models import ProblemSet, Question, Feedback
from .serializers import ProblemSetSerializer, QuestionSerializer, FeedbackSerializer
from .services.llm import generate_math_problems, edit_single_math_problem, edit_full_math_set

@api_view(["GET"])
def health_check(request):
    return Response({"status": "success", "message": "Backend is fully operational!"})

@api_view(["GET"])
def get_sets(request):
    sets = ProblemSet.objects.all()
    serializer = ProblemSetSerializer(sets, many=True)
    return Response(serializer.data)

@api_view(["POST"])
def generate_set(request):
    data = request.data
    form_data = data.get("formData", {})

    problems = generate_math_problems(
        topic=data.get("topic"),
        prep_level=data.get("prepLevel"),
        form_data=form_data
    )

    is_mixed = len(form_data.get("questionGroups", [])) > 1

    problem_set = ProblemSet.objects.create(
        id=str(uuid.uuid4()),
        name=data.get("setName"),
        topic=data.get("topic"),
        difficulty="Mixed" if is_mixed else data.get("difficulty", "Medium"),
        prep_level=data.get("prepLevel"),
        form_data=form_data,
    )

    for problem in problems.get("questions", []):
        Question.objects.create(
            id=str(uuid.uuid4()),
            problem_set=problem_set,
            prompt=problem.get("prompt", ""),
            answer=problem.get("answer", ""),
            solution=problem.get("solution", ""),
            hint=problem.get("hint", ""),
            format=problem.get("format", "Word Problem"),
            topic=problem.get("topic", data.get("topic")),
            subtopic=problem.get("subtopic", ""),
            prep_level=problem.get("prepLevel", data.get("prepLevel")),
            difficulty=problem.get("difficulty", data.get("difficulty"))
        )

    serializer = ProblemSetSerializer(problem_set)
    return Response(serializer.data)

@api_view(["POST"])
def edit_question(request, pk):
    try:
        question = Question.objects.get(pk=pk)
        edit_instruction = request.data.get("prompt")

        q_data = QuestionSerializer(question).data
        updated_data = edit_single_math_problem(q_data, edit_instruction)

        question.prompt = updated_data.get("prompt", question.prompt)
        question.answer = updated_data.get("answer", question.answer)
        question.solution = updated_data.get("solution", question.solution)
        question.hint = updated_data.get("hint", question.hint)
        question.save()

        return Response(QuestionSerializer(question).data)
    except Exception as e:
        print("ERROR IN EDIT_QUESTION:", str(e))
        return Response({"error": str(e)}, status=500)

@api_view(["POST"])
def edit_set(request, pk):
    try:
        problem_set = ProblemSet.objects.get(pk=pk)
        questions = list(problem_set.questions.values("id", "prompt", "answer", "solution", "hint"))
        edit_instruction = request.data.get("prompt")

        updated_data = edit_full_math_set(questions, edit_instruction)

        for updated_q in updated_data.get("questions", []):
            q = Question.objects.get(pk=updated_q["id"])
            q.prompt = updated_q.get("prompt", q.prompt)
            q.answer = updated_q.get("answer", q.answer)
            q.solution = updated_q.get("solution", q.solution)
            q.hint = updated_q.get("hint", q.hint)
            q.save()

        return Response(ProblemSetSerializer(problem_set).data)
    except Exception as e:
        print("ERROR IN EDIT_SET:", str(e))
        return Response({"error": str(e)}, status=500)

@api_view(["POST"])
def save_set(request, pk):
    try:
        problem_set = ProblemSet.objects.get(pk=pk)
    except ProblemSet.DoesNotExist:
        return Response({"error": "Set not found"}, status=404)

    problem_set.is_saved = True
    problem_set.saved_at = timezone.now()
    problem_set.save()
    return Response(ProblemSetSerializer(problem_set).data)

@api_view(["DELETE"])
def delete_set(request, pk):
    try:
        problem_set = ProblemSet.objects.get(pk=pk)
    except ProblemSet.DoesNotExist:
        return Response({"error": "Set not found"}, status=404)

    problem_set.delete()
    return Response(status=204)

@api_view(["DELETE"])
def delete_question(request, pk):
    try:
        question = Question.objects.get(pk=pk)
    except Question.DoesNotExist:
        return Response({"error": "Question not found"}, status=404)

    question.delete()
    return Response(status=204)

@api_view(["POST"])
def submit_feedback(request):
    data = request.data
    feedback = Feedback.objects.create(
        id=str(uuid.uuid4()),
        message=data.get("message", ""),
        rating=data.get("rating"),
        page=data.get("page", ""),
        section=data.get("section"),
        metadata=data.get("metadata", {}),
    )
    return Response(FeedbackSerializer(feedback).data, status=201)