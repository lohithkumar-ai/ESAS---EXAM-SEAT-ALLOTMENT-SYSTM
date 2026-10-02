"""Role-based authorization permissions for DRF."""
from rest_framework.permissions import BasePermission


class HasRole(BasePermission):
    """
    Allows access only to users with specific roles.
    Usage:
        permission_classes = [HasRole.with_roles('ADMIN', 'STAFF')]
    """
    allowed_roles = []

    def __init__(self, allowed_roles=None):
        if allowed_roles:
            self.allowed_roles = allowed_roles

    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False

        if request.user.is_superuser:
            return True

        user_role = getattr(getattr(request.user, 'profile', None), 'role', 'USER')
        return user_role in self.allowed_roles

    @classmethod
    def with_roles(cls, *roles):
        """Factory method to return a permission class for specified roles."""
        class DynamicRolePermission(cls):
            allowed_roles = list(roles)
        return DynamicRolePermission


class IsAdminRole(BasePermission):
    """Allows access only to users with ADMIN role or superusers."""
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        if request.user.is_superuser:
            return True
        user_role = getattr(getattr(request.user, 'profile', None), 'role', 'USER')
        return user_role == 'ADMIN'


class IsStaffRole(BasePermission):
    """Allows access to users with ADMIN or STAFF role."""
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        if request.user.is_superuser:
            return True
        user_role = getattr(getattr(request.user, 'profile', None), 'role', 'USER')
        return user_role in ['ADMIN', 'STAFF']


class IsStudentRole(BasePermission):
    """Allows access to users with STUDENT role."""
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        user_role = getattr(getattr(request.user, 'profile', None), 'role', 'USER')
        return user_role == 'STUDENT'
