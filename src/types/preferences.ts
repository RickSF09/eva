export interface ElderPreferences {
  favorites: {
    places: string[] | null;
    tv_shows: string[] | null;
    meals: string[] | null;
    hobbies: string[] | null;
    topics: string[] | null;
  };
  dislikes: {
    topics: string[] | null;
    foods: string[] | null;
    activities: string[] | null;
  };
  struggles: {
    mobility: string | null;
    memory: string | null;
    health: string | null;
    daily_living: string | null;
    technology: string | null;
  };
  helpful_things: {
    reminders: string[] | null;
    support_needed: string[] | null;
    communication_style: string | null;
  };
  social: {
    family_nearby: boolean | null;
    friends_contact_frequency: string | null;
    feels_lonely: boolean | null;
    social_activities: string[] | null;
  };
  background: {
    former_occupation: string | null;
    life_highlights: string[] | null;
    important_memories: string | null;
  };
  summary: string;
}

