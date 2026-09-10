# Development Rules & Coding Standards - CineMatch

## 1. Security Constraints
*   **Route Protection:** Use the `@login_required` decorator on all views modifying user-specific data (e.g., watchlists, review submissions) [0.1.4].
*   **Input Sanitization:** Process all incoming data forms exclusively using Django `Forms` or `ModelForms` to protect against cross-site scripting (XSS) and SQL injection [0.1.4].
*   **Authentication:** Rely entirely on Django’s native user authentication backend system [0.1.3].

## 2. Coding Practices
*   **No Raw SQL:** All operations must interact via the Django ORM syntax to keep queries clean and clean cross-reference mappings [0.1.4].
*   **DRY Principle:** Keep logic encapsulated within appropriate files (models, utils, templates) to minimize redundant block copies.
*   **AJAX Integrity:** Endpoints returning async items must consistently output valid JSON fragments with proper status codes.