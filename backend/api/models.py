from django.db import models

class ProblemSet(models.Model):
    id = models.CharField(max_length=100, primary_key=True)
    name = models.CharField(max_length=255, blank=True, null=True)
    topic = models.CharField(max_length=255)
    prep_level = models.CharField(max_length=50)
    difficulty = models.CharField(max_length=50, default="Medium")
    form_data = models.JSONField(blank=True, null=True, default=dict)
    is_saved = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    saved_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.name or self.topic


class Question(models.Model):
    id = models.CharField(max_length=100, primary_key=True)
    problem_set = models.ForeignKey(ProblemSet, on_delete=models.CASCADE, related_name="questions")
    prompt = models.TextField()
    answer = models.TextField(blank=True)
    solution = models.TextField(blank=True)
    hint = models.TextField(blank=True)

    format = models.CharField(max_length=100, blank=True, null=True)
    topic = models.CharField(max_length=255, blank=True, null=True)
    subtopic = models.CharField(max_length=255, blank=True, null=True)
    prep_level = models.CharField(max_length=50, blank=True, null=True)
    difficulty = models.CharField(max_length=50, blank=True, null=True)

    def __str__(self):
        return self.prompt[:50]

class Feedback(models.Model):
    id = models.CharField(max_length=100, primary_key=True)
    message = models.TextField()
    rating = models.CharField(max_length=20, blank=True, null=True) 
    page = models.CharField(max_length=100)         
    section = models.CharField(max_length=100, blank=True, null=True)  
    metadata = models.JSONField(blank=True, null=True, default=dict) 
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']