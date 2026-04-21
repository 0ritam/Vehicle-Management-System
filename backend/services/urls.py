from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register(r"components", views.ComponentViewSet, basename="component")
router.register(r"vehicles", views.VehicleViewSet, basename="vehicle")
router.register(r"service-orders", views.ServiceOrderViewSet, basename="service-order")
router.register(r"revenue", views.RevenueViewSet, basename="revenue")

urlpatterns = [
    path("", include(router.urls)),
]
