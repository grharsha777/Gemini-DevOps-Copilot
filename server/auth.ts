import passport from 'passport';
import { Strategy as GitHubStrategy } from 'passport-github2';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { storage } from './storage';

const APP_BASE = process.env.APP_BASE_URL || `http://localhost:${process.env.PORT || 5000}`;

export function configurePassport() {
  // Serialize user id into session
  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: string, done) => {
    try {
      const u = await storage.getUser(id);
      done(null, u || null);
    } catch (err) {
      done(err as any, null);
    }
  });

  // GitHub strategy
  const githubId = process.env.GITHUB_CLIENT_ID;
  const githubSecret = process.env.GITHUB_CLIENT_SECRET;
  const githubCallback = process.env.GITHUB_CALLBACK_URL || `${APP_BASE}/auth/github/callback`;

  if (githubId && githubSecret) {
    passport.use(new GitHubStrategy({
      clientID: githubId,
      clientSecret: githubSecret,
      callbackURL: githubCallback,
      scope: ['user:email'],
    }, async (accessToken, refreshToken, profile, done) => {
      try {
        const username = profile.username || profile.displayName || profile.id;
        const email = profile.emails && profile.emails[0] ? profile.emails[0].value : undefined;
        let user = await storage.getUserByUsername(username);
        if (!user) {
          user = await storage.createUser({ username, email });
        }
        // Attach provider metadata in session object
        (user as any).provider = 'github';
        (user as any).providerId = profile.id;
        done(null, user);
      } catch (err) {
        done(err as any);
      }
    }));
  }

  // Google strategy
  const googleId = process.env.GOOGLE_CLIENT_ID;
  const googleSecret = process.env.GOOGLE_CLIENT_SECRET;
  const googleCallback = process.env.GOOGLE_CALLBACK_URL || `${APP_BASE}/auth/google/callback`;

  if (googleId && googleSecret) {
    passport.use(new GoogleStrategy({
      clientID: googleId,
      clientSecret: googleSecret,
      callbackURL: googleCallback,
    }, async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails && profile.emails[0] ? profile.emails[0].value : undefined;
        const username = profile.displayName || (email ? email.split('@')[0] : profile.id);
        let user = await storage.getUserByUsername(username as string);
        if (!user) {
          user = await storage.createUser({ username: username as string, email });
        }
        (user as any).provider = 'google';
        (user as any).providerId = profile.id;
        done(null, user);
      } catch (err) {
        done(err as any);
      }
    }));
  }
}
