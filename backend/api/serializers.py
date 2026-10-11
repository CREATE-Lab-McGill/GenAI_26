from rest_framework import serializers
from .models import ProblemSet, Question, Feedback, Collection

class QuestionSerializer(serializers.ModelSerializer):
    prepLevel = serializers.CharField(source='prep_level', required=False)
    teacherTip = serializers.CharField(source='teacher_tip', required=False, allow_blank=True)
    outputOverrides = serializers.JSONField(source='output_overrides', required=False, allow_null=True)

    class Meta:
        model = Question
        fields = [
            "id", "prompt", "answer", "solution", "hint", "teacherTip",
            "format", "topic", "subtopic", "prepLevel", "difficulty",
            "outputOverrides",
        ]


class ProblemSetSerializer(serializers.ModelSerializer):
    questions = QuestionSerializer(many=True, read_only=True)
    prepLevel = serializers.CharField(source='prep_level', required=False)
    createdAt = serializers.DateTimeField(source='created_at', read_only=True)
    savedAt = serializers.DateTimeField(source='saved_at', read_only=True, required=False)
    isSaved = serializers.BooleanField(source='is_saved', required=False)
    formData = serializers.JSONField(source='form_data', required=False)
    collectionId = serializers.CharField(source='collection_id', read_only=True, allow_null=True)

    class Meta:
        model = ProblemSet
        fields = [
            "id", "name", "topic", "difficulty", "prepLevel",
            "createdAt", "savedAt", "isSaved", "formData", "questions",
            "collectionId",
        ]


class CollectionSerializer(serializers.ModelSerializer):
    createdAt = serializers.DateTimeField(source='created_at', read_only=True)
    setCount = serializers.SerializerMethodField()

    class Meta:
        model = Collection
        fields = ["id", "name", "createdAt", "setCount"]

    def get_setCount(self, obj):
        return obj.sets.filter(is_saved=True).count()


class FeedbackSerializer(serializers.ModelSerializer):
    createdAt = serializers.DateTimeField(source='created_at', read_only=True)

    class Meta:
        model = Feedback
        fields = ["id", "message", "rating", "page", "section", "metadata", "createdAt"]