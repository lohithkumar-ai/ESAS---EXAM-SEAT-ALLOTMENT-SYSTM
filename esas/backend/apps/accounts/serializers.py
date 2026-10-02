"""Serializers for the accounts app (Authentication)."""
from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from django.core.validators import validate_email
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers

from .models import UserProfile


class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserProfile
        fields = ['phone', 'role']


class UserSerializer(serializers.ModelSerializer):
    role = serializers.SerializerMethodField()
    phone = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'role', 'phone']
        read_only_fields = ['id']

    def get_role(self, obj):
        try:
            return obj.profile.role
        except UserProfile.DoesNotExist:
            return 'USER'

    def get_phone(self, obj):
        try:
            return obj.profile.phone
        except UserProfile.DoesNotExist:
            return ''


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField(required=False, allow_blank=True, default='')
    email = serializers.CharField(required=False, allow_blank=True, default='')
    password = serializers.CharField(write_only=True)


class RegisterSerializer(serializers.Serializer):
    full_name = serializers.CharField(max_length=150, required=True)
    email = serializers.EmailField(required=True)
    phone = serializers.CharField(max_length=15, required=True)
    password = serializers.CharField(write_only=True, required=True)

    def validate_email(self, value):
        """Check that the email is valid and not already in use."""
        value = value.lower().strip()
        try:
            validate_email(value)
        except DjangoValidationError:
            raise serializers.ValidationError('Please enter a valid email address.')

        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError('An account with this email already exists.')
        return value

    def validate_phone(self, value):
        """Validate phone number format."""
        cleaned = ''.join(c for c in value if c.isdigit())
        if len(cleaned) < 10 or len(cleaned) > 15:
            raise serializers.ValidationError(
                'Please enter a valid mobile number (10-15 digits).'
            )
        return cleaned

    def validate_password(self, value):
        """Validate password strength."""
        errors = []
        if len(value) < 8:
            errors.append('Password must contain at least 8 characters.')
        if not any(c.isupper() for c in value):
            errors.append('Password must contain at least one uppercase letter.')
        if not any(c.islower() for c in value):
            errors.append('Password must contain at least one lowercase letter.')
        if not any(c.isdigit() for c in value):
            errors.append('Password must contain at least one number.')
        if not any(c in '!@#$%^&*()_+-=[]{}|;:,.<>?/~`' for c in value):
            errors.append('Password must contain at least one special character.')
        if errors:
            raise serializers.ValidationError(errors)
        return value

    def validate_full_name(self, value):
        """Validate full name."""
        value = value.strip()
        if len(value) < 2:
            raise serializers.ValidationError('Please enter your full name.')
        return value

    def create(self, validated_data):
        """Create a new user with profile."""
        full_name = validated_data['full_name']
        name_parts = full_name.split(' ', 1)
        first_name = name_parts[0]
        last_name = name_parts[1] if len(name_parts) > 1 else ''

        # Generate a username from email
        email = validated_data['email']
        base_username = email.split('@')[0]
        username = base_username
        counter = 1
        while User.objects.filter(username=username).exists():
            username = f"{base_username}{counter}"
            counter += 1

        user = User.objects.create_user(
            username=username,
            email=email,
            password=validated_data['password'],
            first_name=first_name,
            last_name=last_name,
        )

        UserProfile.objects.create(
            user=user,
            phone=validated_data['phone'],
            role='USER',
        )

        return user
