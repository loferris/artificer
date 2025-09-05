# Deployment Guide

This guide covers deploying the chat application in both demo and production modes.

## 🎯 Demo Deployment (Recommended for Showcase)

Perfect for creating screen recordings, showcasing features, or testing without API costs.

### Quick Deploy to Vercel

1. **Push to GitHub:**
   ```bash
   git add .
   git commit -m "Ready for demo deployment"
   git push origin main
   ```

2. **Deploy to Vercel:**
   - Connect your GitHub repo to Vercel
   - Vercel will automatically detect the Next.js framework
   - The `vercel.json` configuration will force demo mode

3. **Demo Mode Features:**
   - ✅ **Mock AI Assistant**: No API keys needed, intelligent contextual responses
   - ✅ **Smart Responses**: Contextual demo responses with realistic conversation flow
   - ✅ **Full Functionality**: All features work perfectly including export and error handling
   - ✅ **No Costs**: Zero API usage charges with realistic cost simulation
   - ✅ **Sample Data**: Pre-loaded demo conversations showcasing features
   - ✅ **Error Simulation**: Demonstrates error handling and recovery mechanisms
   - ✅ **State Management**: Full Zustand store functionality with DevTools

### Demo Mode Configuration

The app automatically detects demo mode through:
- `DEMO_MODE=true` in Vercel environment
- `VERCEL_ENV=preview` for preview deployments
- Mock assistant provides intelligent responses

## 🚀 Production Deployment

For real usage with actual AI models.

### Environment Variables

Create these in your Vercel dashboard:

```bash
# Required for production
OPENROUTER_API_KEY=sk-or-v1-your-actual-api-key
DEMO_MODE=false
NODE_ENV=production

# Optional configuration
SITE_NAME=your-app-name
SITE_URL=https://your-domain.com
DATABASE_URL=your-production-database-url
SESSION_SECRET=your-random-secret-key
```

### Production Setup Steps

1. **Get OpenRouter API Key:**
   - Visit [OpenRouter.ai](https://openrouter.ai/keys)
   - Create account and generate API key
   - Copy the key (starts with `sk-or-v1-`)

2. **Update Vercel Environment:**
   - Go to your Vercel project dashboard
   - Navigate to Settings → Environment Variables
   - Add the variables above

3. **Deploy:**
   ```bash
   git push origin main
   ```

## 🔄 Switching Between Modes

### Demo → Production
1. Update Vercel environment variables
2. Set `DEMO_MODE=false`
3. Add `OPENROUTER_API_KEY`
4. Redeploy

### Production → Demo
1. Update Vercel environment variables
2. Set `DEMO_MODE=true`
3. Remove or comment out `OPENROUTER_API_KEY`
4. Redeploy

## 📊 Demo Mode Features

### Smart Mock Assistant
The demo assistant provides contextual responses with realistic behavior:
- **Welcome messages**: Explains demo features and capabilities
- **Export questions**: Describes export functionality across all formats
- **Technical queries**: Explains app architecture including Zustand and ErrorBoundary
- **Error handling**: Demonstrates retry mechanisms and graceful degradation
- **General chat**: Engaging conversation flow with realistic response times
- **State management**: Shows proper loading states and UI updates

### Sample Conversations
Pre-loaded demo conversations showcase:
- Feature explanations
- Technical capabilities
- UI/UX demonstrations
- Export functionality

### Cost Tracking
- Shows realistic cost estimates
- Demonstrates usage monitoring
- No actual API charges

## 🛠️ Local Development

### Demo Mode
```bash
# Set demo mode
echo "DEMO_MODE=true" > .env.local
npm run dev
```

### Production Mode
```bash
# Set up environment
cp env.example .env.local
# Edit .env.local with your API key
npm run dev
```

## 📱 Screen Recording Tips

For creating demo videos:

1. **Use Demo Mode**: Perfect for screen recordings
2. **Sample Conversations**: Pre-loaded content to showcase
3. **Export Feature**: Great for demonstrating functionality
4. **Responsive Design**: Test on different screen sizes
5. **Error Handling**: Show graceful error states

## 🔧 Troubleshooting

### Common Issues

**Demo mode not working:**
- Check `DEMO_MODE=true` in environment
- Verify `vercel.json` configuration
- Clear browser cache

**Production API errors:**
- Verify API key format (`sk-or-v1-...`)
- Check OpenRouter account status
- Review rate limits

**Database issues:**
- SQLite works for demo
- Use proper database for production
- Check `DATABASE_URL` format

## 📈 Performance

### Demo Mode
- Fast responses (no API calls)
- Minimal resource usage
- Perfect for showcasing

### Production Mode
- Real AI responses
- API rate limiting
- Cost monitoring
- Scalable architecture

## 🔒 Security

### Demo Mode
- No sensitive data
- Safe for public sharing
- No API key exposure

### Production Mode
- Secure API key storage
- Rate limiting enabled
- Input validation
- Session management

---

**Ready to deploy?** Start with demo mode for showcasing, then switch to production when ready for real usage! 🚀