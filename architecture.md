# System Architecture - CineMatch

## 1. Architectural Pattern: Decoupled Full-Stack (SPA + REST API)
The project implements a modern decoupled architecture:
*   **Frontend (React SPA):** High-performance Single Page Application powered by Vite and Lucide React icons, running on port 5173. Provides instant search, real-time filtering, watchlist management, and an Admin Movie Management Portal.
*   **Backend (Django REST Framework / API):** Robust Python server running on port 8000 handling URL routing, authentication sessions, CORS negotiation, and business logic.
*   **Database Layer (MongoDB Atlas NoSQL):** Cloud NoSQL document storage connected via PyMongo for scalable storage of movies, reviews, and watchlists.

## 2. Component Layout
```
[ User Browser (Client) ] 
        │ 
        ▼
[ React SPA Frontend (Vite) ]
        │
        ▼ (HTTP REST JSON API / CORS)
[ Django Web Server ]
        │
        ├──► [ URL Dispatcher & Views ]
        │          │
        │          ├──► [ Session & User Auth ] ──► [ Django Auth / Sessions ]
        │          │
        │          └──► [ PyMongo Driver ] ───────► [ MongoDB Atlas (Cloud) ]
        │                                                ├── movies collection
        │                                                ├── reviews collection
        │                                                └── watchlists collection
```

## 3. Technology Stack & Packages
*   **Frontend Framework:** React 18+ (Vite)
*   **Icons & UI:** Lucide React + Modern Dark Cinema CSS
*   **Backend Framework:** Django 6.x (Python 3.14)
*   **API Protocol:** REST (JSON) with `django-cors-headers`
*   **Database:** MongoDB Atlas (Cloud NoSQL) via `pymongo` & `dnspython`