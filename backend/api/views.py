import uuid
from django.utils import timezone
from rest_framework.decorators import api_view
from rest_framework.response import Response
from .models import ProblemSet, Question, Feedback
from .serializers import ProblemSetSerializer, QuestionSerializer, FeedbackSerializer
from .services.llm import generate_math_problems, edit_single_math_problem, edit_full_math_set, resync_answer_to_prompt, generate_alternative_question
import os
import tempfile
import pypandoc
from django.http import HttpResponse

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

@api_view(["POST"])
def update_question_manual(request, pk):
    try:
        question = Question.objects.get(pk=pk)
        new_prompt = request.data.get("prompt")
        resync = request.data.get("resyncAnswer", False)

        question.prompt = new_prompt

        if resync:
            q_data = QuestionSerializer(question).data
            q_data["prompt"] = new_prompt
            resynced = resync_answer_to_prompt(q_data)
            question.answer = resynced.get("answer", question.answer)
            question.solution = resynced.get("solution", question.solution)
            question.hint = resynced.get("hint", question.hint)

        question.save()
        return Response(QuestionSerializer(question).data)
    except Question.DoesNotExist:
        return Response({"error": "Question not found"}, status=404)

@api_view(["POST"])
def question_alternative(request, pk):
    try:
        question = Question.objects.get(pk=pk)
        q_data = QuestionSerializer(question).data
        alt = generate_alternative_question(q_data)

        question.prompt = alt.get("prompt", question.prompt)
        question.answer = alt.get("answer", question.answer)
        question.solution = alt.get("solution", question.solution)
        question.hint = alt.get("hint", question.hint)
        question.save()

        return Response(QuestionSerializer(question).data)
    except Question.DoesNotExist:
        return Response({"error": "Question not found"}, status=404)
    except Exception as e:
        print("ERROR IN QUESTION_ALTERNATIVE:", str(e))
        return Response({"error": str(e)}, status=500)

@api_view(["POST"])
def export_word(request):
    try:
        data = request.data
        questions = data.get("questions", [])
        mode = data.get("mode", "student")
        set_name = data.get("name", "Untitled Set")
        
        md_content = f"# {set_name}\n\n"
        if mode == 'teacher':
            md_content += "**Answer Key**\n\n"
            
        for i, q in enumerate(questions):
            md_content += f"### Question {i + 1}\n\n"
            
            md_content += f"{q.get('prompt', '')}\n\n"
            
            if mode == 'teacher':
                if q.get('solution'):
                    md_content += f"**Solution:**\n\n{q.get('solution')}\n\n"
                if q.get('answer'):
                    md_content += f"**Final Answer:** {q.get('answer')}\n\n"
            else:
                md_content += "---\n\n"

        with tempfile.NamedTemporaryFile(suffix='.docx', delete=False) as tmp:
            docx_path = tmp.name
            
        pypandoc.convert_text(md_content, 'docx', format='md', outputfile=docx_path)
        
        with open(docx_path, 'rb') as doc_file:
            response = HttpResponse(
                doc_file.read(), 
                content_type='application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            )
            response['Content-Disposition'] = f'attachment; filename="{set_name}-{mode}.docx"'
        
        os.remove(docx_path)
        
        return response

    except Exception as e:
        print("ERROR IN EXPORT_WORD:", str(e))
        return Response({"error": str(e)}, status=500)