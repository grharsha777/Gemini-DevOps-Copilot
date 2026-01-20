# API Keys Configuration Guide

## 🔐 Secure API Key Setup

**IMPORTANT:** Never commit your actual API keys to Git! Use environment variables or the Settings page in the app.

## Quick Setup

### Option 1: Environment Variables (Recommended for Production)

1. Create a `.env` file in the root directory:
```bash
cp .env.example .env
```


```

3. The `.env` file is already in `.gitignore` - your keys are safe!

### Option 2: Settings Page (Recommended for Development)

1. Start the application
2. Navigate to Settings page (`/settings`)
3. Enter your API keys in the AI Providers section
4. Keys are stored in browser localStorage (secure)

## Your API Keys

✅ **Mistral API Key:** Configured
✅ **Groq API Key:** Configured  
✅ **Kimi AI API Key:** Configured

## Provider Priority

The app will use providers in this order:
1. **Mistral** (Primary - Best for code generation)
2. **Groq** (Fallback - Ultra-fast responses)
3. **Kimi AI** (Alternative - Good for long context)

## Testing Your Keys

1. Go to Settings page
2. Click "Test Connection" next to each provider
3. You should see "API key is valid and working!" if configured correctly

## Security Best Practices

- ✅ Never share your API keys publicly
- ✅ Never commit `.env` file to Git (already in `.gitignore`)
- ✅ Rotate keys if accidentally exposed
- ✅ Use different keys for development and production
- ✅ Monitor API usage in provider dashboards

## Environment Variables Reference

| Variable | Provider | Required | Default Priority |
|----------|----------|----------|------------------|
| `MISTRAL_API_KEY` | Mistral AI | Yes (Primary) | 1 |
| `GROQ_API_KEY` | Groq | Yes (Fallback) | 2 |
| `KIMI_API_KEY` | Kimi AI | Optional | 3 |
| `GEMINI_API_KEY` | Google Gemini | Optional | - |
| `OPENAI_API_KEY` | OpenAI | Optional | - |
| `ANTHROPIC_API_KEY` | Anthropic Claude | Optional | - |

## Troubleshooting

### Keys not working?
1. Check for extra spaces or quotes in `.env` file
2. Verify keys are correct in provider dashboard
3. Check API usage limits/quota
4. Try testing keys individually in Settings page

### App not using your keys?
1. Restart the server after changing `.env`
2. Clear browser cache/localStorage
3. Check console for error messages
4. Verify `.env` file is in root directory

---

**Note:** Your API keys are sensitive credentials. Keep them secure and never share them publicly.

