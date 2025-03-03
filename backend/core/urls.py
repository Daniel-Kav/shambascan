from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)
from .views import (
    RegisterViewSet,
    ProfileViewSet,
    DiseaseViewSet,
    ScanViewSet,
    DiseaseVideoViewSet,
)

router = DefaultRouter()
router.register(r'register', RegisterViewSet, basename='register')
router.register(r'profile', ProfileViewSet, basename='profile')
router.register(r'diseases', DiseaseViewSet, basename='disease')
router.register(r'scans', ScanViewSet, basename='scan')
router.register(r'videos', DiseaseVideoViewSet, basename='video')

urlpatterns = [
    path('', include(router.urls)),
    path('token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
]
