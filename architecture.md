# System Architecture - CineMatch

## 1. MVT Design Pattern
The project strictly implements the standard **Django Model-View-Template (MVT)** architectural paradigm:
*   **Model:** Manages the data schema, relational mappings, and interfaces with the database through Django ORM.
*   **View:** Processes business logic, executes database queries, renders template contexts, and handles AJAX endpoints.
*   **Template:** Dynamic HTML presentation layer styled with modern CSS variables and manipulated via client-side JavaScript.

## 2. Component Layout
```
[ Client Browser ] 
        │ 
        ▼ (HTTP / AJAX Request)
[ Django Web Server ]
        │
        ├──► [ View / URL Dispatcher ]
        │          │
        │          ├──► [ Forms/Validations ]
        │          │
        │          └──► [ Django ORM ] ──► [ SQLite Database ]
        │
        ▼ (Rendered Context / JSON Response)
[ UI Template Layer ]
```

## 3. Technology Stack & Packages
*   **Backend Framework:** Django (Python) [0.1.4]
*   **Database:** SQLite [0.1.4]
*   **Frontend Interactivity:** Native JavaScript + AJAX [0.1.4]
*   **Styling:** HTML5 + Custom CSS Variables [0.1.4]