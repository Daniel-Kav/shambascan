from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Profile, Disease, Scan, DiseaseVideo

User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('id', 'email', 'username', 'first_name', 'last_name')
        read_only_fields = ('id',)

class ProfileSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model = Profile
        fields = ('id', 'user', 'bio', 'location', 'created_at', 'updated_at')
        read_only_fields = ('id', 'created_at', 'updated_at')

class DiseaseVideoSerializer(serializers.ModelSerializer):
    class Meta:
        model = DiseaseVideo
        fields = ('id', 'title', 'url', 'description', 'created_at')
        read_only_fields = ('id', 'created_at')

class DiseaseSerializer(serializers.ModelSerializer):
    videos = DiseaseVideoSerializer(many=True, read_only=True)
    
    class Meta:
        model = Disease
        fields = ('id', 'name', 'description', 'symptoms', 'treatment', 
                 'prevention', 'videos', 'created_at', 'updated_at')
        read_only_fields = ('id', 'created_at', 'updated_at')

class ScanSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    disease = DiseaseSerializer(read_only=True)
    is_successful = serializers.BooleanField(read_only=True)

    class Meta:
        model = Scan
        fields = ('id', 'user', 'image', 'disease', 'confidence_score', 
                 'notes', 'is_successful', 'created_at', 'updated_at')
        read_only_fields = ('id', 'user', 'disease', 'confidence_score', 
                          'is_successful', 'created_at', 'updated_at')

class ScanCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Scan
        fields = ('image', 'notes')

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    
    class Meta:
        model = User
        fields = ('id', 'email', 'username', 'password', 'first_name', 'last_name')
        read_only_fields = ('id',)
    
    def create(self, validated_data):
        user = User.objects.create_user(
            email=validated_data['email'],
            username=validated_data['username'],
            password=validated_data['password'],
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', '')
        )
        return user
