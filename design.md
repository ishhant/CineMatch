# Database & UI Design Specs - CineMatch

## 1. NoSQL Database Schema Design (MongoDB Atlas)
The application handles document storage using three core collections in MongoDB, alongside Django User authentication:

### `movies` Collection
*   `_id`: ObjectId (Primary Identifier)
*   `title`: String (e.g., "Inception")
*   `genre`: String (e.g., "Sci-Fi", "Action", "Drama")
*   `release_year`: Integer (e.g., 2010)
*   `global_rating`: Double / Float (e.g., 4.8)
*   `synopsis`: String (Full plot description)
*   `poster_url`: String (Direct image URL)
*   `created_at`: String (Timestamp)

### `reviews` Collection
*   `_id`: ObjectId (Primary Identifier)
*   `movie_id`: String (Reference to movie `_id`)
*   `username`: String (Author name)
*   `rating`: Integer (1-5 scale)
*   `comment`: String (Feedback text)
*   `created_at`: String (Timestamp)

### `watchlists` Collection
*   `_id`: ObjectId (Primary Identifier)
*   `username`: String (User identifier)
*   `movie_id`: String (Reference to movie `_id`)
*   `added_at`: String (Timestamp)

---

## 2. UI Layout Blueprint (React)
*   **Navigation Bar:** Platform branding (`CineMatch`), real-time search input bar, live database status badge (`MongoDB Live`), Watchlist button with dynamic counter, Admin Portal button (`+ Add Movie`), and Authentication modal toggle.
*   **Hero Premiere Spotlight:** Prominent billboard for featured films with rating, plot overview, and quick watchlist toggle.
*   **Filter Bar:** Interactive genre pill buttons (`Action`, `Sci-Fi`, `Drama`, etc.) and rating threshold dropdown (`4.5+ Stars`).
*   **Main Movie Grid:** Responsive cinema cards displaying high-res posters, genre/year tags, star ratings, and one-click heart bookmark buttons. (Admin users also see a quick Delete button).
*   **Movie Modal & Community Reviews:** High-res preview with plot synopsis, review list, and interactive 1–5 star rating submission form.
*   **Admin Movie Portal:** Modal allowing staff members to input title, genre, year, rating, poster URL (with live preview thumbnail), and synopsis, instantly writing to MongoDB Atlas.