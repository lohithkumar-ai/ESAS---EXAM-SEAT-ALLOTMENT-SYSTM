"""Models for the accounts app."""
from django.db import models
from django.contrib.auth.models import User
import random
import string
from django.utils import timezone
from datetime import timedelta


class UserProfile(models.Model):
    """Extended user profile with role and phone number."""

    ROLE_CHOICES = [
        ('ADMIN', 'Admin'),
        ('STAFF', 'Staff'),
        ('STUDENT', 'Student'),
        ('USER', 'User'),
    ]

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    phone = models.CharField(max_length=15, blank=True, default='')
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default='USER')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.username} - {self.role}"


class PasswordResetCode(models.Model):
    """Stores temporary reset codes for password recovery."""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='reset_codes')
    code = models.CharField(max_length=6)
    created_at = models.DateTimeField(auto_now_add=True)
    used = models.BooleanField(default=False)

    class Meta:
        ordering = ['-created_at']

    def is_expired(self):
        """Reset codes expire after 15 minutes."""
        return timezone.now() > self.created_at + timedelta(minutes=15)

    def is_valid(self):
        """Check if the code is still valid (not used and not expired)."""
        return not self.used and not self.is_expired()

    @classmethod
    def generate_code(cls):
        """Generate a random 6-digit code."""
        return ''.join(random.choices(string.digits, k=6))

    def __str__(self):
        return f"Reset code for {self.user.username} - {'Valid' if self.is_valid() else 'Invalid'}"
