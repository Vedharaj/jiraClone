# Production Deployment & Keep-Alive Guide

This guide explains how to deploy the split-stack Jira Clone application (Next.js frontend & Spring Boot backend) to **Render** and configure a keep-alive system to prevent Render's free tier services from spinning down.

---

## 1. Render Deployment Steps

Render offers free hosting for web apps and web services. Follow these steps to deploy both the Spring Boot backend and Next.js frontend:

### Backend Deployment (Spring Boot Web Service)
1. Sign in to [Render](https://dashboard.render.com/).
2. Click **New** > **Web Service**.
3. Connect your GitHub repository containing the project.
4. Configure the Web Service settings:
   - **Name**: `jira-clone-backend`
   - **Environment**: `Docker` or `Java`
     > [!TIP]
     > If deploying as Java:
     > - **Build Command**: `./mvnw clean package -DskipTests`
     > - **Start Command**: `java -jar target/jira-0.0.1-SNAPSHOT.jar`
   - **Region**: Choose the region closest to your users.
   - **Branch**: `main`
5. Click **Advanced** to add environment variables (see [Environment Variables](#2-environment-variables) section below).
6. Click **Create Web Service**.

### Frontend Deployment (Render Web Service or Static Site)
1. Click **New** > **Web Service** or **Static Site**.
2. Connect your GitHub repository.
3. Configure the settings:
   - **Name**: `jira-clone-frontend`
   - **Root Directory**: `client`
   - **Build Command**: `npm run build`
   - **Start Command**: `npm run start`
4. Add the required environment variables.
5. Click **Create Web Service**.

### Frontend Deployment (Vercel - Recommended)
Vercel is the creator and optimizer of Next.js, making it the ideal hosting platform for the frontend.
1. Sign in to your [Vercel Dashboard](https://vercel.com).
2. Click **Add New...** > **Project**.
3. Connect your Git provider and import your repository.
4. Configure the Next.js deployment settings:
   - **Framework Preset**: `Next.js`
   - **Root Directory**: Choose `client`
   - **Build Command**: `npm run build` (or `next build`)
   - **Output Directory**: Next.js default (leave default)
   - **Install Command**: `npm install` (or `yarn install` / `pnpm install` / `bun install` based on your preference)
5. Expand the **Environment Variables** section and configure:
   - **Key**: `API_BASE_URL`
   - **Value**: The public URL of your deployed Render backend API (e.g. `https://jira-clone-backend.onrender.com`)
6. Click **Deploy**.


---

## 2. Environment Variables

### Backend Configuration
Configure the following environment variables in your Render Web Service dashboard under the **Environment** tab:

| Variable Name | Description | Example / Recommended Value |
| :--- | :--- | :--- |
| `PORT` | Dynamic port bound by Render (Spring Boot auto-binds via `server.port=${PORT:8080}`) | `8080` (automatically set by Render) |
| `SPRING_DATA_MONGODB_URI` | MongoDB Atlas / database connection URI | `mongodb+srv://<username>:<password>@cluster0.mongodb.net/jiraClone?retryWrites=true&w=majority` |
| `SPRING_DATA_MONGODB_DATABASE` | MongoDB database name | `jiraClone` |
| `SPRING_MAIL_USERNAME` | SMTP mail sender username (used for notifications) | `your-email@gmail.com` |
| `SPRING_MAIL_PASSWORD` | SMTP app password | `xxxx xxxx xxxx xxxx` |

### Frontend Configuration
Configure the following environment variables in your frontend deployment:

| Variable Name | Description | Example Value |
| :--- | :--- | :--- |
| `API_BASE_URL` | The public URL of your deployed Render backend | `https://jira-clone-backend.onrender.com` |

---

## 3. MongoDB Setup

1. Create a free database cluster on [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
2. In the MongoDB Atlas console, navigate to **Database Access** and create a user with read/write permissions for your database.
3. Navigate to **Network Access** and add a firewall rule. To allow Render to connect, add `0.0.0.0/0` (allow access from anywhere) since Render dynamic IPs change frequently.
4. Copy the connection string (Connection Method -> Drivers -> Java) and replace the credentials to form your `SPRING_DATA_MONGODB_URI`.

---

## 4. Health Endpoint Usage

The application features a lightweight, high-performance `/health` check endpoint.

* **URL**: `https://your-backend-app.onrender.com/health`
* **Method**: `GET`
* **Authentication**: None (Publicly accessible)
* **Response Headers**: `Content-Type: application/json`

### Responses

#### Healthy State (HTTP 200 OK)
Returned when the server is running and the database connection is functional.
```json
{
  "status": "UP",
  "timestamp": "2026-06-13T16:26:10.123Z",
  "service": "jira-clone"
}
```

#### Unhealthy State (HTTP 503 Service Unavailable)
Returned if MongoDB is down or unreachable.
```json
{
  "status": "DOWN",
  "timestamp": "2026-06-13T16:28:40.456Z",
  "service": "jira-clone"
}
```

---

## 5. Keep-Alive / Cron-Job Setup

Render's free tier spins down Web Services after 15 minutes of inactivity. To prevent the service from sleeping, set up an external ping every **10 minutes**.

### Option A: cron-job.org (Recommended - Free & Easy)
1. Register/Login at [cron-job.org](https://cron-job.org/).
2. Go to the **Cronjobs** tab and click **Create Cronjob**.
3. Configure the job details:
   - **Title**: `Jira Backend Keep-Alive`
   - **Address (URL)**: `https://your-backend-app.onrender.com/health`
   - **Request Method**: `GET`
   - **Schedule**: Everyday, every 10 minutes (`*/10 * * * *`).
4. Click **Create**.

### Option B: UptimeRobot (Free uptime monitor & keep-alive)
1. Sign up/Login at [UptimeRobot](https://uptimerobot.com/).
2. Click **Add New Monitor**.
3. Choose monitor details:
   - **Monitor Type**: `HTTP(s)`
   - **Friendly Name**: `Jira Clone Backend`
   - **URL (or IP)**: `https://your-backend-app.onrender.com/health`
   - **Monitoring Interval**: `Every 10 minutes`
4. Click **Create Monitor**.

### Option C: EasyCron
1. Register/Login at [EasyCron](https://www.easycron.com/).
2. Click **Create Cron Job**.
3. Fill in settings:
   - **URL to call**: `https://your-backend-app.onrender.com/health`
   - **Interval**: Every `10 minutes` (`*/10 * * * *`)
   - **Method**: `GET`
4. Click **Create Cron Job**.

---

## 6. Post-Deployment Verification Checklist

After deploying both services and setting up the keepalive:

- [ ] **Verify Server Start**: Check Render backend logs to see if the startup banner is printed:
  ```
  Jira Clone Application is UP and running!
  ```
- [ ] **Check /health Response**: Visit `https://your-backend-app.onrender.com/health` in your browser and confirm it returns HTTP 200 with status `"UP"`.
- [ ] **Verify DB Access**: Sign up or log in via the frontend and create a new project. Verify that the operations are saved in the database.
- [ ] **Verify Keep-Alive Logs**: Check the backend logs after 10-20 minutes. You should see repeated entries:
  ```
  Received health check ping request.
  Health check ping passed: MongoDB connection is healthy.
  ```
