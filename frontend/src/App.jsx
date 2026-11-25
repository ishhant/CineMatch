import React, { useState, useEffect } from 'react';
import { 
  Film, Search, Bookmark, Star, Heart, Check, 
  X, User, LogIn, LogOut, Info, Sparkles, Filter,
  PlusCircle, Trash2, Shield, Image, Pencil, Lock, Play,
  Users, MessageSquare, ArrowUpDown,
  ThumbsUp, Trophy, UploadCloud, Award
} from 'lucide-react';
import './App.css';
import logoImg from './assets/logo.png';

let rawEnvUrl = (import.meta.env.VITE_API_URL || '').trim().replace(/\/+$/, '');
if (rawEnvUrl && !rawEnvUrl.endsWith('/api')) {
  rawEnvUrl += '/api';
}
const ENV_API_URL = rawEnvUrl;

const API_CANDIDATES = [
  ...(ENV_API_URL ? [ENV_API_URL] : []),
  'http://127.0.0.1:8080/api',
  'http://127.0.0.1:8000/api',
  'http://localhost:8080/api',
  'http://localhost:8000/api'
];

let cachedApiBase = ENV_API_URL || 'http://127.0.0.1:8080/api';

const GENRES = ['All', 'Action', 'Sci-Fi', 'Drama', 'Crime', 'Animation', 'Thriller', 'Horror', 'Comedy'];

const SAMPLE_POSTERS = [
  "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=500&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=500&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=500&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=500&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1518676599649-9c7a3be2935c?w=500&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=500&auto=format&fit=crop&q=80"
];

// Extract clean YouTube embed URL from any YouTube link format
const getYouTubeEmbedUrl = (url) => {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  const match = trimmed.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/);
  if (match && match[1]) {
    return `https://www.youtube-nocookie.com/embed/${match[1]}?autoplay=1&rel=0`;
  }
  return null;
};

const getMovieGenres = (movie) => {
  if (!movie) return [];
  if (Array.isArray(movie.genres) && movie.genres.length > 0) return movie.genres;
  if (movie.genre) return movie.genre.split(',').map(s => s.trim()).filter(Boolean);
  return ['Action'];
};

export default function App() {
  const [apiBase, setApiBase] = useState(cachedApiBase);
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('All');
  const [minRating, setMinRating] = useState('');
  const [availableOnly, setAvailableOnly] = useState(false);
  const [sortBy, setSortBy] = useState('newest'); // 'newest' | 'rating_desc' | 'rating_asc' | 'year_desc' | 'year_asc' | 'title_asc' | 'title_desc'
  
  // Watchlist & View
  const [watchlistIds, setWatchlistIds] = useState([]);
  const [currentView, setCurrentView] = useState('explore'); // 'explore' | 'watchlist'

  // System & Auth
  const [systemStatus, setSystemStatus] = useState({ connected: false, message: 'Checking...' });
  const [currentUser, setCurrentUser] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'register'
  const [authForm, setAuthForm] = useState({ username: '', password: '', email: '' });
  const [authError, setAuthError] = useState('');

  // Admin Add Movie Modal State
  const [showAddMovieModal, setShowAddMovieModal] = useState(false);
  const [submittingMovie, setSubmittingMovie] = useState(false);
  const [addMovieError, setAddMovieError] = useState('');
  const [newMovieForm, setNewMovieForm] = useState({
    title: '',
    genres: ['Action'],
    release_year: 2024,
    synopsis: '',
    poster_url: SAMPLE_POSTERS[0],
    video_url: ''
  });

  // Admin Edit Movie Modal State
  const [showEditMovieModal, setShowEditMovieModal] = useState(false);
  const [submittingEdit, setSubmittingEdit] = useState(false);
  const [editMovieError, setEditMovieError] = useState('');
  const [editingMovieForm, setEditingMovieForm] = useState({
    id: '',
    title: '',
    genres: ['Action'],
    release_year: 2024,
    synopsis: '',
    poster_url: '',
    video_url: '',
    global_rating: 0.0
  });

  // Selected Movie for Details / Reviews Modal
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: '' });
  const [submittingReview, setSubmittingReview] = useState(false);
  const [isEditingMyReview, setIsEditingMyReview] = useState(false);
  const [isPlayingVideo, setIsPlayingVideo] = useState(false);
  const [theaterMovie, setTheaterMovie] = useState(null); // Dedicated Fullscreen Cinema Theater Modal
  const [likingReviewId, setLikingReviewId] = useState(null);

  // Community Movie Contribution Modal State (+10 pts)
  const [showContributeModal, setShowContributeModal] = useState(false);
  const [contributeForm, setContributeForm] = useState({
    title: '',
    release_year: 2024,
    genres: ['Action'],
    synopsis: '',
    poster_url: '',
    video_url: ''
  });
  const [submittingContribute, setSubmittingContribute] = useState(false);
  const [contributeMsg, setContributeMsg] = useState({ type: '', text: '' });

  // AI Matchmaker Modal State
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiMoodInput, setAiMoodInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const [aiError, setAiError] = useState('');

  // Django Admin Portal Modal State
  const [showAdminPortal, setShowAdminPortal] = useState(false);
  const [adminPortalTab, setAdminPortalTab] = useState('users'); // 'users' | 'reviews' | 'submissions'
  const [adminStats, setAdminStats] = useState({
    total_users: 0,
    total_movies: 0,
    total_reviews: 0,
    total_watchlists: 0,
    avg_rating: 0,
    pending_submissions: 0,
    total_submissions: 0,
    total_community_points: 0
  });
  const [adminUsers, setAdminUsers] = useState([]);
  const [adminReviews, setAdminReviews] = useState([]);
  const [adminSubmissions, setAdminSubmissions] = useState([]);
  const [editingSubmission, setEditingSubmission] = useState(null);
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminActionLoading, setAdminActionLoading] = useState(false);
  const [adminPortalError, setAdminPortalError] = useState('');
  const [adminSuccessMsg, setAdminSuccessMsg] = useState('');

  // Community Leaderboard State
  const [showLeaderboardModal, setShowLeaderboardModal] = useState(false);
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [myStanding, setMyStanding] = useState(null);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);

  // Check system status & auto-detect Django port (8080 or 8000)
  const checkStatus = async () => {
    for (const candidate of API_CANDIDATES) {
      try {
        const res = await fetch(`${candidate}/status/`, { signal: AbortSignal.timeout(1500) });
        if (res.ok) {
          const data = await res.json();
          cachedApiBase = candidate;
          setApiBase(candidate);
          setSystemStatus({
            connected: data.mongodb_connected,
            message: data.message
          });
          return candidate;
        }
      } catch {
        // try next port
      }
    }
    setSystemStatus({
      connected: false,
      message: 'Backend API offline. Ensure Django server is running.'
    });
    return cachedApiBase;
  };

  // Check current auth status
  const checkAuth = async (base = apiBase) => {
    try {
      const res = await fetch(`${base}/auth/status/`, { credentials: 'include' });
      const data = await res.json();
      if (data.authenticated) {
        setCurrentUser(data.user);
      }
    } catch {
      // Ignore
    }
  };

  // Load watchlist
  const loadWatchlist = async (base = apiBase) => {
    try {
      const usernameParam = currentUser ? `?username=${currentUser.username}` : '';
      const res = await fetch(`${base}/watchlist/${usernameParam}`, { credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        setWatchlistIds(data.watchlist_movie_ids || []);
      }
    } catch {
      // Ignore
    }
  };

  // Fetch movies from Django REST API
  const fetchMovies = async (base = apiBase) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery.trim()) params.append('search', searchQuery.trim());
      if (selectedGenre !== 'All') params.append('genre', selectedGenre);
      if (minRating) params.append('min_rating', minRating);
      if (availableOnly) params.append('available', 'true');
      if (sortBy) params.append('sort', sortBy);

      const res = await fetch(`${base}/movies/?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setMovies(data.movies || []);
      }
    } catch (err) {
      console.error('Fetch movies error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkStatus().then(detectedBase => {
      fetchMovies(detectedBase);
      checkAuth(detectedBase);
      loadWatchlist(detectedBase);
    });
  }, []);

  useEffect(() => {
    loadWatchlist(apiBase);
  }, [currentUser]);

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      fetchMovies(apiBase);
    }, 250);
    return () => clearTimeout(delayDebounce);
  }, [searchQuery, selectedGenre, minRating, availableOnly, sortBy, apiBase]);

  // Toggle movie in watchlist
  const handleToggleWatchlist = async (e, movieId) => {
    e.stopPropagation();
    try {
      const res = await fetch(`${apiBase}/watchlist/toggle/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          movie_id: movieId,
          username: currentUser?.username || 'anonymous'
        })
      });
      const data = await res.json();
      if (data.success) {
        setWatchlistIds(data.watchlist_movie_ids || []);
      }
    } catch (err) {
      console.error('Watchlist toggle error:', err);
    }
  };

  // Open movie details & reviews (with optional autoPlay for direct stream)
  const handleOpenMovie = async (movie, autoPlay = false) => {
    if (autoPlay && movie.video_url) {
      setTheaterMovie(movie);
      return;
    }
    setSelectedMovie(movie);
    setIsEditingMyReview(false);
    setIsPlayingVideo(false);
    setReviewForm({ rating: 5, comment: '' });
    try {
      const res = await fetch(`${apiBase}/movies/${movie.id}/`);
      const data = await res.json();
      if (data.success) {
        setSelectedMovie(data.movie);
      }
    } catch (err) {
      console.error('Error loading movie details:', err);
    }
  };

  // Keyboard shortcut: ESC to exit Cinema Theater mode
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && theaterMovie) {
        setTheaterMovie(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [theaterMovie]);

  const handleStartEditMyReview = (existingRev) => {
    setReviewForm({ rating: existingRev.rating, comment: existingRev.comment });
    setIsEditingMyReview(true);
  };

  const handleCancelEditMyReview = () => {
    setIsEditingMyReview(false);
    setReviewForm({ rating: 5, comment: '' });
  };

  // Submit review (Authenticated only - updates existing or adds new)
  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!currentUser) {
      setShowAuthModal(true);
      return;
    }
    if (!reviewForm.comment.trim()) return;
    setSubmittingReview(true);
    try {
      const res = await fetch(`${apiBase}/movies/${selectedMovie.id}/review/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          rating: reviewForm.rating,
          comment: reviewForm.comment,
          username: currentUser.username
        })
      });
      const data = await res.json();
      if (data.success) {
        // Re-fetch movie detail to show recalculated global rating and reviews
        const movieRes = await fetch(`${apiBase}/movies/${selectedMovie.id}/`);
        const movieData = await movieRes.json();
        if (movieData.success) {
          setSelectedMovie(movieData.movie);
        }
        if (data.user_points !== undefined) {
          setCurrentUser(prev => prev ? { ...prev, points: data.user_points } : prev);
        }
        setIsEditingMyReview(false);
        setReviewForm({ rating: 5, comment: '' });
        fetchMovies(); // Refresh catalog ratings
      } else {
        alert(data.error || 'Failed to submit review');
      }
    } catch (err) {
      console.error('Submit review error:', err);
    } finally {
      setSubmittingReview(false);
    }
  };

  // Delete review (Admin or Author)
  const handleDeleteReview = async (reviewId) => {
    if (!window.confirm("Are you sure you want to delete this review?")) return;
    try {
      const res = await fetch(`${apiBase}/reviews/${reviewId}/delete/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username: currentUser?.username })
      });
      const data = await res.json();
      if (data.success) {
        // Re-fetch movie detail to show recalculated global rating and reviews
        const movieRes = await fetch(`${apiBase}/movies/${selectedMovie.id}/`);
        const movieData = await movieRes.json();
        if (movieData.success) {
          setSelectedMovie(movieData.movie);
        }
        setIsEditingMyReview(false);
        setReviewForm({ rating: 5, comment: '' });
        fetchMovies(); // Refresh catalog ratings
      } else {
        alert(data.error || 'Failed to delete review');
      }
    } catch (err) {
      console.error('Delete review error:', err);
    }
  };

  // Toggle Like on Review (+1 pt)
  const handleToggleReviewLike = async (reviewId) => {
    if (!currentUser) {
      setAuthMode('login');
      setShowAuthModal(true);
      return;
    }
    setLikingReviewId(reviewId);

    const username = currentUser.username;

    // Optimistic UI update: instantly toggle like icon and counter
    setSelectedMovie(prev => {
      if (!prev || !prev.reviews) return prev;
      return {
        ...prev,
        reviews: prev.reviews.map(r => {
          if (String(r.id) === String(reviewId)) {
            const currentLikedBy = Array.isArray(r.liked_by) ? r.liked_by : [];
            const currentlyLiked = currentLikedBy.some(u => u.toLowerCase() === username.toLowerCase());
            const newLikedBy = currentlyLiked
              ? currentLikedBy.filter(u => u.toLowerCase() !== username.toLowerCase())
              : [...currentLikedBy, username];
            const newCount = currentlyLiked ? Math.max(0, (r.likes_count || 1) - 1) : (r.likes_count || 0) + 1;
            return {
              ...r,
              likes_count: newCount,
              liked_by: newLikedBy
            };
          }
          return r;
        })
      };
    });

    try {
      const res = await fetch(`${apiBase}/reviews/${reviewId}/like/?username=${encodeURIComponent(username)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username: username })
      });
      const data = await res.json();
      if (data.success) {
        setSelectedMovie(prev => {
          if (!prev || !prev.reviews) return prev;
          return {
            ...prev,
            reviews: prev.reviews.map(r => {
              if (String(r.id) === String(reviewId) || (data.review_id && String(r.id) === String(data.review_id))) {
                return {
                  ...r,
                  likes_count: data.likes_count,
                  liked_by: data.liked_by || (data.has_liked ? [username] : [])
                };
              }
              return r;
            })
          };
        });
        if (data.user_points !== undefined) {
          setCurrentUser(prev => prev ? { ...prev, points: data.user_points } : prev);
        }
      }
    } catch (err) {
      console.error('Error toggling review like:', err);
    } finally {
      setLikingReviewId(null);
    }
  };

  // Community Movie Contribution Handlers
  const toggleContributeGenre = (g) => {
    setContributeForm(prev => {
      const exists = prev.genres?.includes(g);
      const updated = exists ? prev.genres.filter(item => item !== g) : [...(prev.genres || []), g];
      return { ...prev, genres: updated.length ? updated : ['Action'] };
    });
  };

  const handleContributeSubmit = async (e) => {
    e.preventDefault();
    if (!currentUser) {
      setAuthMode('login');
      setShowAuthModal(true);
      return;
    }
    setSubmittingContribute(true);
    setContributeMsg({ type: '', text: '' });
    try {
      const res = await fetch(`${apiBase}/contribute/movie/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(contributeForm)
      });
      const data = await res.json();
      if (data.success) {
        setContributeMsg({ type: 'success', text: data.message });
        setContributeForm({
          title: '',
          release_year: 2024,
          genres: ['Action'],
          synopsis: '',
          poster_url: '',
          video_url: ''
        });
      } else {
        setContributeMsg({ type: 'error', text: data.error || 'Failed to submit movie.' });
      }
    } catch {
      setContributeMsg({ type: 'error', text: 'Network error submitting movie.' });
    } finally {
      setSubmittingContribute(false);
    }
  };

  const toggleNewGenre = (g) => {
    setNewMovieForm(prev => {
      const exists = prev.genres?.includes(g);
      const updated = exists ? prev.genres.filter(item => item !== g) : [...(prev.genres || []), g];
      return { ...prev, genres: updated.length ? updated : [g] };
    });
  };

  const toggleEditGenre = (g) => {
    setEditingMovieForm(prev => {
      const exists = prev.genres?.includes(g);
      const updated = exists ? prev.genres.filter(item => item !== g) : [...(prev.genres || []), g];
      return { ...prev, genres: updated.length ? updated : [g] };
    });
  };

  // Admin: Create Movie
  const handleCreateMovie = async (e) => {
    e.preventDefault();
    setSubmittingMovie(true);
    setAddMovieError('');
    try {
      const res = await fetch(`${apiBase}/movies/add/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(newMovieForm)
      });
      const data = await res.json();
      if (data.success) {
        setShowAddMovieModal(false);
        setNewMovieForm({
          title: '',
          genres: ['Action'],
          release_year: 2024,
          synopsis: '',
          poster_url: SAMPLE_POSTERS[0],
          video_url: ''
        });
        fetchMovies();
      } else {
        setAddMovieError(data.error || 'Failed to add movie');
      }
    } catch {
      setAddMovieError('Unable to connect to server. Please try again.');
    } finally {
      setSubmittingMovie(false);
    }
  };

  // Admin: Start Editing Movie
  const handleStartEdit = (e, movie) => {
    e.stopPropagation();
    const movieGenres = getMovieGenres(movie);
    setEditingMovieForm({
      id: movie.id,
      title: movie.title,
      genres: movieGenres.length ? movieGenres : ['Action'],
      release_year: movie.release_year,
      synopsis: movie.synopsis,
      poster_url: movie.poster_url,
      video_url: movie.video_url || '',
      global_rating: movie.global_rating !== undefined ? movie.global_rating : 0.0
    });
    setEditMovieError('');
    setShowEditMovieModal(true);
  };

  // Admin: Submit Edited Movie
  const handleUpdateMovie = async (e) => {
    e.preventDefault();
    setSubmittingEdit(true);
    setEditMovieError('');
    try {
      const res = await fetch(`${apiBase}/movies/${editingMovieForm.id}/update/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          title: editingMovieForm.title,
          genres: editingMovieForm.genres,
          release_year: editingMovieForm.release_year,
          synopsis: editingMovieForm.synopsis,
          poster_url: editingMovieForm.poster_url,
          video_url: editingMovieForm.video_url || ''
        })
      });
      const data = await res.json();
      if (data.success) {
        setShowEditMovieModal(false);
        if (selectedMovie && String(selectedMovie.id) === String(editingMovieForm.id)) {
          setSelectedMovie(prev => ({
            ...prev,
            ...data.movie
          }));
        }
        fetchMovies();
      } else {
        setEditMovieError(data.error || 'Failed to update movie');
      }
    } catch {
      setEditMovieError('Unable to connect to server. Please try again.');
    } finally {
      setSubmittingEdit(false);
    }
  };

  // Admin: Delete Movie
  const handleDeleteMovie = async (e, movieId) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this movie from the catalog?")) return;
    try {
      const res = await fetch(`${apiBase}/movies/${movieId}/delete/`, {
        method: 'POST',
        credentials: 'include'
      });
      const data = await res.json();
      if (data.success) {
        if (selectedMovie && String(selectedMovie.id) === String(movieId)) {
          setSelectedMovie(null);
        }
        fetchMovies();
      }
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  // AI Mood Matchmaker
  const handleAiMatch = async (overrideMood) => {
    const moodQuery = (typeof overrideMood === 'string' ? overrideMood : aiMoodInput).trim();
    if (!moodQuery) {
      setAiError('Please enter your mood or choose a vibe tag below.');
      return;
    }
    setAiLoading(true);
    setAiError('');
    if (typeof overrideMood === 'string') {
      setAiMoodInput(overrideMood);
    }
    try {
      const res = await fetch(`${apiBase}/ai-match/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mood: moodQuery })
      });
      const data = await res.json();
      if (data.success) {
        setAiResult(data);
      } else {
        setAiError(data.error || 'Failed to find matching movies.');
      }
    } catch {
      setAiError('Unable to connect to AI engine. Please verify the Django backend is running.');
    } finally {
      setAiLoading(false);
    }
  };

  // Open Admin Portal
  const openAdminPortal = async () => {
    setShowAdminPortal(true);
    setAdminPortalError('');
    setAdminSuccessMsg('');
    await fetchAdminPortalData();
  };

  const fetchAdminPortalData = async () => {
    setAdminLoading(true);
    try {
      const qs = currentUser ? `?admin_username=${encodeURIComponent(currentUser.username)}` : '';
      const [statsRes, usersRes, reviewsRes, subsRes] = await Promise.all([
        fetch(`${apiBase}/admin-panel/stats/${qs}`, { credentials: 'include' }),
        fetch(`${apiBase}/admin-panel/users/${qs}`, { credentials: 'include' }),
        fetch(`${apiBase}/admin-panel/reviews/${qs}`, { credentials: 'include' }),
        fetch(`${apiBase}/admin-panel/submissions/${qs}`, { credentials: 'include' })
      ]);
      const statsData = await statsRes.json();
      const usersData = await usersRes.json();
      const reviewsData = await reviewsRes.json();
      const subsData = await subsRes.json();

      if (statsData.success) setAdminStats(statsData.stats);
      if (usersData.success) setAdminUsers(usersData.users);
      if (reviewsData.success) setAdminReviews(reviewsData.reviews);
      if (subsData.success) setAdminSubmissions(subsData.submissions);
    } catch (err) {
      console.error('Error fetching admin data:', err);
      setAdminPortalError('Unable to load admin data from server.');
    } finally {
      setAdminLoading(false);
    }
  };

  const handleToggleUserRole = async (targetUser) => {
    setAdminActionLoading(true);
    setAdminPortalError('');
    setAdminSuccessMsg('');
    try {
      const res = await fetch(`${apiBase}/admin-panel/users/${targetUser.id}/role/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ admin_username: currentUser?.username })
      });
      const data = await res.json();
      if (data.success) {
        setAdminSuccessMsg(data.message);
        setAdminUsers(prev => prev.map(u => u.id === targetUser.id ? { ...u, is_staff: data.is_staff } : u));
      } else {
        setAdminPortalError(data.error || 'Failed to toggle user role.');
      }
    } catch {
      setAdminPortalError('Server error while toggling user role.');
    } finally {
      setAdminActionLoading(false);
    }
  };

  const handleDeleteUser = async (targetUser) => {
    if (!window.confirm(`Are you sure you want to permanently delete user "${targetUser.username}" and all their reviews?`)) return;
    setAdminActionLoading(true);
    setAdminPortalError('');
    setAdminSuccessMsg('');
    try {
      const res = await fetch(`${apiBase}/admin-panel/users/${targetUser.id}/delete/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ admin_username: currentUser?.username })
      });
      const data = await res.json();
      if (data.success) {
        setAdminSuccessMsg(data.message);
        setAdminUsers(prev => prev.filter(u => u.id !== targetUser.id));
        fetchAdminPortalData();
      } else {
        setAdminPortalError(data.error || 'Failed to delete user.');
      }
    } catch {
      setAdminPortalError('Server error while deleting user.');
    } finally {
      setAdminActionLoading(false);
    }
  };

  const handleAdminDeleteReview = async (reviewId) => {
    if (!window.confirm('Are you sure you want to delete this review?')) return;
    try {
      const res = await fetch(`${apiBase}/reviews/${reviewId}/delete/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username: currentUser?.username })
      });
      const data = await res.json();
      if (data.success) {
        setAdminReviews(prev => prev.filter(r => String(r.id) !== String(reviewId)));
        setAdminSuccessMsg('Review removed successfully.');
        fetchMovies();
      } else {
        setAdminPortalError(data.error || 'Failed to delete review.');
      }
    } catch {
      setAdminPortalError('Server error while deleting review.');
    }
  };

  // Admin Accept Submission (+10 pts to contributor)
  const handleAcceptSubmission = async (submission, overrideData = null) => {
    setAdminActionLoading(true);
    setAdminPortalError('');
    setAdminSuccessMsg('');
    try {
      const adminUser = currentUser?.username || 'admin';
      const payload = {
        admin_username: adminUser,
        ...(overrideData || submission)
      };
      const res = await fetch(`${apiBase}/admin-panel/submissions/${submission.id}/accept/?admin_username=${encodeURIComponent(adminUser)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        setAdminSuccessMsg(data.message);
        setEditingSubmission(null);
        await fetchAdminPortalData();
        fetchMovies();
      } else {
        setAdminPortalError(data.error || 'Failed to accept submission.');
      }
    } catch {
      setAdminPortalError('Server error while accepting submission.');
    } finally {
      setAdminActionLoading(false);
    }
  };

  // Admin Reject Submission
  const handleRejectSubmission = async (submissionId) => {
    if (!window.confirm('Are you sure you want to reject this film submission?')) return;
    setAdminActionLoading(true);
    setAdminPortalError('');
    setAdminSuccessMsg('');
    try {
      const adminUser = currentUser?.username || 'admin';
      const res = await fetch(`${apiBase}/admin-panel/submissions/${submissionId}/reject/?admin_username=${encodeURIComponent(adminUser)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ admin_username: adminUser })
      });
      const data = await res.json();
      if (data.success) {
        setAdminSuccessMsg(data.message);
        setEditingSubmission(null);
        await fetchAdminPortalData();
      } else {
        setAdminPortalError(data.error || 'Failed to reject submission.');
      }
    } catch {
      setAdminPortalError('Server error while rejecting submission.');
    } finally {
      setAdminActionLoading(false);
    }
  };

  // Community Leaderboard Fetcher
  const fetchLeaderboard = async () => {
    setLoadingLeaderboard(true);
    try {
      const q = currentUser ? `?username=${encodeURIComponent(currentUser.username)}` : '';
      const res = await fetch(`${apiBase}/leaderboard/${q}`);
      const data = await res.json();
      if (data.success) {
        setLeaderboardData(data.leaderboard || []);
        setMyStanding(data.my_standing || null);
      }
    } catch (err) {
      console.error('Error fetching leaderboard:', err);
    } finally {
      setLoadingLeaderboard(false);
    }
  };

  const openLeaderboard = () => {
    setShowLeaderboardModal(true);
    fetchLeaderboard();
  };

  // Handle Auth submit
  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthError('');
    const endpoint = authMode === 'login' ? 'login' : 'register';
    try {
      const res = await fetch(`${apiBase}/auth/${endpoint}/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(authForm)
      });
      const data = await res.json();
      if (data.success) {
        setCurrentUser(data.user);
        setShowAuthModal(false);
        setAuthForm({ username: '', password: '', email: '' });
      } else {
        setAuthError(data.error || 'Authentication failed');
      }
    } catch {
      setAuthError('Unable to connect to server. Please try again.');
    }
  };

  const handleLogout = async () => {
    try {
      await fetch(`${apiBase}/auth/logout/`, {
        method: 'POST',
        credentials: 'include'
      });
      setCurrentUser(null);
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  // Filter movies for Watchlist view and Available Streams
  const baseMovies = currentView === 'watchlist'
    ? movies.filter(m => watchlistIds.includes(String(m.id)))
    : movies;
  const filteredAvailable = availableOnly
    ? baseMovies.filter(m => m.video_url && m.video_url.trim().length > 0)
    : baseMovies;

  const displayedMovies = currentView === 'watchlist'
    ? [...filteredAvailable].sort((a, b) => {
        if (sortBy === 'rating_desc') return (b.global_rating || 0) - (a.global_rating || 0);
        if (sortBy === 'rating_asc') return (a.global_rating || 0) - (b.global_rating || 0);
        if (sortBy === 'year_desc') return (b.release_year || 0) - (a.release_year || 0);
        if (sortBy === 'year_asc') return (a.release_year || 0) - (b.release_year || 0);
        if (sortBy === 'title_asc') return (a.title || '').localeCompare(b.title || '');
        if (sortBy === 'title_desc') return (b.title || '').localeCompare(a.title || '');
        return 0;
      })
    : filteredAvailable;

  const featuredMovie = movies[0];

  return (
    <div className="app-container">
      {/* NAVBAR */}
      <header className="navbar">
        <div className="brand-section" onClick={() => setCurrentView('explore')}>
          <img src={logoImg} alt="CineMatch" className="brand-logo-img" />
        </div>

        {/* SEARCH BAR (Live Async Engine) */}
        <div className="search-bar-container">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="Search movies by title or synopsis..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* ACTIONS & AUTH */}
        <div className="nav-actions">
          {/* AI Mood Matchmaker button */}
          <button 
            className="ai-nav-btn"
            onClick={() => {
              setShowAiModal(true);
              setAiError('');
            }}
            title="AI Mood Matchmaker"
          >
            <Sparkles size={16} className="ai-nav-sparkle" />
            <span>AI Matchmaker</span>
          </button>

          {/* Contribute Movie Button (Only for community members & guests; hidden for admin) */}
          {!currentUser?.is_staff && (
            <button 
              className="contribute-nav-btn"
              onClick={() => {
                if (!currentUser) {
                  setAuthMode('login');
                  setShowAuthModal(true);
                } else {
                  setShowContributeModal(true);
                  setContributeMsg({ type: '', text: '' });
                }
              }}
              title="Contribute a Film to Catalog (+10 Points on Staff Approval)"
            >
              <UploadCloud size={15} />
              <span>Contribute</span>
            </button>
          )}

          {/* Admin Controls (visible if user is staff) */}
          {currentUser?.is_staff && (
            <>
              <button 
                className="admin-portal-nav-btn"
                onClick={openAdminPortal}
                title="Catalog & Operations Control Center"
              >
                <Shield size={16} />
                <span>Control Center</span>
                {adminStats.pending_submissions > 0 && (
                  <span className="admin-pending-dot" title={`${adminStats.pending_submissions} Pending Film Submissions`}>
                    {adminStats.pending_submissions}
                  </span>
                )}
              </button>

              <button 
                className="admin-add-btn"
                onClick={() => setShowAddMovieModal(true)}
                title="Add Movie Directly to Catalog"
              >
                <PlusCircle size={16} />
                <span>Add Movie</span>
              </button>
            </>
          )}

          {/* Community Leaderboard */}
          <button 
            className="nav-btn"
            onClick={openLeaderboard}
            title="Top Cinephile Contributors Leaderboard"
          >
            <Award size={15} />
            <span>Leaderboard</span>
          </button>

          {/* Watchlist Toggle Button */}
          <button 
            className={`nav-btn ${currentView === 'watchlist' ? 'active' : ''}`}
            onClick={() => setCurrentView(currentView === 'watchlist' ? 'explore' : 'watchlist')}
          >
            <Bookmark size={16} />
            <span>Watchlist</span>
            <span className="badge-count">{watchlistIds.length}</span>
          </button>

          {/* User Auth & Points Display */}
          {currentUser ? (
            <div className="user-profile-nav">
              <span className="user-profile-name">{currentUser.username}</span>

              {/* Points badge for community users, Admin badge for staff */}
              {currentUser.is_staff ? (
                <span className="user-badge staff" title="Staff Administrator">
                  <Shield size={12} />
                  <span>Admin</span>
                </span>
              ) : (
                <span 
                  className="user-badge points"
                  onClick={openLeaderboard}
                  style={{ cursor: 'pointer' }}
                  title="Your Community Reputation: +2 per review, +1 per like, +10 per accepted movie (Click to view Leaderboard)"
                >
                  <Trophy size={13} color="#cbd5e1" />
                  <span>{currentUser.points || 0} pts</span>
                </span>
              )}

              <button className="nav-btn logout-btn" onClick={handleLogout} title="Logout">
                <LogOut size={15} />
              </button>
            </div>
          ) : (
            <button className="auth-btn" onClick={() => setShowAuthModal(true)}>
              <LogIn size={15} style={{ display: 'inline', marginRight: '6px' }} />
              Sign In
            </button>
          )}
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="main-content">
        {/* HERO BANNER (Only on Explore tab when not searching) */}
        {currentView === 'explore' && !searchQuery && featuredMovie && (
          <div className="hero-banner">
            <div 
              className="hero-backdrop-blur"
              style={{ backgroundImage: `url(${featuredMovie.poster_url})` }}
            />
            <div className="hero-overlay" />

            <div className="hero-inner">
              <div 
                className="hero-poster-wrapper"
                onClick={() => handleOpenMovie(featuredMovie)}
                title={`View ${featuredMovie.title}`}
              >
                <img 
                  src={featuredMovie.poster_url} 
                  alt={featuredMovie.title} 
                  className="hero-poster-img"
                />
              </div>

              <div className="hero-content">
                <div className="hero-badge">
                  <Sparkles size={12} /> Spotlight Premiere
                </div>
                <h1 className="hero-title">{featuredMovie.title}</h1>
                <div className="hero-meta">
                  <span>{featuredMovie.release_year}</span>
                  <span>•</span>
                  <span>{getMovieGenres(featuredMovie).join(', ')}</span>
                  <span>•</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--accent-gold)' }}>
                    <Star size={14} fill={featuredMovie.global_rating > 0 ? "currentColor" : "none"} /> 
                    {featuredMovie.global_rating > 0 ? Number(featuredMovie.global_rating).toFixed(1) : '0.0 (Unrated)'}
                  </span>
                </div>
                <p className="hero-synopsis">{featuredMovie.synopsis}</p>
                <div className="hero-cta-group">
                  {featuredMovie.video_url && (
                    <button 
                      className="watch-hero-btn"
                      onClick={() => handleOpenMovie(featuredMovie, true)}
                    >
                      <Play size={15} fill="currentColor" /> Watch Movie
                    </button>
                  )}
                  <button 
                    className="auth-btn"
                    onClick={() => handleOpenMovie(featuredMovie)}
                  >
                    View Details & Reviews
                  </button>
                  <button 
                    className={`nav-btn ${watchlistIds.includes(String(featuredMovie.id)) ? 'active' : ''}`}
                    onClick={(e) => handleToggleWatchlist(e, String(featuredMovie.id))}
                  >
                    <Heart size={16} fill={watchlistIds.includes(String(featuredMovie.id)) ? 'currentColor' : 'none'} />
                    {watchlistIds.includes(String(featuredMovie.id)) ? 'Saved' : 'Add to Watchlist'}
                  </button>
                  {currentUser?.is_staff && (
                    <button 
                      className="nav-btn"
                      style={{ borderColor: '#3b82f6', color: '#93c5fd' }}
                      onClick={(e) => handleStartEdit(e, featuredMovie)}
                    >
                      <Pencil size={15} /> Edit Film
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* FILTERS & CATEGORIES (Explore mode) */}
        {currentView === 'explore' ? (
          <div className="filters-bar">
            <div className="genre-pills">
              {GENRES.map((g) => (
                <button
                  key={g}
                  className={`genre-pill ${selectedGenre === g ? 'active' : ''}`}
                  onClick={() => setSelectedGenre(g)}
                >
                  {g}
                </button>
              ))}
            </div>

            <div className="filter-controls-group">
              <button 
                type="button"
                className={`available-filter-pill ${availableOnly ? 'active' : ''}`}
                onClick={() => setAvailableOnly(!availableOnly)}
                title="Filter movies that can be played directly on CineMatch"
              >
                <Play size={12} fill={availableOnly ? "currentColor" : "none"} />
                <span>Available to Watch</span>
              </button>

              <div className="rating-filter">
                <Filter size={15} />
                <span>Min Rating:</span>
                <select 
                  className="rating-select"
                  value={minRating}
                  onChange={(e) => setMinRating(e.target.value)}
                >
                  <option value="">All Ratings</option>
                  <option value="4.5">4.5+ Stars</option>
                  <option value="4.0">4.0+ Stars</option>
                  <option value="3.0">3.0+ Stars</option>
                </select>
              </div>

              <div className="sort-filter">
                <ArrowUpDown size={15} />
                <span>Sort By:</span>
                <select 
                  className="sort-select"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                >
                  <option value="newest">Recently Added</option>
                  <option value="rating_desc">Highest Rated ⭐</option>
                  <option value="year_desc">Release Year (Newest)</option>
                  <option value="year_asc">Release Year (Classic)</option>
                  <option value="title_asc">Title (A to Z)</option>
                  <option value="title_desc">Title (Z to A)</option>
                </select>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h2 style={{ fontSize: '1.6rem', fontWeight: 700 }}>Your Private Watchlist</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                Films you've bookmarked to watch later.
              </p>
            </div>
            <div className="sort-filter">
              <ArrowUpDown size={15} />
              <span>Sort By:</span>
              <select 
                className="sort-select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="newest">Default Order</option>
                <option value="rating_desc">Highest Rated ⭐</option>
                <option value="year_desc">Release Year (Newest)</option>
                <option value="year_asc">Release Year (Classic)</option>
                <option value="title_asc">Title (A to Z)</option>
                <option value="title_desc">Title (Z to A)</option>
              </select>
            </div>
          </div>
        )}

        {/* MOVIES GRID */}
        {loading ? (
          <div className="empty-state">
            <p>Loading cinema catalog...</p>
          </div>
        ) : displayedMovies.length === 0 ? (
          <div className="empty-state">
            <Film className="empty-icon" />
            <h3>{currentView === 'watchlist' ? 'Your Watchlist is Empty' : 'No Titles in Catalog Yet'}</h3>
            <p>
              {currentView === 'watchlist' 
                ? "You haven't added any movies to your watchlist yet. Explore movies and save titles you want to watch!" 
                : (currentUser?.is_staff 
                    ? "Your catalog is empty. Click '+ Add Movie' above to publish your first movie."
                    : "No movies have been added to the catalog yet. Check back soon for new titles!")}
            </p>
            {currentView === 'watchlist' ? (
              <button 
                className="auth-btn" 
                style={{ marginTop: '1rem' }}
                onClick={() => setCurrentView('explore')}
              >
                Browse Catalog
              </button>
            ) : (
              currentUser?.is_staff ? (
                <button 
                  className="admin-add-btn" 
                  style={{ marginTop: '1rem', display: 'inline-flex' }}
                  onClick={() => setShowAddMovieModal(true)}
                >
                  <PlusCircle size={16} /> Add First Movie
                </button>
              ) : (
                <button 
                  className="auth-btn" 
                  style={{ marginTop: '1rem' }}
                  onClick={() => setShowAuthModal(true)}
                >
                  Sign In
                </button>
              )
            )}
          </div>
        ) : (
          <div className="movies-grid">
            {displayedMovies.map((movie) => {
              const inWatchlist = watchlistIds.includes(String(movie.id));
              const ratingDisplay = movie.global_rating > 0 ? Number(movie.global_rating).toFixed(1) : "0.0";
              return (
                <div 
                  key={movie.id} 
                  className="movie-card"
                  onClick={() => handleOpenMovie(movie)}
                >
                  <div className="poster-wrapper">
                    <img 
                      src={movie.poster_url} 
                      alt={movie.title} 
                      className="movie-poster"
                      loading="lazy" 
                    />
                    <div className="card-rating-badge">
                      <Star size={13} className="star-icon" fill={movie.global_rating > 0 ? "currentColor" : "none"} />
                      <span>{ratingDisplay}</span>
                    </div>

                    {movie.video_url && (
                      <div className="card-stream-badge" title="Streamable movie">
                        <Play size={10} fill="currentColor" /> Playable
                      </div>
                    )}

                    {/* Edit Button */}
                    {currentUser?.is_staff && (
                      <button 
                        className="card-edit-btn"
                        onClick={(e) => handleStartEdit(e, movie)}
                        title="Edit Film"
                      >
                        <Pencil size={15} />
                      </button>
                    )}

                    {/* Delete Button */}
                    {currentUser?.is_staff && (
                      <button 
                        className="card-delete-btn"
                        onClick={(e) => handleDeleteMovie(e, String(movie.id))}
                        title="Delete Film"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}

                    {/* User Watchlist Heart Toggle */}
                    <button 
                      className={`watchlist-toggle-btn ${inWatchlist ? 'in-watchlist' : ''}`}
                      onClick={(e) => handleToggleWatchlist(e, String(movie.id))}
                      title={inWatchlist ? "Remove from Watchlist" : "Add to Watchlist"}
                    >
                      <Heart size={16} fill={inWatchlist ? 'currentColor' : 'none'} />
                    </button>
                  </div>

                  <div className="card-info">
                    <div className="card-genre-year">
                      <span>{getMovieGenres(movie).join(' • ')}</span>
                      <span>{movie.release_year}</span>
                    </div>
                    <h3 className="card-title">{movie.title}</h3>
                    <p className="card-synopsis">{movie.synopsis}</p>
                    <div className="card-action-bar">
                      <span className="view-details-link">
                        Details & Reviews →
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* ADMIN: ADD MOVIE MODAL */}
      {showAddMovieModal && (
        <div className="modal-overlay" onClick={() => setShowAddMovieModal(false)}>
          <div className="modal-card auth-modal-card" style={{ maxWidth: '580px' }} onClick={(e) => e.stopPropagation()}>
            <button className="modal-close-btn" onClick={() => setShowAddMovieModal(false)}>
              <X size={18} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
              <PlusCircle size={20} color="var(--accent-red)" />
              <h2 style={{ fontSize: '1.3rem', fontWeight: 700 }}>Add New Movie</h2>
            </div>

            {addMovieError && <div className="auth-error">{addMovieError}</div>}

            <form className="auth-form" onSubmit={handleCreateMovie}>
              <div className="form-group">
                <label className="form-label">Movie Title</label>
                <input 
                  type="text" 
                  className="form-input" 
                  required
                  placeholder="e.g. Oppenheimer"
                  value={newMovieForm.title}
                  onChange={(e) => setNewMovieForm({ ...newMovieForm, title: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Release Year</label>
                <input 
                  type="number" 
                  className="form-input" 
                  required
                  min="1900"
                  max="2030"
                  value={newMovieForm.release_year}
                  onChange={(e) => setNewMovieForm({ ...newMovieForm, release_year: parseInt(e.target.value) || 2024 })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Genres (Select multiple)</label>
                <div className="genre-selector-chips">
                  {GENRES.filter(g => g !== 'All').map(g => (
                    <button
                      key={g}
                      type="button"
                      className={`genre-chip ${newMovieForm.genres?.includes(g) ? 'selected' : ''}`}
                      onClick={() => toggleNewGenre(g)}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>

              {/* RATING RULE NOTICE */}
              <div className="rating-locked-notice">
                <Lock size={15} />
                <span>Initial Rating starts at <strong>0.0</strong>. Rating will calculate automatically when users rate this film.</span>
              </div>

              <div className="form-group">
                <label className="form-label">Poster Image URL</label>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                  <input 
                    type="url" 
                    className="form-input" 
                    style={{ flex: 1 }}
                    placeholder="https://images.unsplash.com/..."
                    value={newMovieForm.poster_url}
                    onChange={(e) => setNewMovieForm({ ...newMovieForm, poster_url: e.target.value })}
                  />
                  <button 
                    type="button" 
                    className="nav-btn"
                    onClick={() => {
                      const rand = SAMPLE_POSTERS[Math.floor(Math.random() * SAMPLE_POSTERS.length)];
                      setNewMovieForm({ ...newMovieForm, poster_url: rand });
                    }}
                    title="Use Random Poster"
                  >
                    <Image size={15} /> Random
                  </button>
                  {newMovieForm.poster_url && (
                    <img 
                      src={newMovieForm.poster_url} 
                      alt="Preview" 
                      className="poster-preview-box" 
                      onError={(e) => e.target.style.display = 'none'}
                    />
                  )}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Play size={13} fill="currentColor" color="var(--accent-red)" />
                  YouTube Movie / Stream Link (Optional)
                </label>
                <input 
                  type="url" 
                  className="form-input" 
                  placeholder="e.g. https://www.youtube.com/watch?v=... or https://youtu.be/..."
                  value={newMovieForm.video_url}
                  onChange={(e) => setNewMovieForm({ ...newMovieForm, video_url: e.target.value })}
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '0.3rem', display: 'block' }}>
                  Add a YouTube link to enable direct in-app cinema playback for visitors.
                </span>
              </div>

              <div className="form-group">
                <label className="form-label">Synopsis / Plot Summary</label>
                <textarea
                  className="review-textarea"
                  style={{ minHeight: '90px' }}
                  required
                  placeholder="Provide a brief plot synopsis..."
                  value={newMovieForm.synopsis}
                  onChange={(e) => setNewMovieForm({ ...newMovieForm, synopsis: e.target.value })}
                />
              </div>

              <button 
                type="submit" 
                className="auth-submit-btn" 
                style={{ background: 'linear-gradient(135deg, #9333ea, #7c3aed)' }}
                disabled={submittingMovie}
              >
                {submittingMovie ? 'Saving Movie...' : 'Publish Movie'}
              </button>
            </form>
          </div>
        </div>
      )}


      {/* MOVIE DETAILS & REVIEWS MODAL */}
      {selectedMovie && (
        <div className="modal-overlay" onClick={() => setSelectedMovie(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close-btn" onClick={() => setSelectedMovie(null)}>
              <X size={18} />
            </button>

            <div className="movie-modal-body">
              <div className="movie-modal-header">
                <img 
                  src={selectedMovie.poster_url} 
                  alt={selectedMovie.title} 
                  className="modal-poster" 
                />
                <div className="modal-details">
                  <div className="modal-genre-tags-row">
                    {getMovieGenres(selectedMovie).map((g) => (
                      <span key={g} className="modal-genre-tag">{g}</span>
                    ))}
                  </div>
                  <h2 className="modal-title">{selectedMovie.title}</h2>
                  <div className="modal-rating-row">
                    <Star size={18} fill={selectedMovie.global_rating > 0 ? "currentColor" : "none"} />
                    <span>{selectedMovie.global_rating > 0 ? `${Number(selectedMovie.global_rating).toFixed(1)} / 5.0` : '0.0 / 5.0 (No reviews yet)'}</span>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-dim)', fontWeight: 400 }}>
                      • Released {selectedMovie.release_year}
                    </span>
                  </div>
                  <p className="modal-synopsis">{selectedMovie.synopsis}</p>
                  
                  <div style={{ marginTop: '1.25rem', display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    {selectedMovie.video_url && (
                      <button 
                        className="watch-player-btn"
                        onClick={() => {
                          setTheaterMovie(selectedMovie);
                        }}
                        title="Open in Cinema Theater"
                      >
                        <Play size={15} fill="currentColor" /> Watch in Cinema Theater
                      </button>
                    )}

                    <button 
                      className={`nav-btn ${watchlistIds.includes(String(selectedMovie.id)) ? 'active' : ''}`}
                      onClick={(e) => handleToggleWatchlist(e, String(selectedMovie.id))}
                    >
                      <Heart size={16} fill={watchlistIds.includes(String(selectedMovie.id)) ? 'currentColor' : 'none'} />
                      {watchlistIds.includes(String(selectedMovie.id)) ? 'In Your Watchlist' : 'Add to Watchlist'}
                    </button>

                    {currentUser?.is_staff && (
                      <button 
                        className="nav-btn"
                        style={{ borderColor: '#3b82f6', color: '#93c5fd' }}
                        onClick={(e) => handleStartEdit(e, selectedMovie)}
                      >
                        <Pencil size={15} /> Edit Film
                      </button>
                    )}

                    {currentUser?.is_staff && (
                      <button 
                        className="nav-btn"
                        style={{ borderColor: '#ef4444', color: '#fca5a5' }}
                        onClick={(e) => handleDeleteMovie(e, String(selectedMovie.id))}
                      >
                        <Trash2 size={15} /> Delete Film
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* REVIEWS SECTION */}
              <div className="reviews-section">
                <h3 className="reviews-title">Community Reviews</h3>

                {(() => {
                  const myReview = currentUser 
                    ? selectedMovie.reviews?.find(r => r.username.toLowerCase() === currentUser.username.toLowerCase()) 
                    : null;
                  const otherReviews = selectedMovie.reviews?.filter(r => !myReview || r.id !== myReview.id) || [];

                  return (
                    <>
                      {/* If user is not logged in */}
                      {!currentUser ? (
                        <div className="login-to-review-card">
                          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                            Sign in to rate and share your review for <strong>{selectedMovie.title}</strong>.
                          </p>
                          <button 
                            className="auth-btn" 
                            style={{ padding: '0.45rem 1rem', fontSize: '0.85rem' }}
                            onClick={() => setShowAuthModal(true)}
                          >
                            <LogIn size={14} style={{ display: 'inline', marginRight: '5px' }} />
                            Sign In to Review
                          </button>
                        </div>
                      ) : myReview && !isEditingMyReview ? (
                        /* User already reviewed: show their review with Edit button */
                        <div className="my-review-card">
                          <div className="my-review-header">
                            <div className="my-review-title-group">
                              <span className="my-review-badge">Your Review</span>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--accent-gold)', fontWeight: 600 }}>
                                <Star size={14} fill="currentColor" /> {myReview.rating}/5
                              </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                              <span className="review-date">
                                {myReview.updated_at ? `Edited ${myReview.updated_at}` : myReview.created_at}
                              </span>
                              <button 
                                type="button" 
                                className="my-review-edit-btn" 
                                onClick={() => handleStartEditMyReview(myReview)}
                                title="Edit your review"
                              >
                                <Pencil size={13} /> Edit Your Review
                              </button>
                              {(currentUser?.is_staff || (currentUser && currentUser.username.toLowerCase() === myReview.username.toLowerCase())) && (
                                <button 
                                  type="button"
                                  className="review-delete-btn"
                                  title="Delete your review"
                                  onClick={() => handleDeleteReview(myReview.id)}
                                >
                                  <Trash2 size={13} />
                                </button>
                              )}
                            </div>
                          </div>
                          <p className="review-comment" style={{ margin: 0 }}>{myReview.comment}</p>
                          <div className="review-footer-row" style={{ marginTop: '0.65rem' }}>
                            <span className="review-likes-display" title="Likes received on your review">
                              <ThumbsUp size={13} fill="currentColor" color="var(--accent-red)" />
                              <span>{myReview.likes_count || 0} {myReview.likes_count === 1 ? 'Like' : 'Likes'}</span>
                            </span>
                          </div>
                        </div>
                      ) : (
                        /* User hasn't reviewed yet, or is editing their review */
                        <form className="write-review-card" onSubmit={handleSubmitReview}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '6px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>
                                {isEditingMyReview ? 'Edit Your Review' : 'Rate this film'}
                              </span>
                              {!isEditingMyReview && (
                                <span className="review-reward-hint" title="Earn +2 community points for submitting a review">
                                  <Trophy size={11} color="#cbd5e1" /> +2 pts
                                </span>
                              )}
                            </div>
                            <div className="star-rating-select">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                  key={star}
                                  type="button"
                                  className={`star-btn ${reviewForm.rating >= star ? 'active' : ''}`}
                                  onClick={() => setReviewForm({ ...reviewForm, rating: star })}
                                >
                                  <Star size={18} fill={reviewForm.rating >= star ? 'currentColor' : 'none'} />
                                </button>
                              ))}
                            </div>
                          </div>

                          <textarea
                            className="review-textarea"
                            placeholder="Write your thoughts or review here..."
                            value={reviewForm.comment}
                            onChange={(e) => setReviewForm({ ...reviewForm, comment: e.target.value })}
                            required
                          />

                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.6rem' }}>
                            {isEditingMyReview && (
                              <button 
                                type="button" 
                                className="nav-btn" 
                                style={{ padding: '0.5rem 1rem' }}
                                onClick={handleCancelEditMyReview}
                              >
                                Cancel
                              </button>
                            )}
                            <button 
                              type="submit" 
                              className="submit-review-btn"
                              disabled={submittingReview}
                            >
                              {submittingReview ? 'Saving...' : (isEditingMyReview ? 'Update Review' : 'Submit Review (+2 pts)')}
                            </button>
                          </div>
                        </form>
                      )}

                      {/* Reviews List */}
                      <div className="reviews-list">
                        {otherReviews.length === 0 ? (
                          !myReview && (
                            <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem', textAlign: 'center', padding: '1rem 0' }}>
                              No community reviews yet. Be the first to review {selectedMovie.title}!
                            </p>
                          )
                        ) : (
                          otherReviews.map((r, i) => {
                            const isLikedByMe = r.liked_by?.some(u => u.toLowerCase() === currentUser?.username?.toLowerCase());
                            return (
                              <div key={r.id || i} className="review-item">
                                <div className="review-header">
                                  <div className="review-author-wrap">
                                    <span className="review-author">{r.username}</span>
                                    {r.user_is_staff ? (
                                      <span className="reviewer-tag staff" title="Staff Administrator">
                                        <Shield size={10} /> Staff
                                      </span>
                                    ) : r.user_points > 0 ? (
                                      <span className="reviewer-tag points" title={`${r.user_points} Community Points`}>
                                        <Trophy size={10} color="#cbd5e1" /> {r.user_points} pts
                                      </span>
                                    ) : null}
                                  </div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <span style={{ color: 'var(--accent-gold)', display: 'flex', alignItems: 'center', gap: '3px', fontWeight: 600 }}>
                                      <Star size={13} fill="currentColor" /> {r.rating}/5
                                    </span>
                                    <span className="review-date">{r.updated_at ? `Edited ${r.updated_at}` : r.created_at}</span>
                                    {(currentUser?.is_staff || (currentUser && currentUser.username.toLowerCase() === r.username.toLowerCase())) && (
                                      <button 
                                        className="review-delete-btn"
                                        title="Delete this review"
                                        onClick={() => handleDeleteReview(r.id)}
                                      >
                                        <Trash2 size={13} />
                                      </button>
                                    )}
                                  </div>
                                </div>
                                <p className="review-comment">{r.comment}</p>
                                <div className="review-footer-row">
                                  <button
                                    type="button"
                                    className={`review-like-btn ${isLikedByMe ? 'liked' : ''}`}
                                    onClick={() => handleToggleReviewLike(r.id)}
                                    disabled={likingReviewId === r.id}
                                    title={currentUser ? (isLikedByMe ? "Unlike this review" : "Like this review (+1 Community Point)") : "Sign in to like reviews & earn points"}
                                  >
                                    <ThumbsUp size={13} fill={isLikedByMe ? "currentColor" : "none"} />
                                    <span>{r.likes_count || 0}</span>
                                    <span className="like-label">{r.likes_count === 1 ? 'Like' : 'Likes'}</span>
                                  </button>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ADMIN: EDIT MOVIE MODAL (Rendered on top of movie details modal) */}
      {showEditMovieModal && (
        <div className="modal-overlay nested-modal-overlay" onClick={() => setShowEditMovieModal(false)}>
          <div className="modal-card auth-modal-card" style={{ maxWidth: '580px' }} onClick={(e) => e.stopPropagation()}>
            <button className="modal-close-btn" onClick={() => setShowEditMovieModal(false)}>
              <X size={18} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
              <Pencil size={20} color="#3b82f6" />
              <h2 style={{ fontSize: '1.3rem', fontWeight: 700 }}>Edit Movie Details</h2>
            </div>

            {editMovieError && <div className="auth-error">{editMovieError}</div>}

            <form className="auth-form" onSubmit={handleUpdateMovie}>
              <div className="form-group">
                <label className="form-label">Movie Title</label>
                <input 
                  type="text" 
                  className="form-input" 
                  required
                  value={editingMovieForm.title}
                  onChange={(e) => setEditingMovieForm({ ...editingMovieForm, title: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Release Year</label>
                <input 
                  type="number" 
                  className="form-input" 
                  required
                  min="1900"
                  max="2030"
                  value={editingMovieForm.release_year}
                  onChange={(e) => setEditingMovieForm({ ...editingMovieForm, release_year: parseInt(e.target.value) || 2024 })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Genres (Select multiple)</label>
                <div className="genre-selector-chips">
                  {GENRES.filter(g => g !== 'All').map(g => (
                    <button
                      key={g}
                      type="button"
                      className={`genre-chip ${editingMovieForm.genres?.includes(g) ? 'selected' : ''}`}
                      onClick={() => toggleEditGenre(g)}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Poster Image URL</label>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                  <input 
                    type="url" 
                    className="form-input" 
                    style={{ flex: 1 }}
                    value={editingMovieForm.poster_url}
                    onChange={(e) => setEditingMovieForm({ ...editingMovieForm, poster_url: e.target.value })}
                  />
                  {editingMovieForm.poster_url && (
                    <img 
                      src={editingMovieForm.poster_url} 
                      alt="Preview" 
                      className="poster-preview-box" 
                      onError={(e) => e.target.style.display = 'none'}
                    />
                  )}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Play size={13} fill="currentColor" color="var(--accent-red)" />
                  YouTube Movie / Stream Link (Optional)
                </label>
                <input 
                  type="url" 
                  className="form-input" 
                  placeholder="e.g. https://www.youtube.com/watch?v=... or https://youtu.be/..."
                  value={editingMovieForm.video_url || ''}
                  onChange={(e) => setEditingMovieForm({ ...editingMovieForm, video_url: e.target.value })}
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '0.3rem', display: 'block' }}>
                  Add a YouTube link to enable direct in-app cinema playback for visitors.
                </span>
              </div>

              <div className="form-group">
                <label className="form-label">Synopsis / Plot Summary</label>
                <textarea
                  className="review-textarea"
                  style={{ minHeight: '90px' }}
                  required
                  value={editingMovieForm.synopsis}
                  onChange={(e) => setEditingMovieForm({ ...editingMovieForm, synopsis: e.target.value })}
                />
              </div>

              <button 
                type="submit" 
                className="auth-submit-btn" 
                style={{ background: '#3b82f6' }}
                disabled={submittingEdit}
              >
                {submittingEdit ? 'Saving Changes...' : 'Save Changes'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* AUTH MODAL (Login / Register) */}
      {showAuthModal && (
        <div className="modal-overlay" onClick={() => setShowAuthModal(false)}>
          <div className="modal-card auth-modal-card" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close-btn" onClick={() => setShowAuthModal(false)}>
              <X size={18} />
            </button>

            <div className="auth-tabs">
              <button 
                className={`auth-tab ${authMode === 'login' ? 'active' : ''}`}
                onClick={() => { setAuthMode('login'); setAuthError(''); }}
              >
                Sign In
              </button>
              <button 
                className={`auth-tab ${authMode === 'register' ? 'active' : ''}`}
                onClick={() => { setAuthMode('register'); setAuthError(''); }}
              >
                Create Account
              </button>
            </div>

            {authError && <div className="auth-error">{authError}</div>}

            <form className="auth-form" onSubmit={handleAuthSubmit}>
              <div className="form-group">
                <label className="form-label">Username</label>
                <input 
                  type="text" 
                  className="form-input" 
                  required
                  placeholder="Enter your username"
                  value={authForm.username}
                  onChange={(e) => setAuthForm({ ...authForm, username: e.target.value })}
                />
              </div>

              {authMode === 'register' && (
                <div className="form-group">
                  <label className="form-label">Email (Optional)</label>
                  <input 
                    type="email" 
                    className="form-input" 
                    placeholder="name@example.com"
                    value={authForm.email}
                    onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })}
                  />
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Password</label>
                <input 
                  type="password" 
                  className="form-input" 
                  required
                  placeholder="••••••••"
                  value={authForm.password}
                  onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
                />
              </div>

              <button type="submit" className="auth-submit-btn">
                {authMode === 'login' ? 'Sign In to CineMatch' : 'Register Account'}
              </button>

            </form>
          </div>
        </div>
      )}

      {/* AI MOOD MATCHMAKER MODAL */}
      {showAiModal && (
        <div className="modal-overlay" onClick={() => setShowAiModal(false)}>
          <div className="modal-card ai-modal-card" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close-btn" onClick={() => setShowAiModal(false)}>
              <X size={18} />
            </button>

            <div className="ai-modal-header">
              <div className="ai-badge">
                <Sparkles size={14} />
                <span>CineMatch AI Engine</span>
              </div>
              <h2 className="ai-modal-title">What's your mood tonight?</h2>
              <p className="ai-modal-desc">
                Describe the vibe, feeling, or plot craving in your own words. CineMatch AI will analyze your mood and hand-pick the best matching movies.
              </p>
            </div>

            {/* Quick Mood Pills */}
            <div className="ai-quick-tags-section">
              <span className="ai-quick-label">⚡ Quick Mood Vibes:</span>
              <div className="ai-quick-tags">
                {[
                  { label: "🌧️ Dark & Suspenseful", mood: "dark atmospheric thriller suspense mystery" },
                  { label: "💰 Greed & Ancient Mystery", mood: "greed treasure ancient curse dark mythology" },
                  { label: "✨ Whimsical & Dreamy", mood: "whimsical magical emotional anime family fantasy" },
                  { label: "🎭 Intense Crime & Revenge", mood: "intense gritty crime revenge tragedy drama" },
                  { label: "🍿 Mind-Bending Sci-Fi", mood: "mind-bending sci-fi futuristic twists concept" },
                  { label: "😂 Feel-Good & Heartwarming", mood: "feel good funny heartwarming family emotional" }
                ].map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className="ai-quick-tag"
                    onClick={() => handleAiMatch(item.mood)}
                    disabled={aiLoading}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Input Form */}
            <form 
              className="ai-prompt-form" 
              onSubmit={(e) => { e.preventDefault(); handleAiMatch(); }}
            >
              <div className="ai-input-wrapper">
                <textarea
                  className="ai-mood-textarea"
                  rows={3}
                  placeholder="e.g. A slow-burning murder mystery on a rainy night with philosophical depth and surprising twists..."
                  value={aiMoodInput}
                  onChange={(e) => setAiMoodInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleAiMatch();
                    }
                  }}
                  disabled={aiLoading}
                />
              </div>

              {aiError && <div className="ai-error-banner">{aiError}</div>}

              <div className="ai-action-row">
                <button 
                  type="submit" 
                  className="ai-submit-btn" 
                  disabled={aiLoading || !aiMoodInput.trim()}
                >
                  <Sparkles size={16} />
                  <span>{aiLoading ? 'Analyzing Mood...' : 'Match My Mood ✨'}</span>
                </button>
              </div>
            </form>

            {/* Loading Indicator */}
            {aiLoading && (
              <div className="ai-loading-container">
                <div className="ai-spinner"></div>
                <div className="ai-loading-text">
                  <strong>Analyzing cinematic themes, mood tones & catalog...</strong>
                  <span>Matching the best movie to your exact emotional craving</span>
                </div>
              </div>
            )}

            {/* AI Results */}
            {aiResult && !aiLoading && (
              <div className="ai-results-wrapper">
                {/* AI Reasoning card */}
                <div className="ai-reasoning-card">
                  <div className="ai-reasoning-header">
                    <span className="ai-reasoning-title">
                      <Sparkles size={15} />
                      AI Match Analysis
                    </span>
                    <span className="ai-engine-tag">
                      ⚡ Powered by Google Gemini AI
                    </span>
                  </div>
                  <p className="ai-reasoning-text">"{aiResult.explanation}"</p>
                </div>

                {/* Matched Movies Cards */}
                <div className="ai-matches-list">
                  <h3 className="ai-matches-heading">Recommended For You</h3>
                  {aiResult.matches && aiResult.matches.map((movie) => {
                    const isWatchlist = watchlistIds.includes(String(movie.id));
                    const movieGenres = getMovieGenres(movie);
                    return (
                      <div key={movie.id} className="ai-match-card">
                        <img 
                          src={movie.poster_url || SAMPLE_POSTERS[0]} 
                          alt={movie.title} 
                          className="ai-match-poster"
                          onClick={() => {
                            setShowAiModal(false);
                            handleOpenMovie(movie, false);
                          }}
                        />
                        <div className="ai-match-info">
                          <div className="ai-match-title-row">
                            <h4 
                              className="ai-match-title"
                              onClick={() => {
                                setShowAiModal(false);
                                handleOpenMovie(movie, false);
                              }}
                            >
                              {movie.title}
                            </h4>
                            <span className="ai-match-year">({movie.release_year})</span>
                            <div className="ai-match-rating">
                              <Star size={13} fill="#f59e0b" color="#f59e0b" />
                              <span>{movie.global_rating !== undefined ? movie.global_rating : 0.0}</span>
                            </div>
                          </div>

                          <div className="ai-match-genres">
                            {movieGenres.map((g, idx) => (
                              <span key={idx} className="ai-genre-pill">{g}</span>
                            ))}
                          </div>

                          <p className="ai-match-synopsis">{movie.synopsis}</p>

                          <div className="ai-match-actions">
                            {movie.video_url && (
                              <button 
                                className="ai-play-btn"
                                onClick={() => {
                                  setShowAiModal(false);
                                  handleOpenMovie(movie, true);
                                }}
                              >
                                <Play size={13} fill="#fff" />
                                <span>Watch Movie</span>
                              </button>
                            )}
                            <button 
                              className="ai-details-btn"
                              onClick={() => {
                                setShowAiModal(false);
                                handleOpenMovie(movie, false);
                              }}
                            >
                              <Info size={14} />
                              <span>Details & Reviews</span>
                            </button>
                            <button 
                              className={`ai-bookmark-btn ${isWatchlist ? 'active' : ''}`}
                              onClick={(e) => handleToggleWatchlist(e, movie.id)}
                              title={isWatchlist ? "Remove from watchlist" : "Add to watchlist"}
                            >
                              <Bookmark size={15} fill={isWatchlist ? "#e50914" : "none"} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="ai-reset-row">
                  <button 
                    type="button" 
                    className="ai-try-another-btn"
                    onClick={() => {
                      setAiResult(null);
                      setAiMoodInput('');
                    }}
                  >
                    Try Another Mood
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* COMMUNITY MOVIE CONTRIBUTION MODAL */}
      {showContributeModal && (
        <div className="modal-overlay" onClick={() => setShowContributeModal(false)}>
          <div className="modal-card auth-modal-card" style={{ maxWidth: '620px' }} onClick={(e) => e.stopPropagation()}>
            <button className="modal-close-btn" onClick={() => setShowContributeModal(false)}>
              <X size={18} />
            </button>

            <div className="contribute-modal-header">
              <div className="contribute-badge">
                <Trophy size={13} color="#cbd5e1" />
                <span>Community Contribution • Earn +10 Points</span>
              </div>
              <h2 className="contribute-modal-title">Contribute a Film to CineMatch</h2>
              <p className="contribute-modal-desc">
                Know a great movie not yet in our catalog? Submit its details below. Once reviewed and accepted by staff (even if tweaked), you'll earn <strong>+10 community points</strong>!
              </p>
            </div>

            {contributeMsg.text && (
              <div className={`admin-portal-alert ${contributeMsg.type === 'success' ? 'success' : 'error'}`}>
                {contributeMsg.text}
              </div>
            )}

            <form className="auth-form" onSubmit={handleContributeSubmit}>
              <div className="form-group">
                <label className="form-label">Movie Title *</label>
                <input 
                  type="text" 
                  className="form-input" 
                  required
                  placeholder="e.g. Inception, Tumbbad, Interstellar"
                  value={contributeForm.title}
                  onChange={(e) => setContributeForm({ ...contributeForm, title: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Release Year *</label>
                <input 
                  type="number" 
                  className="form-input" 
                  required
                  min="1900"
                  max="2030"
                  value={contributeForm.release_year}
                  onChange={(e) => setContributeForm({ ...contributeForm, release_year: parseInt(e.target.value) || 2024 })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Genres (Select multiple)</label>
                <div className="genre-selector-chips">
                  {GENRES.filter(g => g !== 'All').map(g => (
                    <button
                      key={g}
                      type="button"
                      className={`genre-chip ${contributeForm.genres?.includes(g) ? 'selected' : ''}`}
                      onClick={() => toggleContributeGenre(g)}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Poster Image URL (Optional)</label>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                  <input 
                    type="url" 
                    className="form-input" 
                    style={{ flex: 1 }}
                    placeholder="https://example.com/poster.jpg"
                    value={contributeForm.poster_url}
                    onChange={(e) => setContributeForm({ ...contributeForm, poster_url: e.target.value })}
                  />
                  {contributeForm.poster_url && (
                    <img 
                      src={contributeForm.poster_url} 
                      alt="Preview" 
                      className="poster-preview-box" 
                      onError={(e) => e.target.style.display = 'none'}
                    />
                  )}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Play size={13} fill="currentColor" color="var(--accent-red)" />
                  YouTube Movie / Trailer Link (Optional)
                </label>
                <input 
                  type="url" 
                  className="form-input" 
                  placeholder="https://www.youtube.com/watch?v=..."
                  value={contributeForm.video_url}
                  onChange={(e) => setContributeForm({ ...contributeForm, video_url: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Synopsis / Storyline *</label>
                <textarea
                  className="review-textarea"
                  style={{ minHeight: '90px' }}
                  required
                  placeholder="Tell what the movie is about..."
                  value={contributeForm.synopsis}
                  onChange={(e) => setContributeForm({ ...contributeForm, synopsis: e.target.value })}
                />
              </div>

              <button 
                type="submit" 
                className="auth-submit-btn" 
                disabled={submittingContribute}
                style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}
              >
                {submittingContribute ? 'Submitting to Staff...' : 'Submit Film for Review (+10 Pts)'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* DJANGO ADMIN PORTAL MODAL */}
      {showAdminPortal && (
        <div className="modal-overlay" onClick={() => setShowAdminPortal(false)}>
          <div className="modal-card admin-portal-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close-btn" onClick={() => setShowAdminPortal(false)}>
              <X size={18} />
            </button>

            {/* Header */}
            <div className="admin-portal-header">
              <div className="admin-portal-badge">
                <Shield size={14} />
                <span>CINEMATCH STUDIO & OPERATIONS</span>
              </div>
              <h2 className="admin-portal-title">Platform Control Center</h2>
              <p className="admin-portal-subtitle">
                Manage member accounts, curate community film submissions, and moderate platform reviews.
              </p>
            </div>

            {/* Alert Messages */}
            {adminPortalError && (
              <div className="admin-portal-alert error">{adminPortalError}</div>
            )}
            {adminSuccessMsg && (
              <div className="admin-portal-alert success">{adminSuccessMsg}</div>
            )}

            {/* Metrics Strip */}
            <div className="admin-stats-grid">
              <div className="admin-stat-card">
                <div className="admin-stat-icon users"><Users size={20} /></div>
                <div className="admin-stat-info">
                  <span className="admin-stat-number">{adminStats.total_users}</span>
                  <span className="admin-stat-label">Registered Members</span>
                </div>
              </div>
              <div className="admin-stat-card">
                <div className="admin-stat-icon movies"><Film size={20} /></div>
                <div className="admin-stat-info">
                  <span className="admin-stat-number">{adminStats.total_movies}</span>
                  <span className="admin-stat-label">Catalog Titles</span>
                </div>
              </div>
              <div className="admin-stat-card">
                <div className="admin-stat-icon reviews"><MessageSquare size={20} /></div>
                <div className="admin-stat-info">
                  <span className="admin-stat-number">{adminStats.total_reviews}</span>
                  <span className="admin-stat-label">Community Reviews</span>
                </div>
              </div>
              <div className="admin-stat-card">
                <div className="admin-stat-icon rating"><Star size={20} /></div>
                <div className="admin-stat-info">
                  <span className="admin-stat-number">{adminStats.avg_rating > 0 ? adminStats.avg_rating : '4.8'}</span>
                  <span className="admin-stat-label">Platform Score</span>
                </div>
              </div>
              <div className="admin-stat-card">
                <div className="admin-stat-icon points"><Trophy size={20} /></div>
                <div className="admin-stat-info">
                  <span className="admin-stat-number">{adminStats.total_community_points || 0}</span>
                  <span className="admin-stat-label">Reputation Points</span>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="admin-tabs-nav">
              <button 
                className={`admin-tab-btn ${adminPortalTab === 'users' ? 'active' : ''}`}
                onClick={() => { setAdminPortalTab('users'); setAdminPortalError(''); setAdminSuccessMsg(''); setEditingSubmission(null); }}
              >
                <Users size={16} />
                <span>Member Accounts</span>
                <span className="admin-tab-count">{adminUsers.length}</span>
              </button>
              <button 
                className={`admin-tab-btn ${adminPortalTab === 'reviews' ? 'active' : ''}`}
                onClick={() => { setAdminPortalTab('reviews'); setAdminPortalError(''); setAdminSuccessMsg(''); setEditingSubmission(null); }}
              >
                <MessageSquare size={16} />
                <span>Review Moderation</span>
                <span className="admin-tab-count">{adminReviews.length}</span>
              </button>
              <button 
                className={`admin-tab-btn ${adminPortalTab === 'submissions' ? 'active' : ''}`}
                onClick={() => { setAdminPortalTab('submissions'); setAdminPortalError(''); setAdminSuccessMsg(''); setEditingSubmission(null); }}
              >
                <UploadCloud size={16} />
                <span>Film Submissions</span>
                <span className={`admin-tab-count ${adminSubmissions.filter(s => s.status === 'pending').length > 0 ? 'highlight' : ''}`}>
                  {adminSubmissions.filter(s => s.status === 'pending').length}
                </span>
              </button>
            </div>

            {/* Content: Users Tab */}
            {adminLoading ? (
              <div className="admin-loading-state">
                <div className="ai-spinner"></div>
                <span>Synchronizing platform records...</span>
              </div>
            ) : adminPortalTab === 'users' ? (
              <div className="admin-users-list">
                {adminUsers.length === 0 ? (
                  <div className="admin-empty-state">No registered users found.</div>
                ) : (
                  adminUsers.map(u => {
                    const isSelf = currentUser && currentUser.username.toLowerCase() === u.username.toLowerCase();
                    return (
                      <div key={u.id} className="admin-user-row">
                        <div className="admin-user-avatar">
                          <User size={18} />
                        </div>
                        <div className="admin-user-details">
                          <div className="admin-user-name-line">
                            <span className="admin-user-username">{u.username}</span>
                            {u.is_staff ? (
                              <span className="admin-role-badge staff">👑 Admin</span>
                            ) : (
                              <span className="admin-role-badge member">👤 Member</span>
                            )}
                            {!u.is_staff && (
                              <span className="admin-points-pill" title="Community Points">
                                <Trophy size={11} color="#cbd5e1" /> {u.points || 0} pts
                              </span>
                            )}
                            {isSelf && <span className="admin-role-badge self">You</span>}
                          </div>
                          <div className="admin-user-subline">
                            {u.email && <span className="admin-user-email">{u.email} • </span>}
                            <span>Joined: {u.created_at} • </span>
                            <span>{u.reviews_count} reviews • </span>
                            <span>{u.watchlist_count} in watchlist</span>
                          </div>
                        </div>
                        <div className="admin-user-actions">
                          {!isSelf && (
                            <>
                              <button
                                className={`admin-action-btn ${u.is_staff ? 'demote' : 'promote'}`}
                                onClick={() => handleToggleUserRole(u)}
                                disabled={adminActionLoading}
                                title={u.is_staff ? "Demote to Member" : "Promote to Admin"}
                              >
                                {u.is_staff ? 'Demote' : 'Make Admin'}
                              </button>
                              <button
                                className="admin-action-btn delete"
                                onClick={() => handleDeleteUser(u)}
                                disabled={adminActionLoading}
                                title="Delete user account"
                              >
                                <Trash2 size={14} />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            ) : adminPortalTab === 'reviews' ? (
              /* Content: Reviews Moderation Tab */
              <div className="admin-reviews-list">
                {adminReviews.length === 0 ? (
                  <div className="admin-empty-state">No reviews to moderate.</div>
                ) : (
                  adminReviews.map(r => (
                    <div key={r.id} className="admin-review-row">
                      <div className="admin-review-info">
                        <div className="admin-review-top">
                          <span className="admin-review-movie">{r.movie_title || 'Movie'}</span>
                          <span className="admin-review-by">by <strong>{r.username}</strong></span>
                          <div className="admin-review-rating">
                            <Star size={13} fill="#f59e0b" color="#f59e0b" />
                            <span>{r.rating}/5</span>
                          </div>
                          <span className="admin-review-date">{r.created_at}</span>
                        </div>
                        <p className="admin-review-comment">"{r.comment}"</p>
                      </div>
                      <button
                        className="admin-action-btn delete"
                        onClick={() => handleAdminDeleteReview(r.id)}
                        title="Delete review"
                      >
                        <Trash2 size={14} />
                        <span>Delete</span>
                      </button>
                    </div>
                  ))
                )}
              </div>
            ) : (
              /* Content: Movie Submissions Tab */
              <div className="admin-submissions-list">
                {adminSubmissions.length === 0 ? (
                  <div className="admin-empty-state">No movie submissions received yet.</div>
                ) : (
                  adminSubmissions.map(s => {
                    const isEditingThis = editingSubmission?.id === s.id;
                    return (
                      <div key={s.id} className={`admin-submission-card ${s.status}`}>
                        {isEditingThis ? (
                          <div className="admin-submission-edit-form">
                            <h4 style={{ margin: '0 0 0.75rem 0', color: '#60a5fa', fontSize: '1rem' }}>
                              Tweak & Accept Movie (+10 pts to {s.submitted_by})
                            </h4>
                            <div className="admin-sub-edit-grid">
                              <div className="form-group">
                                <label className="form-label">Title</label>
                                <input
                                  type="text"
                                  className="form-input"
                                  value={editingSubmission.title}
                                  onChange={(e) => setEditingSubmission({ ...editingSubmission, title: e.target.value })}
                                />
                              </div>
                              <div className="form-group">
                                <label className="form-label">Release Year</label>
                                <input
                                  type="number"
                                  className="form-input"
                                  value={editingSubmission.release_year}
                                  onChange={(e) => setEditingSubmission({ ...editingSubmission, release_year: parseInt(e.target.value) || 2024 })}
                                />
                              </div>
                            </div>
                            <div className="form-group">
                              <label className="form-label">Poster URL</label>
                              <input
                                type="url"
                                className="form-input"
                                value={editingSubmission.poster_url || ''}
                                onChange={(e) => setEditingSubmission({ ...editingSubmission, poster_url: e.target.value })}
                              />
                            </div>
                            <div className="form-group">
                              <label className="form-label">YouTube Video URL</label>
                              <input
                                type="url"
                                className="form-input"
                                value={editingSubmission.video_url || ''}
                                onChange={(e) => setEditingSubmission({ ...editingSubmission, video_url: e.target.value })}
                              />
                            </div>
                            <div className="form-group">
                              <label className="form-label">Synopsis</label>
                              <textarea
                                className="review-textarea"
                                style={{ minHeight: '80px' }}
                                value={editingSubmission.synopsis}
                                onChange={(e) => setEditingSubmission({ ...editingSubmission, synopsis: e.target.value })}
                              />
                            </div>
                            <div style={{ display: 'flex', gap: '0.6rem', marginTop: '0.75rem' }}>
                              <button
                                type="button"
                                className="admin-action-btn accept"
                                onClick={() => handleAcceptSubmission(s, editingSubmission)}
                                disabled={adminActionLoading}
                              >
                                <Check size={14} /> Save & Accept (+10 Pts)
                              </button>
                              <button
                                type="button"
                                className="admin-action-btn"
                                onClick={() => setEditingSubmission(null)}
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="admin-submission-view">
                            <div className="admin-sub-poster-col">
                              <img
                                src={s.poster_url || SAMPLE_POSTERS[0]}
                                alt={s.title}
                                className="admin-sub-poster"
                                onError={(e) => e.target.src = SAMPLE_POSTERS[0]}
                              />
                            </div>
                            <div className="admin-sub-content-col">
                              <div className="admin-sub-top-bar">
                                <div className="admin-sub-title-row">
                                  <h3 className="admin-sub-title">{s.title} <span className="admin-sub-year">({s.release_year})</span></h3>
                                  <span className={`admin-sub-status-badge ${s.status}`}>
                                    {s.status === 'pending' ? '⏳ Pending Review' : s.status === 'approved' ? '✓ Approved' : '✕ Rejected'}
                                  </span>
                                </div>
                                <div className="admin-sub-meta">
                                  <span>Submitted by <strong>@{s.submitted_by}</strong> on {s.created_at}</span>
                                </div>
                              </div>

                              <div className="admin-sub-genre-chips">
                                {Array.isArray(s.genres) && s.genres.map(g => (
                                  <span key={g} className="modal-genre-tag" style={{ fontSize: '0.75rem', padding: '0.15rem 0.45rem' }}>{g}</span>
                                ))}
                              </div>

                              <p className="admin-sub-synopsis">{s.synopsis}</p>

                              {s.video_url && (
                                <div className="admin-sub-video-link">
                                  <Play size={12} fill="currentColor" color="var(--accent-red)" />
                                  <a href={s.video_url} target="_blank" rel="noopener noreferrer">
                                    {s.video_url}
                                  </a>
                                </div>
                              )}

                              {s.status === 'pending' && (
                                <div className="admin-sub-actions-row">
                                  <button
                                    type="button"
                                    className="admin-action-btn accept"
                                    onClick={() => handleAcceptSubmission(s)}
                                    disabled={adminActionLoading}
                                    title="Accept movie and award +10 points to contributor"
                                  >
                                    <Check size={14} /> Accept & Publish (+10 Pts)
                                  </button>
                                  <button
                                    type="button"
                                    className="admin-action-btn edit-sub"
                                    onClick={() => setEditingSubmission({ ...s })}
                                    disabled={adminActionLoading}
                                    title="Edit details before publishing"
                                  >
                                    <Pencil size={13} /> Edit & Accept
                                  </button>
                                  <button
                                    type="button"
                                    className="admin-action-btn delete"
                                    onClick={() => handleRejectSubmission(s.id)}
                                    disabled={adminActionLoading}
                                    title="Reject submission"
                                  >
                                    <X size={14} /> Reject
                                  </button>
                                </div>
                              )}

                              {s.status === 'approved' && (
                                <div className="admin-sub-result approved">
                                  <Check size={14} /> Published to live catalog • +10 points awarded to @{s.submitted_by}
                                </div>
                              )}
                              {s.status === 'rejected' && (
                                <div className="admin-sub-result rejected">
                                  <X size={14} /> Submission rejected
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* COMMUNITY LEADERBOARD MODAL */}
      {showLeaderboardModal && (
        <div className="modal-overlay" onClick={() => setShowLeaderboardModal(false)}>
          <div className="modal-card leaderboard-modal" onClick={(e) => e.stopPropagation()}>
            <button
              className="modal-close-btn"
              onClick={() => setShowLeaderboardModal(false)}
              aria-label="Close"
            >
              <X size={18} />
            </button>

            <div className="leaderboard-header">
              <div className="leaderboard-badge">
                <Award size={14} />
                <span>Community Hall of Fame</span>
              </div>
              <h2 className="leaderboard-title">Top Cinephile Contributors</h2>
              <p className="leaderboard-desc">
                Recognizing members who share insightful film reviews and expand the CineMatch cinema catalog.
              </p>
            </div>

            {loadingLeaderboard ? (
              <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-dim)' }}>
                <p>Loading community rankings...</p>
              </div>
            ) : leaderboardData.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-dim)' }}>
                <Trophy size={40} style={{ opacity: 0.3, marginBottom: '0.75rem' }} />
                <p>No community contributors yet. Be the first to review or submit a movie!</p>
              </div>
            ) : (
              <>
                {/* Top 3 Podium (shown if at least 2 contributors exist) */}
                {leaderboardData.length >= 2 && (
                  <div className="leaderboard-podium">
                    {/* Rank 2 - Silver */}
                    <div className="podium-card second">
                      <div className="podium-medal">🥈</div>
                      <div className="podium-username" title={leaderboardData[1].username}>
                        @{leaderboardData[1].username}
                      </div>
                      <div className="podium-points">
                        <Trophy size={11} /> {leaderboardData[1].points} pts
                      </div>
                      <div className="podium-meta">
                        <span>{leaderboardData[1].reviews_count} reviews</span>
                        {leaderboardData[1].contributions_count > 0 && (
                          <span>• {leaderboardData[1].contributions_count} films</span>
                        )}
                      </div>
                    </div>

                    {/* Rank 1 - Gold */}
                    <div className="podium-card first">
                      <div className="podium-medal">🥇</div>
                      <div className="podium-username" title={leaderboardData[0].username}>
                        @{leaderboardData[0].username}
                      </div>
                      <div className="podium-points">
                        <Trophy size={12} /> {leaderboardData[0].points} pts
                      </div>
                      <div className="podium-meta">
                        <span>{leaderboardData[0].reviews_count} reviews</span>
                        {leaderboardData[0].contributions_count > 0 && (
                          <span>• {leaderboardData[0].contributions_count} films</span>
                        )}
                      </div>
                    </div>

                    {/* Rank 3 - Bronze */}
                    {leaderboardData[2] ? (
                      <div className="podium-card third">
                        <div className="podium-medal">🥉</div>
                        <div className="podium-username" title={leaderboardData[2].username}>
                          @{leaderboardData[2].username}
                        </div>
                        <div className="podium-points">
                          <Trophy size={11} /> {leaderboardData[2].points} pts
                        </div>
                        <div className="podium-meta">
                          <span>{leaderboardData[2].reviews_count} reviews</span>
                          {leaderboardData[2].contributions_count > 0 && (
                            <span>• {leaderboardData[2].contributions_count} films</span>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="podium-card third" style={{ opacity: 0.35 }}>
                        <div className="podium-medal">🥉</div>
                        <div className="podium-username">Open</div>
                        <div className="podium-points">0 pts</div>
                      </div>
                    )}
                  </div>
                )}

                {/* Full Contributor Rankings List */}
                <div className="leaderboard-list">
                  {leaderboardData.map((u) => {
                    const isMe = currentUser && currentUser.username.toLowerCase() === u.username.toLowerCase();
                    const rankClass = u.rank === 1 ? 'top-1' : u.rank === 2 ? 'top-2' : u.rank === 3 ? 'top-3' : '';
                    return (
                      <div
                        key={u.username}
                        className={`leaderboard-row ${isMe ? 'me' : ''}`}
                      >
                        <div className={`lb-rank ${rankClass}`}>
                          {u.rank === 1 ? '🥇' : u.rank === 2 ? '🥈' : u.rank === 3 ? '🥉' : `#${u.rank}`}
                        </div>
                        <div className="lb-avatar">
                          {u.username ? u.username.charAt(0).toUpperCase() : '?'}
                        </div>
                        <div className="lb-user-info">
                          <div className="lb-username-row">
                            <span className="lb-username">
                              {u.username} {isMe && '(You)'}
                            </span>
                            <span className="lb-badge">{u.badge}</span>
                          </div>
                          <div className="lb-stats">
                            {u.reviews_count} {u.reviews_count === 1 ? 'review' : 'reviews'}
                            {u.contributions_count > 0 && ` • ${u.contributions_count} ${u.contributions_count === 1 ? 'film added' : 'films added'}`}
                          </div>
                        </div>
                        <div className="lb-points-pill">
                          <Trophy size={12} />
                          <span>{u.points} pts</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Current User Standing Footer Strip */}
                {currentUser && !currentUser.is_staff && (
                  <div className="leaderboard-my-strip">
                    <span>
                      Your Standing: <strong>{myStanding ? `Rank #${myStanding.rank} • ${myStanding.badge}` : 'Unranked (Write reviews to earn points!)'}</strong>
                    </span>
                    <span>
                      <strong>{currentUser.points ?? 0}</strong> points earned
                    </span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* FULLSCREEN CINEMA THEATER MODAL (OPTION 1) */}
      {theaterMovie && getYouTubeEmbedUrl(theaterMovie.video_url) && (
        <div className="theater-overlay" onClick={() => setTheaterMovie(null)}>
          <div className="theater-container" onClick={(e) => e.stopPropagation()}>
            {/* Ambient Poster Glow */}
            <div 
              className="theater-ambient-glow"
              style={{ backgroundImage: `url(${theaterMovie.poster_url || SAMPLE_POSTERS[0]})` }}
            />

            {/* Theater Top Navigation Bar */}
            <div className="theater-header">
              <div className="theater-movie-info">
                <h2 className="theater-title">{theaterMovie.title}</h2>
                <span className="theater-year">({theaterMovie.release_year})</span>
                {theaterMovie.global_rating > 0 && (
                  <div className="theater-rating">
                    <Star size={13} fill="#f59e0b" color="#f59e0b" />
                    <span>{Number(theaterMovie.global_rating).toFixed(1)}</span>
                  </div>
                )}
              </div>

              <div className="theater-actions">
                <button 
                  className={`theater-action-btn ${watchlistIds.includes(String(theaterMovie.id)) ? 'active' : ''}`}
                  onClick={(e) => handleToggleWatchlist(e, String(theaterMovie.id))}
                  title={watchlistIds.includes(String(theaterMovie.id)) ? "In your watchlist" : "Add to watchlist"}
                >
                  <Bookmark size={15} fill={watchlistIds.includes(String(theaterMovie.id)) ? "currentColor" : "none"} />
                  <span>{watchlistIds.includes(String(theaterMovie.id)) ? 'Bookmarked' : 'Watchlist'}</span>
                </button>

                <button 
                  className="theater-action-btn"
                  onClick={() => {
                    handleOpenMovie(theaterMovie, false);
                  }}
                  title="View Reviews & Film Details"
                >
                  <Info size={15} />
                  <span>Details & Reviews</span>
                </button>

                <button 
                  className="theater-close-btn"
                  onClick={() => setTheaterMovie(null)}
                  title="Exit Theater Mode (Esc)"
                >
                  <X size={18} />
                  <span>Exit Theater</span>
                </button>
              </div>
            </div>

            {/* 16:9 Cinema Screen Wrapper */}
            <div className="theater-screen-wrapper">
              <iframe
                src={getYouTubeEmbedUrl(theaterMovie.video_url)}
                title={`${theaterMovie.title} Cinema Stream`}
                className="theater-iframe"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
                allowFullScreen
              />
            </div>

            {/* Bottom Info Bar */}
            {theaterMovie.synopsis && (
              <div className="theater-bottom-bar">
                <p className="theater-synopsis">{theaterMovie.synopsis}</p>
                <span className="theater-esc-hint">Press <strong>ESC</strong> to exit theater mode</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* FOOTER */}
      <footer className="footer">
        <p>© {new Date().getFullYear()} CineMatch. Discover, stream & curate movies.</p>
      </footer>
    </div>
  );
}
