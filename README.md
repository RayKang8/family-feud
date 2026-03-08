# Family Feud Labs

Family Feud Labs is a web-based Family Feud style game builder and player that allows users to create custom question boards and play them in a live game format.

This project was originally built for the KCF (Korean Christian Fellowship) end-of-year banquet as an interactive group activity, but it can be used by anyone to create and host their own Family Feud style games.

The goal of the project was to create a simple platform where organizers can quickly build questions and run a fun live game without needing PowerPoint or manual score tracking.

Live Demo
[https://family-feud-labs.vercel.app](https://family-feud-labs.vercel.app)

## Features

Create custom games with multiple questions and answers
Play games in a live Family Feud style board
Reveal answers and point values during gameplay
User authentication with Supabase
Personal dashboard to manage your games
Simple interface designed for hosting events or group activities

## Why I Built This

I built this project for the KCF end-of-year banquet where we wanted to host a Family Feud style game for a large group.

Instead of manually preparing slides or revealing answers one by one, this app allows organizers to build the game board quickly, control answer reveals live during the event, and reuse games later.

It also served as a full-stack project to practice building and deploying a real web application using modern tools.

## Tech Stack

Frontend
Next.js (React)
TypeScript
TailwindCSS

Backend and Database
Supabase (PostgreSQL + Authentication)

Deployment
Vercel

Version Control
Git and GitHub

## How It Works

Users create an account or log in.
From the dashboard they can create a new game.
Games contain questions with multiple answers and point values.
When a game is played, answers are revealed one by one on the board.
The interface is optimized for displaying on a screen during live gameplay.

## Running Locally

Clone the repository

git clone [https://github.com/RayKang8/family-feud.git](https://github.com/RayKang8/family-feud.git)
cd family-feud

Install dependencies

npm install

Run the development server

npm run dev

Open in your browser

[http://localhost:3000](http://localhost:3000)

## Environment Variables

Create a .env.local file in the root of the project with the following values:

NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

These values can be found in your Supabase project settings.

## Future Improvements

Add team score tracking
Add buzzer functionality for players
Add animations for answer reveals
Improve mobile layout
Allow public sharing of games

## Author

Ray Kang
Software Engineering Student – Western University

GitHub
[https://github.com/RayKang8](https://github.com/RayKang8)
