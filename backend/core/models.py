from django.db import models
from django.contrib.auth.models import AbstractUser
from django.utils import timezone

class User(AbstractUser):
    email = models.EmailField(unique=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.email

class Profile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    bio = models.TextField(max_length=500, blank=True)
    location = models.CharField(max_length=100, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.user.email}'s profile"

class Disease(models.Model):
    name = models.CharField(max_length=100)
    description = models.TextField()
    symptoms = models.TextField()
    treatment = models.TextField()
    prevention = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

class Scan(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    image = models.ImageField(upload_to='scans/')
    disease = models.ForeignKey(Disease, on_delete=models.SET_NULL, null=True, blank=True)
    confidence_score = models.FloatField(null=True, blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Scan by {self.user.email} on {self.created_at.date()}"

    @property
    def is_successful(self):
        return self.disease is not None

class DiseaseVideo(models.Model):
    disease = models.ForeignKey(Disease, on_delete=models.CASCADE, related_name='videos')
    title = models.CharField(max_length=200)
    url = models.URLField()
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.title
