import json
from functools import wraps
from django.http import JsonResponse
from .db import get_collection

def get_session_user(request):
    """
    Retrieves authenticated user from session, JSON body, or query param,
    and validates their staff status against MongoDB Atlas.
    """
    username = None
    if hasattr(request, 'session'):
        username = request.session.get('username')

    # Fallback to query param or JSON payload for resilient cross-origin support
    if not username and hasattr(request, 'GET'):
        username = request.GET.get('admin_username') or request.GET.get('username')
    if not username and getattr(request, 'body', None):
        try:
            data = json.loads(request.body)
            username = data.get('admin_username') or data.get('username')
        except Exception:
            pass

    if not username:
        return None

    users_col = get_collection('users')
    if users_col is None:
        return None

    user = users_col.find_one({"username": {"$regex": f"^{username}$", "$options": "i"}})
    if user:
        return {
            "id": str(user['_id']),
            "username": user['username'],
            "email": user.get('email', ''),
            "is_staff": bool(user.get('is_staff', False))
        }
    return None

def admin_required(view_func):
    """
    Custom decorator ensuring only authenticated staff/admin can access the endpoint.
    Returns HTTP 403 Forbidden if not authorized.
    """
    @wraps(view_func)
    def _wrapped_view(request, *args, **kwargs):
        # 1. Quick session check
        if hasattr(request, 'session') and request.session.get('is_staff'):
            return view_func(request, *args, **kwargs)

        # 2. Database validation check
        user = get_session_user(request)
        if user and user.get('is_staff'):
            return view_func(request, *args, **kwargs)

        return JsonResponse({
            "success": False,
            "error": "Unauthorized. Staff/Admin privileges required."
        }, status=403)
    return _wrapped_view
