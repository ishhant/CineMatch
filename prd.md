# Product Requirements Document (PRD) - CineMatch

## 1. Project Overview
**CineMatch** is a lightweight, dynamic movie recommendation website and watchlist dashboard designed to solve "choice fatigue" for film enthusiasts. The platform provides a seamless, uncluttered space for users to browse movies, manage isolated personal watchlists, and share feedback with a community loop.

## 2. Core Features & Objectives
*   **Dynamic Content Discovery:** Guest and authenticated users can look up and view movie details, synopses, genres, and metadata logs.
*   **Granular Multi-Tier Filtering:** Users can filter content cleanly by designated genres, rating thresholds, and customized criteria.
*   **Secure Session Management:** Native authentication workflows supporting registration, login, logout, and separated workspaces.
*   **Personal Watchlist Tracking:** Persistent CRUD operations allowing users to add or remove films from their private watchlists.
*   **Community Feedback Loop:** Users can submit numerical ratings and text-based reviews, which dynamically update global averages.
*   **Asynchronous AJAX Search:** A fast search feature that updates the DOM instantly without requiring a full-page reload.
*   **Admin Console Monitoring:** Full administrative panel to manage movies, genres, users, and moderate reviews.
*   **Analytical Reporting:** Dedicated structures for exporting structured summaries profiling platform engagement data.

## 3. Scope & Exclusions
*   **In-Scope:** MVT web app, local SQLite storage, native Javascript AJAX, full CRUD for watchlists.
*   **Out-of-Scope (Phase 1):** Third-party OAuth (Google/Facebook login), live video streaming, cross-platform mobile apps.