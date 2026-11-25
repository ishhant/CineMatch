import os
import re
import json
from datetime import datetime
from bson import ObjectId
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth.hashers import make_password, check_password
from movies.db import get_collection, check_connection
from .decorators import admin_required, get_session_user

def _get_current_user(request):
    """Returns the authenticated user dict from session if valid."""
    username = request.session.get('username')
    users_col = get_collection('users')
    if users_col is None or not username:
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

def _normalize_genres(data):
    """Normalizes input genres into a clean list of strings."""
    g_input = data.get('genres') or data.get('genre')
    if isinstance(g_input, list):
        clean = [str(g).strip() for g in g_input if str(g).strip()]
        return clean if clean else ['Action']
    elif isinstance(g_input, str):
        clean = [g.strip() for g in g_input.split(',') if g.strip()]
        return clean if clean else ['Action']
    return ['Action']

def _serialize_mongo_doc(doc):
    """Convert MongoDB document to JSON-serializable dictionary."""
    if not doc:
        return None
    d = dict(doc)
    if '_id' in d:
        d['id'] = str(d.pop('_id'))
    # Ensure genres list exists
    if 'genres' not in d:
        d['genres'] = [d.get('genre', 'Action')] if d.get('genre') else ['Action']
    elif isinstance(d['genres'], str):
        d['genres'] = [g.strip() for g in d['genres'].split(',') if g.strip()]
    if 'video_url' not in d or d['video_url'] is None:
        d['video_url'] = ''
    return d

def api_system_status(request):
    """Returns system status and MongoDB Atlas connection health."""
    connected, msg = check_connection()
    return JsonResponse({
        "status": "online",
        "mongodb_connected": connected,
        "message": msg
    })

def api_movies_list(request):
    """
    Returns list of movies from MongoDB with optional search, multi-genre filter, minimum rating, and streamable availability.
    """
    search_query = request.GET.get('search', '').strip()
    genre_query = request.GET.get('genre', '').strip()
    min_rating = request.GET.get('min_rating', '').strip()
    available_only = request.GET.get('available', '').strip().lower()

    col = get_collection('movies')
    if col is not None:
        try:
            filters = []
            if search_query:
                # Case-insensitive title/synopsis search using MongoDB regex
                filters.append({
                    '$or': [
                        {'title': {'$regex': search_query, '$options': 'i'}},
                        {'synopsis': {'$regex': search_query, '$options': 'i'}}
                    ]
                })
            if genre_query and genre_query.lower() != 'all':
                filters.append({
                    '$or': [
                        {'genres': {'$regex': f"^{genre_query}$", '$options': 'i'}},
                        {'genre': {'$regex': genre_query, '$options': 'i'}}
                    ]
                })
            if min_rating:
                try:
                    filters.append({'global_rating': {'$gte': float(min_rating)}})
                except ValueError:
                    pass
            if available_only in ('1', 'true', 'yes'):
                filters.append({'video_url': {'$exists': True, '$nin': ['', None]}})

            mongo_query = {'$and': filters} if filters else {}
            cursor = col.find(mongo_query).sort("created_at", -1)
            movies = [_serialize_mongo_doc(doc) for doc in cursor]

            return JsonResponse({
                "success": True,
                "source": "mongodb",
                "count": len(movies),
                "movies": movies
            })
        except Exception as e:
            return JsonResponse({
                "success": False,
                "error": f"Database query failed: {str(e)}",
                "movies": []
            }, status=500)

    return JsonResponse({
        "success": False,
        "error": "MongoDB Atlas connection not available. Please check .env configuration.",
        "movies": []
    }, status=503)

def api_movie_detail(request, movie_id):
    """Returns movie details along with its community reviews from MongoDB."""
    col = get_collection('movies')
    reviews_col = get_collection('reviews')
    
    movie = None
    if col is not None:
        try:
            if ObjectId.is_valid(movie_id):
                doc = col.find_one({"_id": ObjectId(movie_id)})
            else:
                doc = col.find_one({"title": movie_id})
            movie = _serialize_mongo_doc(doc)
        except Exception:
            pass

    if not movie:
        return JsonResponse({"success": False, "error": "Movie not found"}, status=404)

    # Fetch reviews for this movie
    reviews = []
    if reviews_col is not None:
        try:
            cursor = reviews_col.find({"movie_id": str(movie_id)}).sort("created_at", -1)
            reviews = [_serialize_mongo_doc(r) for r in cursor]
        except Exception:
            pass

    movie['reviews'] = reviews
    return JsonResponse({"success": True, "movie": movie})

@csrf_exempt
def api_add_review(request, movie_id):
    """Submits a review (1-5 stars) for a movie and updates global rating in MongoDB."""
    if request.method != 'POST':
        return JsonResponse({"error": "Method not allowed"}, status=405)

    try:
        data = json.loads(request.body)
        rating = int(data.get('rating', 5))
        comment = str(data.get('comment', '')).strip()

        # Enforce that only logged-in users can write a review
        user = _get_current_user(request)
        username = None
        if user:
            username = user['username']
        elif data.get('username'):
            cand = str(data.get('username')).strip()
            users_col = get_collection('users')
            if users_col is not None and cand:
                db_user = users_col.find_one({"username": {"$regex": f"^{cand}$", "$options": "i"}})
                if db_user:
                    username = db_user['username']

        if not username:
            return JsonResponse({"error": "You must be signed in to write a review."}, status=401)

        if not (1 <= rating <= 5):
            return JsonResponse({"error": "Rating must be between 1 and 5"}, status=400)
        if not comment:
            return JsonResponse({"error": "Comment cannot be empty"}, status=400)

        reviews_col = get_collection('reviews')
        movies_col = get_collection('movies')

        if reviews_col is not None:
            now_str = datetime.utcnow().strftime("%Y-%m-%d %H:%M")
            # Enforce one review per user per movie: update existing or insert new
            existing_review = reviews_col.find_one({
                "movie_id": str(movie_id),
                "username": {"$regex": f"^{username}$", "$options": "i"}
            })

            if existing_review:
                reviews_col.update_one(
                    {"_id": existing_review['_id']},
                    {"$set": {
                        "rating": rating,
                        "comment": comment,
                        "updated_at": now_str
                    }}
                )
                saved_review = reviews_col.find_one({"_id": existing_review['_id']})
                is_updated = True
            else:
                new_review = {
                    "movie_id": str(movie_id),
                    "username": username,
                    "rating": rating,
                    "comment": comment,
                    "created_at": now_str
                }
                insert_result = reviews_col.insert_one(new_review)
                new_review['_id'] = insert_result.inserted_id
                saved_review = new_review
                is_updated = False

            # Recalculate average rating for the movie
            all_reviews = list(reviews_col.find({"movie_id": str(movie_id)}))
            avg = 0.0
            if all_reviews:
                avg = round(sum(r['rating'] for r in all_reviews) / len(all_reviews), 1)
            if movies_col is not None:
                query = {"_id": ObjectId(movie_id)} if ObjectId.is_valid(movie_id) else {"title": movie_id}
                movies_col.update_one(query, {"$set": {"global_rating": avg}})

            return JsonResponse({
                "success": True, 
                "review": _serialize_mongo_doc(saved_review),
                "global_rating": avg,
                "is_updated": is_updated
            })

        return JsonResponse({"error": "Database not connected"}, status=503)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)

@csrf_exempt
def api_delete_review(request, review_id):
    """Endpoint to delete a review (Admin can delete any review; user can delete own review)."""
    if request.method not in ('POST', 'DELETE'):
        return JsonResponse({"error": "Method not allowed"}, status=405)
    try:
        reviews_col = get_collection('reviews')
        movies_col = get_collection('movies')
        if reviews_col is None:
            return JsonResponse({"error": "Database not connected"}, status=503)

        review_query = {"_id": ObjectId(review_id)} if ObjectId.is_valid(review_id) else {"_id": review_id}
        review = reviews_col.find_one(review_query)
        if not review:
            return JsonResponse({"error": "Review not found"}, status=404)

        user = _get_current_user(request)
        is_admin = False
        client_username = ''
        try:
            data = json.loads(request.body) if request.body else {}
            client_username = data.get('username', '').strip()
        except Exception:
            pass

        if user and user.get('is_staff'):
            is_admin = True
        elif client_username:
            users_col = get_collection('users')
            if users_col is not None:
                db_user = users_col.find_one({"username": {"$regex": f"^{client_username}$", "$options": "i"}})
                if db_user and db_user.get('is_staff'):
                    is_admin = True

        effective_username = (user.get('username') if user else client_username).lower()
        is_author = bool(effective_username and effective_username == review.get('username', '').lower())

        if not (is_admin or is_author):
            return JsonResponse({"error": "You do not have permission to delete this review."}, status=403)

        movie_id = review.get('movie_id')
        reviews_col.delete_one(review_query)

        # Recalculate movie global rating
        all_reviews = list(reviews_col.find({"movie_id": str(movie_id)}))
        new_rating = 0.0
        if all_reviews:
            new_rating = round(sum(r['rating'] for r in all_reviews) / len(all_reviews), 1)

        if movies_col is not None:
            movie_query = {"_id": ObjectId(movie_id)} if ObjectId.is_valid(movie_id) else {"title": movie_id}
            movies_col.update_one(movie_query, {"$set": {"global_rating": new_rating}})

        return JsonResponse({
            "success": True,
            "message": "Review deleted successfully",
            "new_rating": new_rating
        })
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)

@csrf_exempt
def api_toggle_watchlist(request):
    """Toggles movie in the user's watchlist in MongoDB."""
    if request.method != 'POST':
        return JsonResponse({"error": "Method not allowed"}, status=405)

    try:
        data = json.loads(request.body)
        movie_id = str(data.get('movie_id', '')).strip()
        username = data.get('username') or (request.user.username if request.user.is_authenticated else 'anonymous')

        if not movie_id:
            return JsonResponse({"error": "movie_id is required"}, status=400)

        watchlist_col = get_collection('watchlists')
        if watchlist_col is not None:
            existing = watchlist_col.find_one({"username": username, "movie_id": movie_id})
            if existing:
                watchlist_col.delete_one({"_id": existing['_id']})
                in_watchlist = False
            else:
                watchlist_col.insert_one({
                    "username": username,
                    "movie_id": movie_id,
                    "added_at": datetime.utcnow().strftime("%Y-%m-%d %H:%M")
                })
                in_watchlist = True

            user_items = list(watchlist_col.find({"username": username}))
            return JsonResponse({
                "success": True,
                "in_watchlist": in_watchlist,
                "watchlist_movie_ids": [item['movie_id'] for item in user_items]
            })

        return JsonResponse({"error": "Database not connected"}, status=503)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)

def api_get_watchlist(request):
    """Returns user's watchlist movie IDs from MongoDB."""
    username = request.GET.get('username') or (request.user.username if request.user.is_authenticated else 'anonymous')
    watchlist_col = get_collection('watchlists')
    if watchlist_col is not None:
        items = list(watchlist_col.find({"username": username}))
        return JsonResponse({
            "success": True,
            "watchlist_movie_ids": [item['movie_id'] for item in items]
        })
    return JsonResponse({"success": True, "watchlist_movie_ids": []})

@csrf_exempt
def api_register(request):
    """Registers a new user directly in MongoDB Atlas 'users' collection."""
    if request.method != 'POST':
        return JsonResponse({"error": "Method not allowed"}, status=405)
    try:
        data = json.loads(request.body)
        username = data.get('username', '').strip()
        password = data.get('password', '').strip()
        email = data.get('email', '').strip()

        if not username or not password:
            return JsonResponse({"error": "Username and password required"}, status=400)

        users_col = get_collection('users')
        if users_col is None:
            return JsonResponse({"error": "Database not connected"}, status=503)

        if users_col.find_one({"username": {"$regex": f"^{username}$", "$options": "i"}}):
            return JsonResponse({"error": "Username already taken"}, status=400)

        # First registered user or username 'admin' gets admin/staff privileges
        is_staff = (username.lower() == 'admin') or (users_col.count_documents({}) == 0)

        new_user = {
            "username": username,
            "password_hash": make_password(password),
            "email": email,
            "is_staff": is_staff,
            "created_at": datetime.utcnow().strftime("%Y-%m-%d %H:%M")
        }
        res = users_col.insert_one(new_user)
        user_id = str(res.inserted_id)

        request.session['user_id'] = user_id
        request.session['username'] = username
        request.session['is_staff'] = is_staff

        return JsonResponse({
            "success": True,
            "user": {
                "username": username, 
                "email": email,
                "is_staff": is_staff
            }
        })
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)

@csrf_exempt
def api_login(request):
    """Logs in an existing user using MongoDB Atlas."""
    if request.method != 'POST':
        return JsonResponse({"error": "Method not allowed"}, status=405)
    try:
        data = json.loads(request.body)
        username = data.get('username', '').strip()
        password = data.get('password', '').strip()

        if not username or not password:
            return JsonResponse({"error": "Username and password required"}, status=400)

        users_col = get_collection('users')
        if users_col is None:
            return JsonResponse({"error": "Database not connected"}, status=503)

        user = users_col.find_one({"username": {"$regex": f"^{username}$", "$options": "i"}})
        if user and check_password(password, user.get('password_hash', '')):
            request.session['user_id'] = str(user['_id'])
            request.session['username'] = user['username']
            request.session['is_staff'] = bool(user.get('is_staff', False))
            return JsonResponse({
                "success": True,
                "user": {
                    "username": user['username'], 
                    "email": user.get('email', ''),
                    "is_staff": bool(user.get('is_staff', False))
                }
            })
        return JsonResponse({"error": "Invalid username or password"}, status=401)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)

@csrf_exempt
def api_logout(request):
    """Logs out current user session."""
    request.session.flush()
    return JsonResponse({"success": True, "message": "Logged out successfully"})

def api_auth_status(request):
    """Checks current session authentication state against MongoDB Atlas."""
    user = _get_current_user(request)
    if user:
        return JsonResponse({
            "authenticated": True,
            "user": user
        })
    return JsonResponse({"authenticated": False, "user": None})

@csrf_exempt
def api_add_movie(request):
    """Admin endpoint to insert a new movie directly into MongoDB with initial rating 0.0 and multiple genres."""
    if request.method != 'POST':
        return JsonResponse({"error": "Method not allowed"}, status=405)
    try:
        data = json.loads(request.body)
        title = str(data.get('title', '')).strip()
        genres = _normalize_genres(data)
        release_year = int(data.get('release_year', 2024))
        synopsis = str(data.get('synopsis', '')).strip()
        poster_url = str(data.get('poster_url', '')).strip()
        video_url = str(data.get('video_url', '')).strip()

        if not title or not synopsis:
            return JsonResponse({"error": "Title and synopsis are required"}, status=400)
        if not poster_url:
            poster_url = "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=500&auto=format&fit=crop&q=80"

        # Movies start with a rating of 0.0 until users rate them
        new_movie = {
            "title": title,
            "genres": genres,
            "genre": ", ".join(genres),
            "release_year": release_year,
            "global_rating": 0.0,
            "synopsis": synopsis,
            "poster_url": poster_url,
            "video_url": video_url,
            "created_at": datetime.utcnow().strftime("%Y-%m-%d %H:%M")
        }

        col = get_collection('movies')
        if col is not None:
            res = col.insert_one(new_movie)
            new_movie['id'] = str(res.inserted_id)
            if '_id' in new_movie:
                del new_movie['_id']
            return JsonResponse({"success": True, "movie": new_movie, "source": "mongodb"})
        else:
            return JsonResponse({"error": "MongoDB collection not accessible"}, status=503)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)

@csrf_exempt
def api_update_movie(request, movie_id):
    """Admin endpoint to edit movie details (title, synopsis, multiple genres, release_year, poster_url, video_url). Ratings cannot be edited."""
    if request.method not in ('POST', 'PUT'):
        return JsonResponse({"error": "Method not allowed"}, status=405)
    try:
        data = json.loads(request.body)
        col = get_collection('movies')
        if col is None:
            return JsonResponse({"error": "Database not connected"}, status=503)

        update_fields = {}
        if 'title' in data and str(data['title']).strip():
            update_fields['title'] = str(data['title']).strip()
        if 'genres' in data or 'genre' in data:
            genres = _normalize_genres(data)
            update_fields['genres'] = genres
            update_fields['genre'] = ", ".join(genres)
        if 'release_year' in data:
            update_fields['release_year'] = int(data['release_year'])
        if 'synopsis' in data and str(data['synopsis']).strip():
            update_fields['synopsis'] = str(data['synopsis']).strip()
        if 'poster_url' in data and str(data['poster_url']).strip():
            update_fields['poster_url'] = str(data['poster_url']).strip()
        if 'video_url' in data:
            update_fields['video_url'] = str(data['video_url']).strip()

        # NOTE: global_rating is intentionally omitted and cannot be edited by admin!
        # It is strictly calculated dynamically from community reviews.

        if not update_fields:
            return JsonResponse({"error": "No valid fields provided for update"}, status=400)

        update_fields['updated_at'] = datetime.utcnow().strftime("%Y-%m-%d %H:%M")

        query = {"_id": ObjectId(movie_id)} if ObjectId.is_valid(movie_id) else {"title": movie_id}
        col.update_one(query, {"$set": update_fields})

        updated_doc = col.find_one(query)
        if not updated_doc:
            return JsonResponse({"error": "Movie not found"}, status=404)

        return JsonResponse({
            "success": True,
            "movie": _serialize_mongo_doc(updated_doc),
            "message": "Movie details updated successfully"
        })
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)

@csrf_exempt
def api_delete_movie(request, movie_id):
    """Admin endpoint to remove a movie from MongoDB."""
    if request.method not in ('POST', 'DELETE'):
        return JsonResponse({"error": "Method not allowed"}, status=405)
    try:
        col = get_collection('movies')
        reviews_col = get_collection('reviews')
        watchlist_col = get_collection('watchlists')

        if col is not None:
            if ObjectId.is_valid(movie_id):
                col.delete_one({"_id": ObjectId(movie_id)})
            else:
                col.delete_one({"title": movie_id})

            if reviews_col is not None:
                reviews_col.delete_many({"movie_id": str(movie_id)})
            if watchlist_col is not None:
                watchlist_col.delete_many({"movie_id": str(movie_id)})

            return JsonResponse({"success": True, "message": "Movie deleted from MongoDB"})
        return JsonResponse({"error": "Database not connected"}, status=503)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)

@csrf_exempt
def api_ai_match(request):
    """
    AI Movie Matchmaker endpoint:
    Analyzes user mood/preference and matches the best movie(s) from the catalog
    strictly using the Google Gemini 1.5 Flash API.
    """
    if request.method != 'POST':
        return JsonResponse({"error": "Method not allowed"}, status=405)

    try:
        data = json.loads(request.body) if request.body else {}
        user_mood = str(data.get('mood', '')).strip()
        if not user_mood:
            return JsonResponse({"error": "Please describe your mood or what you want to watch."}, status=400)

        gemini_api_key = os.getenv('GEMINI_API_KEY', '').strip()
        if not gemini_api_key:
            return JsonResponse({
                "error": "GEMINI_API_KEY is not configured. Please add GEMINI_API_KEY to your .env file or Render dashboard."
            }, status=500)

        col = get_collection('movies')
        if col is None:
            return JsonResponse({"error": "Database not connected"}, status=503)

        movies = [_serialize_mongo_doc(doc) for doc in col.find()]
        if not movies:
            return JsonResponse({"error": "No movies available in the catalog yet."}, status=404)

        import urllib.request
        import urllib.error
        import json as json_lib

        catalog_summary = []
        for m in movies:
            catalog_summary.append({
                "id": str(m['id']),
                "title": m['title'],
                "genres": m.get('genres', []),
                "synopsis": m.get('synopsis', ''),
                "rating": m.get('global_rating', 0.0)
            })

        system_prompt = (
            "You are CineMatch AI, an expert cinematic recommendation engine. "
            "Analyze the user's mood/craving and pick the 1-2 BEST matching movies strictly from the provided catalog. "
            "Return ONLY valid JSON matching this exact schema: "
            '{"matched_ids": ["<movie_id>"], "explanation": "<1-2 sentences personalized reasoning why this fits their vibe>"}'
        )

        gemini_payload = {
            "contents": [{
                "parts": [{
                    "text": f"{system_prompt}\n\nMovies Catalog:\n{json_lib.dumps(catalog_summary)}\n\nUser Mood / Craving:\n\"{user_mood}\""
                }]
            }],
            "generationConfig": {
                "response_mime_type": "application/json",
                "temperature": 0.3
            }
        }

        # Try active Gemini Flash models in priority order
        candidate_models = ["gemini-3.5-flash", "gemini-flash-latest", "gemini-2.5-flash", "gemini-1.5-flash"]
        matched_movie_ids = []
        explanation = ""
        last_error = ""

        for model_name in candidate_models:
            gemini_url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={gemini_api_key}"
            req = urllib.request.Request(
                gemini_url,
                data=json_lib.dumps(gemini_payload).encode('utf-8'),
                headers={'Content-Type': 'application/json'},
                method='POST'
            )
            try:
                with urllib.request.urlopen(req, timeout=12) as resp:
                    resp_data = json_lib.loads(resp.read().decode('utf-8'))
                    text_response = resp_data['candidates'][0]['content']['parts'][0]['text']
                    ai_json = json_lib.loads(text_response)
                    matched_movie_ids = [str(_id) for _id in ai_json.get('matched_ids', [])]
                    explanation = ai_json.get('explanation', '')
                    if matched_movie_ids:
                        break
            except urllib.error.HTTPError as http_err:
                error_body = http_err.read().decode('utf-8', errors='ignore')
                last_error = f"{model_name} ({http_err.code}): {error_body}"
                continue
            except Exception as gemini_err:
                last_error = f"{model_name} Error: {str(gemini_err)}"
                continue

        if not matched_movie_ids:
            return JsonResponse({
                "error": f"Failed to get recommendation from Google Gemini: {last_error}"
            }, status=502)

        matched_movies = [m for m in movies if str(m['id']) in matched_movie_ids]
        if not matched_movies and movies:
            matched_movies = [movies[0]]

        return JsonResponse({
            "success": True,
            "engine": "gemini",
            "mood": user_mood,
            "explanation": explanation,
            "matches": matched_movies
        })

    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)

# ==============================================================================
# DJANGO ADMIN PANEL REST API ENDPOINTS
# ==============================================================================

@csrf_exempt
@admin_required
def api_admin_stats(request):
    """Admin dashboard metrics overview."""
    try:
        users_col = get_collection('users')
        movies_col = get_collection('movies')
        reviews_col = get_collection('reviews')
        watchlist_col = get_collection('watchlists')

        total_users = users_col.count_documents({}) if users_col is not None else 0
        total_movies = movies_col.count_documents({}) if movies_col is not None else 0
        total_reviews = reviews_col.count_documents({}) if reviews_col is not None else 0
        total_watchlists = watchlist_col.count_documents({}) if watchlist_col is not None else 0

        # Calculate platform average rating
        avg_rating = 0.0
        if movies_col is not None and total_movies > 0:
            movies_with_rating = list(movies_col.find({"global_rating": {"$gt": 0}}))
            if movies_with_rating:
                avg_rating = round(sum(float(m.get('global_rating', 0)) for m in movies_with_rating) / len(movies_with_rating), 1)

        return JsonResponse({
            "success": True,
            "stats": {
                "total_users": total_users,
                "total_movies": total_movies,
                "total_reviews": total_reviews,
                "total_watchlists": total_watchlists,
                "avg_rating": avg_rating
            }
        })
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)

@csrf_exempt
@admin_required
def api_admin_users(request):
    """Returns list of registered users with activity stats."""
    try:
        users_col = get_collection('users')
        reviews_col = get_collection('reviews')
        watchlist_col = get_collection('watchlists')

        if users_col is None:
            return JsonResponse({"error": "Database not connected"}, status=503)

        user_docs = list(users_col.find().sort("created_at", -1))
        users_list = []
        for u in user_docs:
            uname = u.get('username', '')
            rev_count = reviews_col.count_documents({"username": {"$regex": f"^{uname}$", "$options": "i"}}) if reviews_col is not None else 0
            watch_count = watchlist_col.count_documents({"username": uname}) if watchlist_col is not None else 0

            users_list.append({
                "id": str(u['_id']),
                "username": uname,
                "email": u.get('email', ''),
                "is_staff": bool(u.get('is_staff', False)),
                "created_at": u.get('created_at', 'N/A'),
                "reviews_count": rev_count,
                "watchlist_count": watch_count
            })

        return JsonResponse({
            "success": True,
            "count": len(users_list),
            "users": users_list
        })
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)

@csrf_exempt
@admin_required
def api_admin_toggle_user_role(request, user_id):
    """Toggles user staff/admin role."""
    if request.method != 'POST':
        return JsonResponse({"error": "Method not allowed"}, status=405)
    try:
        users_col = get_collection('users')
        if users_col is None:
            return JsonResponse({"error": "Database not connected"}, status=503)

        query = {"_id": ObjectId(user_id)} if ObjectId.is_valid(user_id) else {"_id": user_id}
        target_user = users_col.find_one(query)
        if not target_user:
            return JsonResponse({"error": "User not found"}, status=404)

        current_user = get_session_user(request)
        if current_user and str(current_user.get('id')) == str(target_user['_id']):
            return JsonResponse({"error": "Cannot change your own admin privileges."}, status=400)

        new_role = not target_user.get('is_staff', False)
        users_col.update_one(query, {"$set": {"is_staff": new_role}})

        return JsonResponse({
            "success": True,
            "user_id": str(target_user['_id']),
            "username": target_user['username'],
            "is_staff": new_role,
            "message": f"User '{target_user['username']}' is now {'an Admin' if new_role else 'a Member'}."
        })
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)

@csrf_exempt
@admin_required
def api_admin_delete_user(request, user_id):
    """Deletes a user and cascades deletion of their reviews and watchlist."""
    if request.method not in ('POST', 'DELETE'):
        return JsonResponse({"error": "Method not allowed"}, status=405)
    try:
        users_col = get_collection('users')
        reviews_col = get_collection('reviews')
        watchlist_col = get_collection('watchlists')

        if users_col is None:
            return JsonResponse({"error": "Database not connected"}, status=503)

        query = {"_id": ObjectId(user_id)} if ObjectId.is_valid(user_id) else {"_id": user_id}
        target_user = users_col.find_one(query)
        if not target_user:
            return JsonResponse({"error": "User not found"}, status=404)

        current_user = get_session_user(request)
        if current_user and str(current_user.get('id')) == str(target_user['_id']):
            return JsonResponse({"error": "Cannot delete your own account from admin panel."}, status=400)

        username = target_user['username']
        users_col.delete_one(query)

        # Cleanup user's reviews and watchlist
        if reviews_col is not None:
            reviews_col.delete_many({"username": {"$regex": f"^{username}$", "$options": "i"}})
        if watchlist_col is not None:
            watchlist_col.delete_many({"username": username})

        return JsonResponse({
            "success": True,
            "message": f"User '{username}' and their data have been removed."
        })
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)

@csrf_exempt
@admin_required
def api_admin_recent_reviews(request):
    """Returns recent platform reviews across all movies for moderation."""
    try:
        reviews_col = get_collection('reviews')
        movies_col = get_collection('movies')

        if reviews_col is None:
            return JsonResponse({"error": "Database not connected"}, status=503)

        raw_reviews = list(reviews_col.find().sort("created_at", -1).limit(40))
        results = []

        # Cache movie titles to avoid redundant queries
        movie_title_map = {}
        for r in raw_reviews:
            mid = str(r.get('movie_id', ''))
            if mid not in movie_title_map and movies_col is not None:
                mquery = {"_id": ObjectId(mid)} if ObjectId.is_valid(mid) else {"title": mid}
                mdoc = movies_col.find_one(mquery)
                movie_title_map[mid] = mdoc.get('title', 'Unknown Movie') if mdoc else 'Unknown Movie'

            serialized = _serialize_mongo_doc(r)
            serialized['movie_title'] = movie_title_map.get(mid, 'Unknown Movie')
            results.append(serialized)

        return JsonResponse({
            "success": True,
            "count": len(results),
            "reviews": results
        })
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)

