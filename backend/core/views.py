from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import get_user_model
import asyncio
from .models import Profile, Disease, Scan, DiseaseVideo
from .serializers import (
    UserSerializer, ProfileSerializer, DiseaseSerializer,
    ScanSerializer, ScanCreateSerializer, DiseaseVideoSerializer,
    RegisterSerializer
)
from ._service import analyze_plant_image

User = get_user_model()

class RegisterViewSet(viewsets.GenericViewSet):
    queryset = User.objects.all()
    permission_classes = (permissions.AllowAny,)
    serializer_class = RegisterSerializer

    def create(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        
        refresh = RefreshToken.for_user(user)
        return Response({
            'user': UserSerializer(user).data,
            'refresh': str(refresh),
            'access': str(refresh.access_token),
        }, status=status.HTTP_201_CREATED)

class ProfileViewSet(viewsets.ModelViewSet):
    serializer_class = ProfileSerializer
    permission_classes = (permissions.IsAuthenticated,)

    def get_queryset(self):
        return Profile.objects.filter(user=self.request.user)

class DiseaseViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Disease.objects.all()
    serializer_class = DiseaseSerializer
    permission_classes = (permissions.IsAuthenticated,)

class DiseaseVideoViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = DiseaseVideo.objects.all()
    serializer_class = DiseaseVideoSerializer
    permission_classes = (permissions.IsAuthenticated,)

    def get_queryset(self):
        disease_id = self.request.query_params.get('disease_id', None)
        queryset = DiseaseVideo.objects.all()
        if disease_id:
            queryset = queryset.filter(disease_id=disease_id)
        return queryset

class ScanViewSet(viewsets.ModelViewSet):
    permission_classes = (permissions.IsAuthenticated,)

    def get_serializer_class(self):
        if self.action == 'create':
            return ScanCreateSerializer
        return ScanSerializer

    def get_queryset(self):
        return Scan.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        scan = serializer.save(user=self.request.user)
        
        # Process the image with Gemini
        try:
            # Run async analysis in sync context
            analysis = asyncio.run(analyze_plant_image(scan.image.path))
            
            # Get or create disease
            disease, created = Disease.objects.get_or_create(
                name=analysis['disease_name'],
                defaults={
                    'description': analysis['description'],
                    'symptoms': f"Severity: {analysis['severity']}\n{analysis['description']}",
                    'treatment': '\n'.join(analysis['treatment_recommendations']),
                    'prevention': '\n'.join(analysis['preventive_measures'])
                }
            )
            
            # Update scan with results
            scan.disease = disease
            scan.confidence_score = analysis['confidence_score']
            scan.notes = f"Severity: {analysis['severity']}"
            scan.save()
            
        except Exception as e:
            print(f"Error processing scan: {e}")

    @action(detail=False, methods=['get'])
    def stats(self, request):
        total_scans = Scan.objects.filter(user=request.user).count()
        successful_scans = Scan.objects.filter(
            user=request.user, 
            disease__isnull=False
        ).count()
        success_rate = (successful_scans / total_scans * 100) if total_scans > 0 else 0
        
        return Response({
            'total_scans': total_scans,
            'successful_scans': successful_scans,
            'success_rate': round(success_rate, 2)
        })
