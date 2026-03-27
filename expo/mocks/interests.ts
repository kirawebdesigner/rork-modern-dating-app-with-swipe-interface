export interface Interest {
  name: string;
  icon: string;
}

export interface InterestCategory {
  name: string;
  interests: Interest[];
}

export const categorizedInterests: InterestCategory[] = [
  {
    name: 'Sport',
    interests: [
      { name: 'Basketball', icon: '🏀' },
      { name: 'Boxing', icon: '🥊' },
      { name: 'Cycling', icon: '🚴' },
      { name: 'Dancing', icon: '💃' },
      { name: 'Gym', icon: '🏋️' },
      { name: 'Running', icon: '🏃' },
      { name: 'Soccer', icon: '⚽' },
      { name: 'Swimming', icon: '🏊' },
      { name: 'Tennis', icon: '🎾' },
      { name: 'Yoga', icon: '🧘' },
    ],
  },
  {
    name: 'Food & Drink',
    interests: [
      { name: 'Baking', icon: '🧁' },
      { name: 'Coffee', icon: '☕' },
      { name: 'Cooking', icon: '🧑‍🍳' },
      { name: 'Ethiopian food', icon: '🍽️' },
      { name: 'Healthy eating', icon: '🥗' },
      { name: 'Pizza', icon: '🍕' },
      { name: 'Tea enthusiast', icon: '🍵' },
      { name: 'Vegan', icon: '🌱' },
    ],
  },
  {
    name: 'Arts & Culture',
    interests: [
      { name: 'Art galleries', icon: '🖼️' },
      { name: 'Design', icon: '🎨' },
      { name: 'Fashion', icon: '👗' },
      { name: 'Film & Cinema', icon: '🎬' },
      { name: 'Photography', icon: '📷' },
      { name: 'Reading', icon: '📚' },
      { name: 'Travel', icon: '✈️' },
      { name: 'Music', icon: '🎵' },
    ],
  },
  {
    name: 'Technology',
    interests: [
      { name: 'AI & Machine Learning', icon: '🤖' },
      { name: 'Coding', icon: '👨‍💻' },
      { name: 'Gaming', icon: '🎮' },
      { name: 'Gadgets', icon: '📱' },
      { name: 'Social media', icon: '📱' },
      { name: 'Tech', icon: '🖥️' },
    ],
  },
  {
    name: 'Outdoors',
    interests: [
      { name: 'Camping', icon: '⛺' },
      { name: 'Hiking', icon: '🥾' },
      { name: 'Nature walks', icon: '🌳' },
      { name: 'Stargazing', icon: '⭐' },
    ],
  },
  {
    name: 'Community',
    interests: [
      { name: 'Family time', icon: '👨‍👩‍👧‍👦' },
      { name: 'Volunteering', icon: '🤝' },
      { name: 'Spending time with friends', icon: '👯' },
    ],
  },
  {
    name: 'Health & Wellness',
    interests: [
      { name: 'Meditation', icon: '🧘' },
      { name: 'Mental health', icon: '🧠' },
      { name: 'Nutrition', icon: '🥗' },
      { name: 'Spirituality', icon: '✨' },
    ],
  },
  {
    name: 'Professional',
    interests: [
      { name: 'Business', icon: '💼' },
      { name: 'Entrepreneurship', icon: '🚀' },
      { name: 'Finance', icon: '💰' },
      { name: 'Networking', icon: '🤝' },
    ],
  },
];
