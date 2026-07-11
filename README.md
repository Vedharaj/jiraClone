# Jira Clone Project Documentation

This repository is a split-stack Jira-style project management app with a Next.js client and a Spring Boot + MongoDB backend.

## Overview

The project is organized into two main parts:

- `client/` - Next.js 16 app router frontend for boards, backlog, projects, team, login, and profile screens.
- `server/` - Spring Boot REST API that stores users, projects, issues, and sprints in MongoDB.

The client handles most of the user experience directly in the browser. It keeps the signed-in user and selected project in `localStorage`, guards protected routes, and talks to the backend through a shared Axios instance. The backend exposes CRUD endpoints for the main domain objects and uses BCrypt for password hashing.

## Product Summary

The app behaves like a simplified Jira clone with these core workflows:

- Sign up or log in.
- Create a first project during onboarding or from the main workspace.
- Select a project and view its kanban board.
- Drag issues between `TODO`, `IN_PROGRESS`, and `DONE`.
- Open issue details, view assignee data, and add comments.
- Browse the backlog and create issues directly from that screen.
- Manage project members from the Team page.
- View profile details for the current user.

## Architecture

### Frontend

The frontend uses the App Router and a global layout that wraps the application in two providers:

- `AuthProvider` stores the authenticated user and selected project.
- `ClientLayout` decides whether to show the sidebar chrome or a public page such as login/setup.

Most screens are client components because they depend on browser-only state such as `localStorage`, `useRouter`, `usePathname`, and drag-and-drop interactions.

### Backend

The backend is a Spring Boot application backed by MongoDB. It exposes REST endpoints for:

- Users: signup, login, fetch by id, update profile.
- Projects: create, list, fetch by id with owner/members, update, delete.
- Issues: create, list by project, fetch by id, update, delete.
- Sprints: create, list by project, start, complete, update, delete.
- Health: MongoDB connectivity check.

## Tech Stack

### Client

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS 4
- shadcn/ui primitives built on Radix UI
- `@dnd-kit` for kanban drag and drop
- Axios for API calls
- Lucide icons

### Server

- Spring Boot 4
- Spring Web MVC
- Spring Data MongoDB
- Spring Security crypto for password hashing
- Java 17

## Setup And Configuration

### Client environment

The client reads the backend URL from `API_BASE_URL`. If it is not set, the app falls back to `http://localhost:8080`.

Recommended client commands:

```bash
cd client
npm install
npm run dev
```

### Server environment

The server expects a MongoDB connection string in `spring.data.mongodb.uri`. The checked-in `application.properties` currently contains a placeholder value, so the project needs a real MongoDB URI before the backend can connect successfully.

Recommended server commands:

```bash
cd server
./mvnw spring-boot:run
```

On Windows, use `mvnw.cmd spring-boot:run` instead.

### Typical local setup

1. Start MongoDB locally or use a hosted MongoDB instance.
2. Set the backend Mongo URI in `server/src/main/resources/application.properties` or via environment variables.
3. Optionally set `API_BASE_URL` for the client if the API is not running on port 8080.
4. Run the backend.
5. Run the client.

## Runtime Flow

### Authentication flow

1. The login page posts credentials to `/api/users/login`.
2. The signup flow posts to `/api/users/signup`.
3. On success, the returned user object is stored in `localStorage` through `AuthContext`.
4. `ClientLayout` redirects unauthenticated users to `/login` unless they are on a public route.

### Project flow

1. New users are redirected to `/setup-project` after signup.
2. The onboarding screen posts a project to `/api/projects`.
3. The Projects page lists all projects where the current user is owner or member.
4. Selecting a project stores it in `selectedProject` and opens the board view.

### Board and issue flow

1. The kanban board fetches issues for the selected project from `/api/issues/project/{projectId}`.
2. Issues are grouped by status columns.
3. Dragging a card between columns sends a `PUT` to `/api/issues/{id}`.
4. Clicking an issue opens the issue modal, where comments can be appended.

### Backlog flow

1. The backlog page fetches issues and sprint data for the active project.
2. Issues without a sprint are displayed in the backlog section.
3. Creating a backlog item posts a new issue with `sprintId: null` from the client side.

## API Endpoints

### Root and health

- `GET /` - returns `Server is Running`.
- `GET /health` - pings MongoDB and returns the connection status.

### Users

- `POST /api/users/signup` - create a user with BCrypt-hashed password.
- `POST /api/users/login` - authenticate with email and password.
- `GET /api/users/{id}` - fetch a user by Mongo ObjectId.
- `PUT /api/users/{id}` - update profile fields such as name, group, and avatar.

### Projects

- `POST /api/projects` - create a project.
- `GET /api/projects` - list all projects.
- `GET /api/projects/{id}` - return a project plus owner and member records.
- `PUT /api/projects/{id}` - update project name, description, and member IDs.
- `DELETE /api/projects/{id}` - delete a project.

### Issues

- `POST /api/issues` - create an issue.
- `GET /api/issues/project/{projectId}` - list issues for a project.
- `GET /api/issues/{id}` - fetch a single issue.
- `PUT /api/issues/{id}` - update issue fields and comments.
- `DELETE /api/issues/{id}` - delete an issue.

### Sprints

- `POST /api/sprints` - create a sprint with status set to `PLANNED`.
- `GET /api/sprints/project/{projectId}` - list sprints for a project.
- `PUT /api/sprints/{id}/start` - mark a sprint `ACTIVE` and set its start date.
- `PUT /api/sprints/{id}/complete` - mark a sprint `COMPLETED` and set its end date.
- `PUT /api/sprints/{id}` - update sprint details.
- `DELETE /api/sprints/{id}` - delete a sprint.
- `PUT /api/sprints/{sprintId}/issues/{issueId}` - current implementation updates the issue record for sprint assignment, but the issue model does not yet store a dedicated sprint field.

## Data Models

### User

Stored in MongoDB collection `users`.

- `id` - Mongo ObjectId string representation.
- `name`
- `email`
- `password`
- `role`
- `group`
- `avatar`
- `createdAt`

### Project

Stored in collection `projects`.

- `id`
- `name`
- `key`
- `ownerId`
- `memberIds`
- `description`
- `createdAt`

### Issue

Stored in collection `issues`.

- `id`
- `key`
- `title`
- `description`
- `type`
- `status`
- `priority`
- `projectId`
- `reporterId`
- `assigneeId`
- `order`
- `comments`
- `createdAt`
- `updatedAt`

### Sprint

Stored in collection `sprints`.

- `id`
- `name`
- `projectId`
- `startDate`
- `endDate`
- `status`
- `goal`

## Implementation Notes

- The frontend auth layer is client-side only. There is no JWT or server-side session yet.
- The code uses `localStorage` to restore the user and selected project after refresh.
- The board uses optimistic UI updates while the issue update request is in flight.
- The issue modal stores comments as plain strings in an array.
- The team page adds members by creating a user, then updating the project member list.
- The profile page is currently read-only presentation UI; the save button is present but not wired to a backend update.
- The backlog page currently treats issues with no sprint as backlog items.
- Some screens are still presentation-first and will need additional backend wiring if you want full editing flows.

## File-By-File Documentation

### Client root and configuration

- [client/package.json](client/package.json) - declares the Next.js app scripts and frontend dependencies such as React, Next.js, Axios, shadcn-compatible primitives, and DnD Kit.
- [client/next.config.ts](client/next.config.ts) - exposes `API_BASE_URL` to the browser bundle through Next.js env configuration.
- [client/tsconfig.json](client/tsconfig.json) - TypeScript configuration with the `@/*` path alias mapped to the client root.
- [client/components.json](client/components.json) - shadcn/ui configuration that defines the Tailwind CSS entry file, icon library, and import aliases.
- [client/app/globals.css](client/app/globals.css) - global Tailwind v4 theme tokens, color variables, border defaults, and base body styles.
- [client/lib/utils.ts](client/lib/utils.ts) - defines `cn`, the class-name helper used across the shared UI primitives.

### Client app routes

- [client/app/layout.tsx](client/app/layout.tsx) - root layout that loads Geist fonts, sets metadata, wraps the app in `AuthProvider`, and applies `ClientLayout`.
- [client/app/page.tsx](client/app/page.tsx) - dashboard entry page showing the current kanban board, project breadcrumb, and board-level action buttons.
- [client/app/login/page.tsx](client/app/login/page.tsx) - combined login and signup screen; posts to the user API and stores the returned user in auth context.
- [client/app/setup-project/page.tsx](client/app/setup-project/page.tsx) - onboarding page that prompts a new user to create their first project.
- [client/app/create-project/page.tsx](client/app/create-project/page.tsx) - project creation form used from the sidebar and project pages.
- [client/app/projects/page.tsx](client/app/projects/page.tsx) - project overview cards that show project metadata and issue counts.
- [client/app/backlog/page.tsx](client/app/backlog/page.tsx) - backlog view that lists unassigned sprint issues and provides quick issue creation.
- [client/app/team/page.tsx](client/app/team/page.tsx) - team management page for listing members, filtering by group, adding members, and removing members from a project.
- [client/app/profile/page.tsx](client/app/profile/page.tsx) - profile and account summary page showing user details and a presentation-only settings form.

### Client shared components

- [client/components/ClientLayout.tsx](client/components/ClientLayout.tsx) - route guard and shell layout that redirects unauthenticated users and renders the sidebar for protected pages.
- [client/components/Sidebar.tsx](client/components/Sidebar.tsx) - main navigation shell; loads user projects, shows project selection, opens issue creation, and handles logout.
- [client/components/KanbanBoard.tsx](client/components/KanbanBoard.tsx) - fetches issues for the selected project, groups them into status columns, and manages drag-and-drop reordering and updates.
- [client/components/KanbanColumn.tsx](client/components/KanbanColumn.tsx) - renders a single kanban column and marks it as a droppable zone.
- [client/components/KanbanCard.tsx](client/components/KanbanCard.tsx) - renders individual issue cards, loads assignee data, and supports sortable drag state.
- [client/components/IssueModel.tsx](client/components/IssueModel.tsx) - issue detail dialog with description, assignee display, and comment creation.
- [client/components/CreateIssuemodel.tsx](client/components/CreateIssuemodel.tsx) - issue creation dialog that posts new issues into the selected project.

### Client auth and API helpers

- [client/lib/AuthContext.tsx](client/lib/AuthContext.tsx) - stores the current user and selected project, hydrates state from `localStorage`, and exposes `login`, `logout`, and project selection helpers.
- [client/lib/Axiosinstance.ts](client/lib/Axiosinstance.ts) - shared Axios client with a configurable base URL and JSON headers.

### Client UI primitives

- [client/components/ui/button.tsx](client/components/ui/button.tsx) - button primitive with variants and sizes used throughout the app.
- [client/components/ui/card.tsx](client/components/ui/card.tsx) - card layout primitives for forms and summaries.
- [client/components/ui/dialog.tsx](client/components/ui/dialog.tsx) - Radix dialog wrapper used by issue and creation modals.
- [client/components/ui/input.tsx](client/components/ui/input.tsx) - styled input primitive.
- [client/components/ui/textarea.tsx](client/components/ui/textarea.tsx) - styled textarea primitive.
- [client/components/ui/avatar.tsx](client/components/ui/avatar.tsx) - avatar primitive with image, fallback, badge, and group helpers.
- [client/components/ui/badge.tsx](client/components/ui/badge.tsx) - badge primitive used for statuses, roles, and labels.
- [client/components/ui/table.tsx](client/components/ui/table.tsx) - table primitives used on the Team page.
- [client/components/ui/label.tsx](client/components/ui/label.tsx) - form label primitive.

### Server root and configuration

- [server/pom.xml](server/pom.xml) - Maven build file that declares Spring Boot, MongoDB, MVC, and security crypto dependencies.
- [server/src/main/resources/application.properties](server/src/main/resources/application.properties) - application name and MongoDB URI configuration placeholder.
- [server/src/main/java/com/example/jira/JiraApplication.java](server/src/main/java/com/example/jira/JiraApplication.java) - Spring Boot application entry point.
- [server/src/test/java/com/example/jira/JiraApplicationTests.java](server/src/test/java/com/example/jira/JiraApplicationTests.java) - minimal Spring context smoke test.

### Server configuration

- [server/src/main/java/com/example/jira/config/SecurityConfig.java](server/src/main/java/com/example/jira/config/SecurityConfig.java) - registers a BCrypt password encoder bean for signup and login flows.

### Server controllers

- [server/src/main/java/com/example/jira/controller/rootcontroller.java](server/src/main/java/com/example/jira/controller/rootcontroller.java) - root endpoint that confirms the server is running.
- [server/src/main/java/com/example/jira/controller/Healthcontoller.java](server/src/main/java/com/example/jira/controller/Healthcontoller.java) - MongoDB health check endpoint that pings the database through `MongoTemplate`.
- [server/src/main/java/com/example/jira/controller/Usercontroller.java](server/src/main/java/com/example/jira/controller/Usercontroller.java) - user signup, login, profile fetch, and profile edit endpoints.
- [server/src/main/java/com/example/jira/controller/Projectcontroller.java](server/src/main/java/com/example/jira/controller/Projectcontroller.java) - project CRUD endpoints plus enriched project lookup with owner and member details.
- [server/src/main/java/com/example/jira/controller/IssueController.java](server/src/main/java/com/example/jira/controller/IssueController.java) - issue CRUD endpoints and project-scoped issue listing.
- [server/src/main/java/com/example/jira/controller/SprintController.java](server/src/main/java/com/example/jira/controller/SprintController.java) - sprint CRUD endpoints, status transitions, and issue-to-sprint assignment route.

### Server models

- [server/src/main/java/com/example/jira/model/User.java](server/src/main/java/com/example/jira/model/User.java) - MongoDB document for user identity, credentials, role, group, avatar, and creation time.
- [server/src/main/java/com/example/jira/model/Project.java](server/src/main/java/com/example/jira/model/Project.java) - MongoDB document for project identity, owner, member IDs, description, and creation time.
- [server/src/main/java/com/example/jira/model/Issue.java](server/src/main/java/com/example/jira/model/Issue.java) - MongoDB document for issue metadata, status, priority, assignee, comments, and timestamps.
- [server/src/main/java/com/example/jira/model/Sprint.java](server/src/main/java/com/example/jira/model/Sprint.java) - MongoDB document for sprint metadata, timeline, status, goal, and project ownership.

### Server repositories

- [server/src/main/java/com/example/jira/repository/UserRepository.java](server/src/main/java/com/example/jira/repository/UserRepository.java) - user persistence interface with lookups by email and batches of IDs.
- [server/src/main/java/com/example/jira/repository/Projectrepository.java](server/src/main/java/com/example/jira/repository/Projectrepository.java) - project persistence interface.
- [server/src/main/java/com/example/jira/repository/IssueRepository.java](server/src/main/java/com/example/jira/repository/IssueRepository.java) - issue persistence interface with a helper query for project-scoped issues.
- [server/src/main/java/com/example/jira/repository/SprintRepository.java](server/src/main/java/com/example/jira/repository/SprintRepository.java) - sprint persistence interface with a helper query for project-scoped sprints.

