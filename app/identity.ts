export interface UserProfile {
    id: string;
    username: string;
}

export const getProfile = (): UserProfile | null => {
    if (typeof window === 'undefined') return null; // Prevent Next.js SSR errors
    const data = localStorage.getItem('durak_profile');
    return data ? JSON.parse(data) : null;
};

export const saveProfile = (username: string): UserProfile => {
    const profile: UserProfile = {
        // Generate a random UUID, or fallback to a random string if crypto isn't available
        id: typeof crypto !== 'undefined' && crypto.randomUUID
            ? crypto.randomUUID()
            : Math.random().toString(36).substring(2, 15),
        username
    };
    localStorage.setItem('durak_profile', JSON.stringify(profile));
    return profile;
};

export const logout = () => {
    localStorage.removeItem('durak_profile');
};