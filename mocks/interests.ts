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
    name: 'Sports',
    interests: [
      { name: 'Soccer', icon: '⚽' },
      { name: 'Basketball', icon: '🏀' },
      { name: 'Tennis', icon: '🎾' },
      { name: 'Swimming', icon: '🏊' },
      { name: 'Yoga', icon: '🧘' },
      { name: 'Gym', icon: '💪' },
    ],
  },
  {
    name: 'Creative',
    interests: [
      { name: 'Photography', icon: '📷' },
      { name: 'Art', icon: '🎨' },
      { name: 'Music', icon: '🎵' },
      { name: 'Writing', icon: '✍️' },
      { name: 'Dancing', icon: '💃' },
    ],
  },
  {
    name: 'Going Out',
    interests: [
      { name: 'Travel', icon: '✈️' },
      { name: 'Foodie', icon: '🍔' },
      { name: 'Coffee', icon: '☕' },
      { name: 'Movies', icon: '🎬' },
      { name: 'Shopping', icon: '🛍️' },
    ],
  },
];
