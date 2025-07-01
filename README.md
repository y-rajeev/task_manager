# Task Manager

A modern, full-stack task management app built with React (Vite) for the frontend and Supabase for authentication and database. (No backend folder or FastAPI code is present yet.)

## Features
- User authentication (Supabase Auth)
- Project and task management
- Assign tasks to users
- Due dates, priorities, and completion tracking
- Responsive, modern UI with sidebar navigation
- Dashboard with today's and overdue tasks
- Modal forms for add/edit
- Supabase integration for real-time data

## Tech Stack
- **Frontend:** React (Vite), CSS
- **Backend:** Supabase (hosted, no custom backend code)

## Folder Structure
```
to-do/
  frontend/   # React app (main UI)
```

## Getting Started

### 1. Clone the repository
```sh
git clone <your-github-repo-url>
cd to-do
```

### 2. Frontend Setup
```sh
cd frontend
npm install
```

#### Create a `.env` file in `frontend/`:
```
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

#### Start the dev server:
```sh
npm run dev
```

## Deployment

### Frontend (Vercel/Netlify)
- Set the project root to `frontend/`.
- Build command: `npm run build`
- Output directory: `dist`
- Add environment variables in the host dashboard.

## Environment Variables
- **Never commit your `.env` file.**
- Add `.env` and `.env.*` to `.gitignore`.

## License
MIT
