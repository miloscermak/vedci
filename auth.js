/**
 * Správa autentizace pomocí Supabase Auth
 * Poskytuje bezpečné přihlašování admin uživatelů
 */

class AuthManager {
    constructor() {
        this.supabaseClient = null;
        this.currentUser = null;
        this.onAuthChangeCallbacks = [];
    }

    /**
     * Inicializace auth manageru s Supabase klientem
     */
    init(supabaseClient) {
        this.supabaseClient = supabaseClient;

        // Nastavení listeneru pro změny auth stavu
        this.supabaseClient.auth.onAuthStateChange((event, session) => {
            console.log('Auth state changed:', event);
            this.currentUser = session?.user || null;

            // Volání callbacků
            this.onAuthChangeCallbacks.forEach(callback => {
                callback(event, session);
            });
        });

        // Kontrola současné session
        this.checkSession();
    }

    /**
     * Kontrola existující session při načtení
     */
    async checkSession() {
        try {
            const { data: { session }, error } = await this.supabaseClient.auth.getSession();

            if (error) {
                console.error('Error checking session:', error);
                return null;
            }

            this.currentUser = session?.user || null;
            return session;
        } catch (error) {
            console.error('Error in checkSession:', error);
            return null;
        }
    }

    /**
     * Přihlášení uživatele pomocí emailu a hesla
     */
    async signIn(email, password) {
        try {
            const { data, error } = await this.supabaseClient.auth.signInWithPassword({
                email: email,
                password: password
            });

            if (error) {
                console.error('Sign in error:', error);
                throw error;
            }

            this.currentUser = data.user;
            console.log('Successfully signed in:', data.user.email);

            return {
                success: true,
                user: data.user,
                session: data.session
            };
        } catch (error) {
            console.error('Error in signIn:', error);
            return {
                success: false,
                error: error.message || 'Chyba při přihlašování'
            };
        }
    }

    /**
     * Odhlášení uživatele
     */
    async signOut() {
        try {
            const { error } = await this.supabaseClient.auth.signOut();

            if (error) {
                console.error('Sign out error:', error);
                throw error;
            }

            this.currentUser = null;
            console.log('Successfully signed out');

            return { success: true };
        } catch (error) {
            console.error('Error in signOut:', error);
            return {
                success: false,
                error: error.message || 'Chyba při odhlašování'
            };
        }
    }

    /**
     * Kontrola, zda je uživatel přihlášený
     */
    isAuthenticated() {
        return this.currentUser !== null;
    }

    /**
     * Získání současného uživatele
     */
    getCurrentUser() {
        return this.currentUser;
    }

    /**
     * Získání access tokenu pro API volání
     */
    async getAccessToken() {
        try {
            const { data: { session }, error } = await this.supabaseClient.auth.getSession();

            if (error || !session) {
                return null;
            }

            return session.access_token;
        } catch (error) {
            console.error('Error getting access token:', error);
            return null;
        }
    }

    /**
     * Registrace callbacku pro změny auth stavu
     */
    onAuthChange(callback) {
        this.onAuthChangeCallbacks.push(callback);
    }

    /**
     * Vytvoření nového admin uživatele (pouze pro setup)
     * POZNÁMKA: V produkci by toto mělo být voláno pouze z bezpečného prostředí
     */
    async createAdminUser(email, password) {
        try {
            const { data, error } = await this.supabaseClient.auth.signUp({
                email: email,
                password: password,
                options: {
                    data: {
                        role: 'admin'
                    }
                }
            });

            if (error) {
                console.error('Create admin user error:', error);
                throw error;
            }

            console.log('Admin user created:', data.user.email);

            return {
                success: true,
                user: data.user
            };
        } catch (error) {
            console.error('Error in createAdminUser:', error);
            return {
                success: false,
                error: error.message || 'Chyba při vytváření admin účtu'
            };
        }
    }

    /**
     * Reset hesla - odeslání reset emailu
     */
    async resetPassword(email) {
        try {
            const { error } = await this.supabaseClient.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/admin.html`
            });

            if (error) {
                console.error('Reset password error:', error);
                throw error;
            }

            return {
                success: true,
                message: 'Email pro reset hesla byl odeslán'
            };
        } catch (error) {
            console.error('Error in resetPassword:', error);
            return {
                success: false,
                error: error.message || 'Chyba při odesílání reset emailu'
            };
        }
    }

    /**
     * Aktualizace hesla (po resetu nebo změně)
     */
    async updatePassword(newPassword) {
        try {
            const { error } = await this.supabaseClient.auth.updateUser({
                password: newPassword
            });

            if (error) {
                console.error('Update password error:', error);
                throw error;
            }

            return {
                success: true,
                message: 'Heslo bylo úspěšně změněno'
            };
        } catch (error) {
            console.error('Error in updatePassword:', error);
            return {
                success: false,
                error: error.message || 'Chyba při změně hesla'
            };
        }
    }
}

// Vytvoření globální instance
window.authManager = new AuthManager();
