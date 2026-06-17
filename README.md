# Onboarding Diary

A full-stack application for new recruits to document their onboarding journey — daily diary entries (with moods and tags) and milestones — backed by a Spring Boot REST API and a React frontend.

## Tech Stack

- **Backend:** Spring Boot 3.2, Spring Web, Spring Data JPA, Bean Validation
- **Database:** H2 (in-memory)
- **Build:** Maven, Java 17
- **Frontend:** React 18 (Create React App), React Router, Axios

## Project Structure

```
onboarding-diary/
├── backend/    # Spring Boot REST API (Maven)
└── frontend/   # React single-page app
```

## Running the Backend

```bash
cd backend
mvn spring-boot:run
```

The API starts on `http://localhost:8080`. On startup the in-memory H2 database is
seeded with sample recruits, tags, diary entries, and milestones (see
`backend/src/main/resources/data.sql`).

### H2 Console

Available at `http://localhost:8080/h2-console`.

- JDBC URL: `jdbc:h2:mem:onboardingdb`
- User: `sa`
- Password: _(empty)_

## Running the Frontend

```bash
cd frontend
npm install
npm start
```

The app runs on `http://localhost:3000` and talks to the backend at
`http://localhost:8080/api`. CORS is configured on the backend to allow the
frontend origin.

## API Endpoints

### Recruits — `/api/recruits`
| Method | Path                  | Description          |
| ------ | --------------------- | -------------------- |
| POST   | `/api/recruits`       | Create a recruit     |
| GET    | `/api/recruits`       | List all recruits    |
| GET    | `/api/recruits/{id}`  | Get a recruit by ID  |

### Diary Entries — `/api`
| Method | Path                                   | Description                          |
| ------ | -------------------------------------- | ------------------------------------ |
| POST   | `/api/recruits/{recruitId}/entries`    | Create an entry (with tag names)     |
| GET    | `/api/recruits/{recruitId}/entries`    | List a recruit's entries (newest first) |
| GET    | `/api/entries/{id}`                    | Get a single entry                   |
| PUT    | `/api/entries/{id}`                    | Update an entry                      |
| DELETE | `/api/entries/{id}`                    | Delete an entry                      |

### Milestones — `/api`
| Method | Path                                     | Description                  |
| ------ | ---------------------------------------- | ---------------------------- |
| POST   | `/api/recruits/{recruitId}/milestones`   | Create a milestone           |
| GET    | `/api/recruits/{recruitId}/milestones`   | List a recruit's milestones  |

### Tags — `/api/tags`
| Method | Path         | Description      |
| ------ | ------------ | ---------------- |
| GET    | `/api/tags`  | List all tags    |

### Diary entry request body

`POST`/`PUT` for diary entries accept the entry fields plus a list of tag names;
tags are resolved or created automatically:

```json
{
  "title": "First day!",
  "content": "Met the team and set up my laptop.",
  "mood": "excited",
  "entryDate": "2024-01-15",
  "tags": ["culture", "training"]
}
```
