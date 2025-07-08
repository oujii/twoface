# Netlify Deployment Guide for TwoFace

This guide provides step-by-step instructions for deploying your TwoFace application to Netlify.

## Prerequisites

- A Netlify account (free tier is sufficient)
- Your code pushed to a Git repository (GitHub, GitLab, or Bitbucket)
- Supabase project with the required database tables

## Environment Variables

You need to set the following environment variables in Netlify's dashboard:

### Required Environment Variables

1. **NEXT_PUBLIC_SUPABASE_URL**
   - Value: Your Supabase project URL (e.g., `https://your-project.supabase.co`)
   - Found in: Supabase Dashboard → Settings → API

2. **NEXT_PUBLIC_SUPABASE_ANON_KEY**
   - Value: Your Supabase anon/public key
   - Found in: Supabase Dashboard → Settings → API

## Netlify Configuration

The repository includes a `netlify.toml` file with the following settings:

- **Build Command**: `npm run build`
- **Publish Directory**: `out`
- **Node.js Version**: 18 (specified in `.nvmrc`)

## Deployment Steps

### 1. Connect Repository to Netlify

1. Log in to your Netlify dashboard
2. Click "New site from Git"
3. Choose your Git provider and repository
4. Select the branch to deploy (usually `main` or `master`)

### 2. Configure Build Settings

Netlify should automatically detect the settings from `netlify.toml`, but verify:

- **Build command**: `npm run build`
- **Publish directory**: `out`
- **Base directory**: (leave empty)

### 3. Set Environment Variables

1. Go to Site settings → Environment variables
2. Add the required environment variables listed above
3. Click "Save"

### 4. Deploy

1. Click "Deploy site"
2. Wait for the build to complete
3. Your site will be available at the provided Netlify URL

## Build Process

The application uses Next.js static export mode, which:
- Generates static HTML files for all pages
- Optimizes assets and images
- Creates a fully static site that works on any CDN

## Troubleshooting

### Build Failures

If the build fails, check:
1. Environment variables are correctly set
2. All dependencies are listed in `package.json`
3. No server-side features are being used (API routes, etc.)

### Runtime Issues

If the app loads but doesn't work:
1. Check browser console for errors
2. Verify environment variables are accessible
3. Ensure Supabase connection is working

## Additional Notes

- The app is configured as a Single Page Application (SPA)
- All routes are handled client-side
- Images are unoptimized for static export compatibility
- The site will automatically rebuild when you push to the connected branch
