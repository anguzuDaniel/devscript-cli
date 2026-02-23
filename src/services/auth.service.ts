import { OAuth2Client } from 'google-auth-library';
import http from 'http';
import url from 'url';
import Conf from 'conf';
import path from 'path';
import fs from 'fs';
import chalk from 'chalk';

interface AuthConfig {
  activeProvider: string;
  googleClientId?: string;
  googleClientSecret?: string;
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
  
  private get CLIENT_ID() {
    return process.env.GOOGLE_CLIENT_ID || this.config.get('googleClientId') || '';
  }
  
  private get CLIENT_SECRET() {
    return process.env.GOOGLE_CLIENT_SECRET || this.config.get('googleClientSecret') || '';
  }
  
  private readonly REDIRECT_URI = 'http://localhost:3000/oauth2callback';

  constructor() {
    // FORCE LOCAL STORAGE: Ensure the .devscript folder exists in the current project root
    const localDir = path.join(process.cwd(), '.devscript');
    if (!fs.existsSync(localDir)) {
      fs.mkdirSync(localDir, { recursive: true });
    }

    this.config = new Conf<AuthConfig>({
      projectName: 'devscript',
      cwd: localDir, // Use project-local folder
      configName: 'config',
      encryptionKey: 'devscript-local-project-key-v2', // Project-specific encryption
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

  /**
   * TIERED LOGIC:
   * 1. Check process.env.GEMINI_API_KEY (priority)
   * 2. Check project-local ./.devscript/config.json
   */
  public getApiKey(provider: string): string | undefined {
    if (provider === 'gemini' && process.env.GEMINI_API_KEY) {
      return process.env.GEMINI_API_KEY;
    }
    return this.config.get('providers')[provider]?.apiKey;
  }

  public setGoogleCredentials(clientId: string, clientSecret: string): void {
    this.config.set('googleClientId', clientId);
    this.config.set('googleClientSecret', clientSecret);
    this.oauth2Client = new OAuth2Client(clientId, clientSecret, this.REDIRECT_URI);
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
      console.error(chalk.red('❌ Missing Google Credentials. Set them with: devscript config set-google-creds <id> <secret>'));
      return;
    }

    const authorizeUrl = this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: ['https://www.googleapis.com/auth/generative-language'],
      prompt: 'consent'
    });

    console.log(chalk.cyan('◈ Opening browser for Google login...'));
    console.log(chalk.dim(`Link: ${authorizeUrl}`));

    const server = http.createServer(async (req, res) => {
      try {
        if (req.url?.includes('/oauth2callback')) {
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

            console.log(chalk.green('✔ Successfully logged in with Google (Tokens saved locally).'));
          }
        }
      } catch (e) {
        console.error(chalk.red('❌ Authentication failed:'), e);
        res.end('Authentication failed.');
        server.close();
      }
    }).listen(3000);
  }
}
