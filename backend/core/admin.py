from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User, Profile, Disease, Scan, DiseaseVideo

@admin.register(User)
class CustomUserAdmin(UserAdmin):
    list_display = ('email', 'username', 'is_active', 'created_at')
    search_fields = ('email', 'username')
    ordering = ('-created_at',)

@admin.register(Profile)
class ProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'location', 'created_at')
    search_fields = ('user__email', 'location')
    ordering = ('-created_at',)

@admin.register(Disease)
class DiseaseAdmin(admin.ModelAdmin):
    list_display = ('name', 'created_at')
    search_fields = ('name',)
    ordering = ('name',)

@admin.register(Scan)
class ScanAdmin(admin.ModelAdmin):
    list_display = ('user', 'disease', 'confidence_score', 'created_at')
    list_filter = ('disease', 'created_at')
    search_fields = ('user__email', 'disease__name')
    ordering = ('-created_at',)

@admin.register(DiseaseVideo)
class DiseaseVideoAdmin(admin.ModelAdmin):
    list_display = ('title', 'disease', 'created_at')
    list_filter = ('disease',)
    search_fields = ('title', 'disease__name')
    ordering = ('-created_at',)
