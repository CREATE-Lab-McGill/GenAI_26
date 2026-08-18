from rest_framework import serializers
from .models import ProblemSet, Question

class QuestionSerializer(serializers.ModelSerializer):
    prepLevel = serializers.CharField(source='prep_level', required=False)

    class Meta:
        model = Question
        fields = [
            "id", "prompt", "answer", "solution", "hint",
            "format", "topic", "subtopic", "prepLevel", "difficulty",
        ]


class ProblemSetSerializer(serializers.ModelSerializer):
    questions = QuestionSerializer(many=True, read_only=True)
    prepLevel = serializers.CharField(source='prep_level', required=False)
    createdAt = serializers.DateTimeField(source='created_at', read_only=True)
    savedAt = serializers.DateTimeField(source='saved_at', read_only=True, required=False)
    isSaved = serializers.BooleanField(source='is_saved', required=False)
    formData = serializers.JSONField(source='form_data', required=False)

    class Meta:
        model = ProblemSet
        fields = [
            "id", "name", "topic", "difficulty", "prepLevel",
            "createdAt", "savedAt", "isSaved", "formData", "questions",
        ]