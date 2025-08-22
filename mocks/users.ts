import { User } from '@/types';

export const mockUsers: User[] = [
  {
    id: '1',
    name: 'Emma',
    age: 24,
    gender: 'girl',
    bio: 'Adventure seeker | Coffee enthusiast | Dog lover 🐕 | Always up for spontaneous road trips',
    photos: [
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=800',
      'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=800',
      'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=800',
    ],
    interests: ['Travel', 'Photography', 'Yoga', 'Coffee', 'Dogs'],
    location: {
      city: 'San Francisco',
      distance: 2,
    },
    verified: true,
  },
  {
    id: '2',
    name: 'Sophia',
    age: 26,
    gender: 'girl',
    bio: 'Foodie | Wine lover | Exploring the city one restaurant at a time 🍷',
    photos: [
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800',
      'https://images.unsplash.com/photo-1517365830460-955ce3ccd263?w=800',
    ],
    interests: ['Food', 'Wine', 'Travel', 'Art', 'Music'],
    location: {
      city: 'San Francisco',
      distance: 5,
    },
  },
  {
    id: '3',
    name: 'Olivia',
    age: 23,
    gender: 'girl',
    bio: 'Fitness enthusiast | Beach lover | Living my best life 🏖️',
    photos: [
      'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=800',
      'https://images.unsplash.com/photo-1464863979621-258859e62245?w=800',
    ],
    interests: ['Fitness', 'Beach', 'Hiking', 'Wellness', 'Meditation'],
    location: {
      city: 'Oakland',
      distance: 8,
    },
    verified: true,
  },
  {
    id: '4',
    name: 'Isabella',
    age: 28,
    gender: 'girl',
    bio: 'Artist | Creative soul | Gallery hopping on weekends 🎨',
    photos: [
      'https://images.unsplash.com/photo-1502823403499-6ccfcf4fb453?w=800',
      'https://images.unsplash.com/photo-1519699047748-de8e457a634e?w=800',
    ],
    interests: ['Art', 'Museums', 'Photography', 'Design', 'Fashion'],
    location: {
      city: 'Berkeley',
      distance: 10,
    },
  },
  {
    id: '5',
    name: 'Ava',
    age: 25,
    gender: 'girl',
    bio: 'Tech enthusiast | Startup life | Coffee-powered coder ☕',
    photos: [
      'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=800',
      'https://images.unsplash.com/photo-1450297350677-623de575f31c?w=800',
    ],
    interests: ['Technology', 'Startups', 'Coffee', 'Reading', 'Podcasts'],
    location: {
      city: 'Palo Alto',
      distance: 15,
    },
    verified: true,
  },
  {
    id: '6',
    name: 'Liam',
    age: 27,
    gender: 'boy',
    bio: 'Runner | Product designer | Loves ramen and jazz',
    photos: [
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=800',
      'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=800',
    ],
    interests: ['Design', 'Running', 'Music'],
    location: { city: 'San Jose', distance: 18 },
    verified: true,
  },
  {
    id: '7',
    name: 'Noah',
    age: 29,
    gender: 'boy',
    bio: 'Engineer | Gamer | Cinema fanatic',
    photos: [
      'https://images.unsplash.com/photo-1547425260-76bcadfb4f2c?w=800',
    ],
    interests: ['Tech', 'Gaming', 'Movies'],
    location: { city: 'San Francisco', distance: 7 },
  },
];