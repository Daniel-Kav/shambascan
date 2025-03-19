import axios from 'axios';

const API_URL = 'http://localhost:8000/api';  // Update this with your Django backend URL

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    username: string;
  };
  access: string;
  refresh: string;
}

export interface Session {
  access_token: string;
  refresh_token: string;
  user: {
    id: string;
    email: string;
    username: string;
  };
}

class AuthService {
  private session: Session | null = null;

  constructor() {
    // Load session from localStorage
    const savedSession = localStorage.getItem('session');
    if (savedSession) {
      this.session = JSON.parse(savedSession);
      axios.defaults.headers.common['Authorization'] = `Bearer ${this.session.access_token}`;
    }
  }

  async signUp(email: string, password: string): Promise<AuthResponse> {
    const response = await axios.post(`${API_URL}/register/`, {
      email,
      password,
      username: email.split('@')[0],  // Using part before @ as username
    });
    this.handleAuthResponse(response.data);
    return response.data;
  }

  async signIn(email: string, password: string): Promise<AuthResponse> {
    const response = await axios.post(`${API_URL}/token/`, {
      username: email,  // Django JWT expects username field
      password,
    });
    this.handleAuthResponse(response.data);
    return response.data;
  }

  async signOut(): Promise<void> {
    this.session = null;
    localStorage.removeItem('session');
    delete axios.defaults.headers.common['Authorization'];
  }

  async refreshToken(): Promise<void> {
    if (!this.session?.refresh_token) return;

    try {
      const response = await axios.post(`${API_URL}/token/refresh/`, {
        refresh: this.session.refresh_token,
      });
      
      this.session = {
        ...this.session,
        access_token: response.data.access,
      };
      
      localStorage.setItem('session', JSON.stringify(this.session));
      axios.defaults.headers.common['Authorization'] = `Bearer ${this.session.access_token}`;
    } catch (error) {
      this.signOut();
      throw error;
    }
  }

  private handleAuthResponse(data: AuthResponse) {
    this.session = {
      access_token: data.access,
      refresh_token: data.refresh,
      user: data.user,
    };
    localStorage.setItem('session', JSON.stringify(this.session));
    axios.defaults.headers.common['Authorization'] = `Bearer ${this.session.access_token}`;
  }

  getSession(): Session | null {
    return this.session;
  }

  getUser() {
    return this.session?.user ?? null;
  }
}

export const auth = new AuthService();
