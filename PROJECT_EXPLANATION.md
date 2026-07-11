Jira Clone - Project Implementation & SMTP Configuration Details

1. Project Overview
===================
This is a full-stack project management application (Jira Clone) designed to facilitate sprint planning, task tracking, team management, and log work hours. 

The application architecture is split into a Next.js frontend and a Spring Boot backend, communicating over REST APIs and WebSockets for real-time collaborative updates.

2. Technology Stack & Implementation Details
===========================================

Frontend (Client):
------------------
- Framework: Next.js (App Router) & React
- Styling: Tailwind CSS & Vanilla CSS
- Components: shadcn/ui library & Radix primitives
- Navigation & Shell: Fully responsive sidebar layout. On mobile screen sizes (below 768px), the main sidebar collapses into a slide-over drawer overlay (toggled via a top-bar hamburger button) with a semi-transparent backdrop overlay.
- Views & Features:
  - Kanban Board: Custom columns (To Do, In Progress, Done) supporting drag-and-drop task movements using @dnd-kit/core. Includes a responsive filter bar.
  - Backlog & Sprints: Responsive layout wrapper that stacks Sprints and Backlog vertically on mobile/tablets, and side-by-side on desktop.
  - Time Tracking: Work logs table with horizontal scrolling wrappers and metric overview cards.
  - Team Management: Project members list with group filtering and responsive table formatting.
  - Issue Detail Modal: Complete task breakdown displaying description, subtasks, dependencies, activity logs, image/document attachments, and comments.

Backend (Server):
-----------------
- Framework: Spring Boot (Java 17)
- Database: MongoDB Atlas (integrated via Spring Data MongoDB)
- WebSocket: Spring WebSockets for pushing real-time events (e.g., status changes, comment notifications) to active clients.
- Environment: Local loader class (JiraApplication.java) that parses `.env` parameters into system properties during application bootstrap.
- Error Handling: Production-ready standard controllers with customized validation and error state bodies.

3. SMTP Configuration & Server Delivery Behavior
===============================================
The application features transactional email notifications for task allocations, email verification links, and profile changes.

Configuration:
--------------
- Host: smtp-relay.brevo.com
- Port: 587 (STARTTLS)
- Mail Sender: spring-boot-starter-mail

Outbound Delivery Mechanics:
-----------------------------
- Local Development Server:
  SMTP mail delivery functions correctly on local machines. Outbound connection tests to smtp-relay.brevo.com over port 587 complete successfully, and test emails are successfully relayed to recipient inboxes.

- Render Hosting Environment:
  When the backend is deployed to production on Render, outbound SMTP calls fail. This is because Render blocks outgoing SMTP traffic on ports 25, 465, and 587 by default on their web services to prevent spam abuse. 

- Recommendation for Production:
  To send emails from the production service hosted on Render, the backend should be modified to use a HTTP Web API client (such as Brevo's REST API or SendGrid's Web API over port 443 HTTPS) rather than standard SMTP.
