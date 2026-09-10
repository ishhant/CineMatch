# Database & UI Design Specs - CineMatch

## 1. Database Schema Design (SQLite)
The application handles relational storage using four main interconnected structural entities [0.1.4]:

### User Model (Django Built-in)
*   `id` (PK)
*   `username` (String)
*   `password` (Hash)
*   `email` (String)

### Movie Model
*   `id` (PK)
*   `title` (String)
*   `synopsis` (Text)
*   `genre` (ForeignKey -> Genre)
*   `release_year` (Integer)
*   `global_rating` (Float)

### Review Model
*   `id` (PK)
*   `user` (ForeignKey -> User)
*   `movie` (ForeignKey -> Movie)
*   `rating` (Integer, 1-5 scale)
*   `comment` (Text)
*   `created_at` (Timestamp)

### Watchlist Model
*   `id` (PK)
*   `user` (ForeignKey -> User)
*   `movie` (ForeignKey -> Movie)
*   `added_at` (Timestamp)

## 2. UI Layout Blueprint
*   **Navigation Bar:** Platform branding (`CineMatch`), Search Input Bar (AJAX powered), Watchlist Link, User Profile/Auth State.
*   **Main Workspace:** Grid listing available movies with inline genre badges, thumbnail mockups, and quick "Add to Watchlist" toggles.
*   **Movie Focus View:** Detailed block displaying full synopses alongside a separate review thread list and review submission cards.