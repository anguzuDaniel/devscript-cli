
import { OAuth2Client } from 'google-auth-library';
import http from 'http';
import url from 'url';
import Conf from 'conf';
import os from 'os';
import path from 'path';
import chalk from 'chalk';

interface AuthConfig {
  activeProvider: string;
  providers: {
    [key: string]: {
      apiKey?: string;
      tokens?: any;
    };
  };
}

export class AuthService {
  private config: Conf<AuthConfig>;
  private oauth2Client: OAuth2Client;
  private readonly CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
  private readonly CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
  private readonly REDIRECT_URI = 'http://localhost:3000/oauth2callback';

  constructor() {
    this.config = new Conf<AuthConfig>({
      projectName: 'devscript',
      cwd: path.join(os.homedir(), '.devscript'),
      configName: 'config',
      // Simple encryption for the sake of the requirement. 
      // In production, this key should be more securely handled.
      encryptionKey: 'devscript-secret-key-1234567890',
      defaults: {
        activeProvider: 'gemini',
        providers: {
          gemini: {},
          openai: {},
          ollama: {}
        }
      }
    });

    this.oauth2Client = new OAuth2Client(
      this.CLIENT_ID,
      this.CLIENT_SECRET,
      this.REDIRECT_URI
    );
  }

  public getActiveProvider(): string {
    return this.config.get('activeProvider');
  }

  public setActiveProvider(provider: string): void {
    this.config.set('activeProvider', provider);
  }

  public setApiKey(provider: string, apiKey: string): void {
    const providers = this.config.get('providers');
    providers[provider] = { ...providers[provider], apiKey };
    this.config.set('providers', providers);
  }

  public getApiKey(provider: string): string | undefined {
    return this.config.get('providers')[provider]?.apiKey;
  }

  public getTokens(provider: string): any {
    return this.config.get('providers')[provider]?.tokens;
  }

  public async getAuthenticatedClient(): Promise<OAuth2Client> {
    const tokens = this.getTokens('gemini');
    if (!tokens) {
      throw new Error('Not logged in with Google. Run "devscript login" first.');
    }
    this.oauth2Client.setCredentials(tokens);

    // Handle token expiration/refresh
    this.oauth2Client.on('tokens', (newTokens) => {
      if (newTokens.refresh_token) {
        const providers = this.config.get('providers');
        if (providers.gemini) {
          providers.gemini.tokens = { ...providers.gemini.tokens, ...newTokens };
          this.config.set('providers', providers);
        }
      }
    });

    return this.oauth2Client;
  }

  public async loginWithGoogle(): Promise<void> {
    if (!this.CLIENT_ID || !this.CLIENT_SECRET) {
      console.error(chalk.red('❌ Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET in environment.'));
      return;
    }

    const authorizeUrl = this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: ['https://www.googleapis.com/auth/cloud-platform', 'https://www.googleapis.com/auth/generative-language'],
      prompt: 'consent'
    });

    console.log(chalk.cyan('◈ Opening browser for Google login...'));
    console.log(chalk.dim(`Link: ${authorizeUrl}`));

    // Start local loopback server
    const server = http.createServer(async (req, res) => {
      try {
        if (req.url?.indexOf('/oauth2callback') && req.url?.indexOf('/oauth2callback') > -1) {
          const qs = new url.URL(req.url, 'http://localhost:3000').searchParams;
          const code = qs.get('code');

          if (code) {
            res.end('Authentication successful! You can close this tab.');
            server.close();

            const { tokens } = await this.oauth2Client.getToken(code);
            const providers = this.config.get('providers');
            if (providers.gemini) {
              providers.gemini.tokens = tokens;
              this.config.set('providers', providers);
            }

            console.log(chalk.green('✔ Successfully logged in with Google.'));
          }
        }
      } catch (e) {
        console.error(chalk.red('❌ Authentication failed:'), e);
        res.end('Authentication failed.');
        server.close();
      }
    }).listen(3000);

    // In a real CLI, we would use 'open' package to open the browser.
    // For now, the user can click the link.
  }
}
