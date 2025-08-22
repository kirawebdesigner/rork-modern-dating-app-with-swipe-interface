import { Match } from '@/types';
import { mockUsers } from './users';

export const mockMatches: Match[] = [
  {
    id: 'm1',
    user: mockUsers[0],
    matchedAt: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
    hasNewMessage: true,
    lastMessage: {
      id: 'msg1',
      senderId: '1',
      receiverId: 'current',
      text: 'Hey! How are you doing?',
      timestamp: new Date(Date.now() - 1000 * 60 * 5),
      read: false,
    },
  },
  {
    id: 'm2',
    user: mockUsers[1],
    matchedAt: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
    hasNewMessage: false,
    lastMessage: {
      id: 'msg2',
      senderId: 'current',
      receiverId: '2',
      text: 'Would love to grab coffee sometime!',
      timestamp: new Date(Date.now() - 1000 * 60 * 60),
      read: true,
    },
  },
  {
    id: 'm3',
    user: mockUsers[2],
    matchedAt: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
    hasNewMessage: true,
    lastMessage: {
      id: 'msg3',
      senderId: '3',
      receiverId: 'current',
      text: 'That sounds amazing! When are you free?',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 3),
      read: false,
    },
  },
];