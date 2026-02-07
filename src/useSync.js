import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from './supabaseClient';

// Debounce helper — waits for user to stop making changes before saving
function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for login/logout
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email, password) => {
    const { error } = await supabase.auth.signUp({ email, password });
    return { error };
  };

  const signIn = async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return { user, loading, signUp, signIn, signOut };
}

export function useSyncedData(user) {
  const [events, setEvents] = useState([]);
  const [habits, setHabits] = useState([]);
  const [habitLog, setHabitLog] = useState({});
  const [completedBlocks, setCompletedBlocks] = useState({});
  const [tasks, setTasks] = useState([]);
  const [profile, setProfile] = useState({});
  const [loaded, setLoaded] = useState(false);
  const saveTimer = useRef(null);

  // Load all data from Supabase on login
  useEffect(() => {
    if (!user) { setLoaded(false); return; }

    async function load() {
      const { data, error } = await supabase
        .from('user_data')
        .select('data_key, data_value')
        .eq('user_id', user.id);

      if (error) {
        console.error('Load error:', error);
        setLoaded(true);
        return;
      }

      const map = {};
      (data || []).forEach(row => { map[row.data_key] = row.data_value; });

      setEvents(map.events || []);
      setHabits(map.habits || []);
      setHabitLog(map.habit_log || {});
      setCompletedBlocks(map.completed_blocks || {});
      setTasks(map.tasks || []);
      setProfile(map.profile || {});
      setLoaded(true);
    }

    load();
  }, [user]);

  // Save to Supabase whenever data changes (debounced)
  const saveToCloud = useCallback(async (key, value) => {
    if (!user) return;
    const { error } = await supabase
      .from('user_data')
      .upsert({
        user_id: user.id,
        data_key: key,
        data_value: value,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,data_key' });

    if (error) console.error(`Save error (${key}):`, error);
  }, [user]);

  // Debounced saves — waits 800ms after last change before writing to cloud
  const debouncedEvents = useDebounce(events, 800);
  const debouncedHabits = useDebounce(habits, 800);
  const debouncedHabitLog = useDebounce(habitLog, 800);
  const debouncedCompleted = useDebounce(completedBlocks, 800);
  const debouncedTasks = useDebounce(tasks, 800);
  const debouncedProfile = useDebounce(profile, 800);

  useEffect(() => { if (loaded) saveToCloud('events', debouncedEvents); }, [debouncedEvents, loaded]);
  useEffect(() => { if (loaded) saveToCloud('habits', debouncedHabits); }, [debouncedHabits, loaded]);
  useEffect(() => { if (loaded) saveToCloud('habit_log', debouncedHabitLog); }, [debouncedHabitLog, loaded]);
  useEffect(() => { if (loaded) saveToCloud('completed_blocks', debouncedCompleted); }, [debouncedCompleted, loaded]);
  useEffect(() => { if (loaded) saveToCloud('tasks', debouncedTasks); }, [debouncedTasks, loaded]);
  useEffect(() => { if (loaded) saveToCloud('profile', debouncedProfile); }, [debouncedProfile, loaded]);

  return {
    events, setEvents,
    habits, setHabits,
    habitLog, setHabitLog,
    completedBlocks, setCompletedBlocks,
    tasks, setTasks,
    profile, setProfile,
    loaded,
  };
}
