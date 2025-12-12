# Deployment Guide

## Prerequisites

- Node.js 20+
- PostgreSQL database
- Redis instance
- Gemini API key
- Stripe account (for payments)
- SendGrid account (for emails)

## Environment Setup

### Frontend Environment Variables

Create `.env.production`:
```env
VITE_API_URL=https://api.yourdomain.com/api
VITE_SENTRY_DSN=https://...@sentry.io/...
VITE_GA_MEASUREMENT_ID=G-XXXXXXXXXX
VITE_MIXPANEL_TOKEN=your-token
```

### Backend Environment Variables

Create `.env.production`:
```env
NODE_ENV=production
PORT=5000
DATABASE_URL=postgresql://user:pass@host:5432/db
REDIS_URL=redis://host:6379
JWT_SECRET=your-super-secret-key
STRIPE_SECRET_KEY=sk_live_...
SENDGRID_API_KEY=SG...
GEMINI_API_KEY=your-key
```

## Deployment Options

### Option 1: Vercel (Frontend) + Railway (Backend)

#### Frontend (Vercel)

1. Install Vercel CLI:
```bash
npm i -g vercel
```

2. Deploy:
```bash
vercel --prod
```

3. Set environment variables in Vercel dashboard

#### Backend (Railway)

1. Install Railway CLI:
```bash
npm i -g @railway/cli
```

2. Login and initialize:
```bash
railway login
railway init
```

3. Add PostgreSQL and Redis:
```bash
railway add --plugin postgresql
railway add --plugin redis
```

4. Deploy:
```bash
cd backend
railway up
```

### Option 2: Docker + DigitalOcean

1. Build Docker image:
```bash
docker build -t mikeaiforge:latest .
```

2. Push to registry:
```bash
docker tag mikeaiforge:latest registry.digitalocean.com/your-registry/mikeaiforge:latest
docker push registry.digitalocean.com/your-registry/mikeaiforge:latest
```

3. Deploy to DigitalOcean App Platform or Droplet

### Option 3: AWS (Full Stack)

#### Frontend (S3 + CloudFront)

1. Build:
```bash
npm run build
```

2. Upload to S3:
```bash
aws s3 sync dist/ s3://your-bucket-name
```

3. Configure CloudFront distribution

#### Backend (ECS or EC2)

1. Create ECR repository
2. Build and push Docker image
3. Create ECS task definition
4. Deploy to ECS cluster

## Database Migration

### Production Migration

```bash
cd backend
npx prisma migrate deploy
```

### Seed Production Data

```bash
cd backend
npm run seed
```

## Post-Deployment Checklist

- [ ] Verify all environment variables are set
- [ ] Run database migrations
- [ ] Test authentication flow
- [ ] Test payment integration
- [ ] Verify email sending
- [ ] Check error tracking (Sentry)
- [ ] Verify analytics tracking
- [ ] Test API endpoints
- [ ] Check SSL certificate
- [ ] Configure DNS
- [ ] Set up monitoring
- [ ] Configure backups

## Monitoring

### Health Checks

- Frontend: `https://yourdomain.com`
- Backend: `https://api.yourdomain.com/health`

### Logging

- Backend logs: Check your hosting platform's logs
- Frontend errors: Sentry dashboard
- Analytics: Google Analytics / Mixpanel

## Rollback Procedure

### Vercel
```bash
vercel rollback
```

### Railway
```bash
railway rollback
```

### Docker
```bash
docker pull mikeaiforge:previous-tag
docker-compose up -d
```

## Backup Strategy

### Database Backups

1. Automated daily backups (configure in hosting platform)
2. Manual backup before major updates:
```bash
pg_dump -h host -U user -d database > backup.sql
```

### File Backups

- User uploads: Store in S3 or similar
- Configure lifecycle policies for retention

## Scaling

### Horizontal Scaling

- Add more backend instances
- Use load balancer (AWS ALB, Nginx)
- Configure Redis for session sharing

### Database Scaling

- Enable read replicas
- Implement connection pooling
- Consider database sharding for large scale

## Security

- [ ] Enable HTTPS only
- [ ] Configure CORS properly
- [ ] Set secure headers (Helmet.js)
- [ ] Enable rate limiting
- [ ] Regular security audits
- [ ] Keep dependencies updated
- [ ] Implement WAF (Web Application Firewall)

## Support

For deployment issues, contact: devops@mikesaiforge.com