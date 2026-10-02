"""Views for the accounts app (Authentication)."""
from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken

from .models import PasswordResetCode, UserProfile
from .serializers import UserSerializer, LoginSerializer, RegisterSerializer


@api_view(['POST'])
@permission_classes([AllowAny])
def login_view(request):
    """Authenticate user and return JWT tokens."""
    serializer = LoginSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    username_input = serializer.validated_data.get('username') or ''
    email_input = serializer.validated_data.get('email') or ''
    identifier = email_input.strip() if email_input else username_input.strip()
    password = serializer.validated_data.get('password', '')

    if not identifier:
        return Response(
            {'error': 'Please enter your email or username.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Resolve user by email or username
    user_obj = None
    if '@' in identifier:
        user_obj = User.objects.filter(email__iexact=identifier).first()
    if not user_obj:
        user_obj = User.objects.filter(username__iexact=identifier).first()

    username_to_auth = user_obj.username if user_obj else identifier

    user = authenticate(
        username=username_to_auth,
        password=password,
    )

    if user is None:
        return Response(
            {'error': 'Invalid email/username or password. Please try again.'},
            status=status.HTTP_401_UNAUTHORIZED,
        )

    # Ensure profile exists
    UserProfile.objects.get_or_create(user=user, defaults={'role': 'ADMIN' if user.is_superuser else 'USER'})

    refresh = RefreshToken.for_user(user)
    return Response({
        'access': str(refresh.access_token),
        'refresh': str(refresh),
        'user': UserSerializer(user).data,
    })


@api_view(['POST'])
@permission_classes([AllowAny])
def register_view(request):
    """Register a new user."""
    serializer = RegisterSerializer(data=request.data)

    if not serializer.is_valid():
        # Flatten and format errors for the frontend
        errors = {}
        for field, messages in serializer.errors.items():
            if isinstance(messages, list):
                # Flatten nested lists
                flat = []
                for m in messages:
                    if isinstance(m, list):
                        flat.extend(m)
                    else:
                        flat.append(str(m))
                errors[field] = flat
            else:
                errors[field] = [str(messages)]
        return Response({'errors': errors}, status=status.HTTP_400_BAD_REQUEST)

    user = serializer.save()

    # Auto-login after registration: return JWT tokens
    refresh = RefreshToken.for_user(user)
    return Response({
        'message': 'Account created successfully!',
        'access': str(refresh.access_token),
        'refresh': str(refresh),
        'user': UserSerializer(user).data,
    }, status=status.HTTP_201_CREATED)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout_view(request):
    """Blacklist the refresh token on logout."""
    try:
        refresh_token = request.data.get('refresh')
        if refresh_token:
            token = RefreshToken(refresh_token)
            token.blacklist()
    except Exception:
        pass
    return Response({'message': 'Logged out successfully'})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def me_view(request):
    """Return the current user's profile."""
    return Response(UserSerializer(request.user).data)


@api_view(['POST'])
@permission_classes([AllowAny])
def forgot_password_view(request):
    """Generate a password reset code."""
    identifier = request.data.get('identifier', '').strip()

    if not identifier:
        return Response(
            {'error': 'Please provide your username or email.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Look up user by username or email (don't reveal if user exists)
    user = User.objects.filter(username=identifier).first()
    if not user:
        user = User.objects.filter(email=identifier).first()

    response_data = {
        'message': 'If an account exists with that username/email, a reset code has been generated.'
    }

    if user:
        code = PasswordResetCode.generate_code()
        PasswordResetCode.objects.create(user=user, code=code)

        # In development, return the code directly
        from django.conf import settings
        if settings.DEBUG:
            response_data['dev_code'] = code

        # TODO: Send email/SMS with the code in production

    return Response(response_data)


@api_view(['POST'])
@permission_classes([AllowAny])
def reset_password_view(request):
    """Reset password using a reset code."""
    identifier = request.data.get('identifier', '').strip()
    code = request.data.get('code', '').strip()
    new_password = request.data.get('new_password', '')

    if not all([identifier, code, new_password]):
        return Response(
            {'error': 'All fields are required.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if len(new_password) < 6:
        return Response(
            {'error': 'Password must be at least 6 characters.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Find the user
    user = User.objects.filter(username=identifier).first()
    if not user:
        user = User.objects.filter(email=identifier).first()

    if not user:
        return Response(
            {'error': 'Invalid or expired reset code. Please try again.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Find valid reset code
    reset_code = PasswordResetCode.objects.filter(
        user=user, code=code, used=False
    ).order_by('-created_at').first()

    if not reset_code or not reset_code.is_valid():
        return Response(
            {'error': 'Invalid or expired reset code. Please try again.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Reset password
    user.set_password(new_password)
    user.save()

    # Mark code as used
    reset_code.used = True
    reset_code.save()

    return Response({'message': 'Password reset successfully.'})
